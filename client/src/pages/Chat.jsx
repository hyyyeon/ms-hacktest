// src/pages/Chat.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/Chat.css";
import PolicyCard from "../components/PolicyCard";
import { normalizeMessages } from "../utils";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

/* 추천 질문 */
const defaultSuggestions = [
  "청년 월세 지원 신청 조건은 무엇인가요?",
  "소상공인 재난지원금은 언제까지 신청할 수 있나요?",
  "기초연금 수급 자격을 알려주세요",
];
const inlineSuggestions = ["지원 대상이 궁금해요", "신청 방법 알려주세요", "필요 서류는 무엇인가요?"];

/* --- 질문 분류 함수 --- */
function isPolicyQuestion(text) {
  const applyWords = /(지원|신청|대상|조건|방법|자격|금액|기간)/;
  const explainWords = /(차이|비교|이유|목적|원리|배경)/;

  if (applyWords.test(text)) return true;      // 정책 질문 → 카드
  if (explainWords.test(text)) return false;   // 설명/비교 → 텍스트
  return false; // 나머지는 텍스트(설명/잡담)
}

/* 공식 도메인 우선 */
const OFFICIAL_DOMAINS = [
  "gov.kr","www.gov.kr","bokjiro.go.kr","www.bokjiro.go.kr",
  "moel.go.kr","mohw.go.kr","msit.go.kr","korea.kr",
  "seoul.go.kr","housing.seoul.go.kr"
];

/* citations/URL 배열 → sources (공식 우선, 중복/가짜 제거) */
function toSources(input = []) {
  const urls = (Array.isArray(input) ? input : [])
    .map(v => (typeof v === "string" ? v : v?.url))
    .filter(u => typeof u === "string" && /^https?:\/\//i.test(u))
    .map(u => u.replace(/[)\]}.,;]+$/, ""));
  const uniq = Array.from(new Set(urls));

  const arr = uniq.map((url) => {
    try {
      const u = new URL(url);
      return { title: u.hostname, url: u.href };
    } catch {
      return null;
    }
  }).filter(Boolean);

  const isOfficial = (host) =>
    OFFICIAL_DOMAINS.some(d => host === d || host.endsWith("." + d));

  const official = arr.filter(s => isOfficial(s.title));
  const nonOfficial = arr.filter(s => !isOfficial(s.title));

  return [...official, ...nonOfficial].slice(0, 5);
}

/* 날짜 추출 */
function extractDateFromText(t = "") {
  const m = String(t).match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m; // 첫 캡처는 쓰지 않음
  return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

/* 텍스트에서 첫 URL */
function firstUrl(text="") {
  const m = text.match(/https?:\/\/[^\s)>\]]+/);
  if (!m) return "";
  return m[0].replace(/[)\]}.,;]+$/, "");
}

/* 텍스트에서 모든 URL 수집 */
function allUrlsFromText(text = "") {
  const set = new Set();
  const re = /https?:\/\/[^\s)>\]]+/g;
  let m;
  while ((m = re.exec(text))) {
    set.add(m[0].replace(/[)\]}.,;]+$/, ""));
  }
  return Array.from(set);
}

/* 숨은 sources 코드블록에서 URL 배열 추출 */
function extractHiddenSources(text = "") {
  const m = text.match(/```sources\s*([\s\S]*?)```/i);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1]);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/* JSON or 규칙 기반 정책 파서 */
const tryJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };

function extractPolicyFromText(text, citations=[]) {
  if (!text) return null;
  const fence = text.match(/```(?:policy|json)?\s*([\s\S]*?)\s*```/i);
  let raw = fence ? tryJSON(fence[1]) : null;
  if (!raw && text.trim().startsWith("{") && text.trim().endsWith("}")) raw = tryJSON(text);

  if (!raw) {
    const get = (...labels) => {
      for (const L of labels) {
        const re = new RegExp(`${L}\\s*[:：]\\s*(.+)`, "i");
        const m = re.exec(text);
        if (m) return m[1].trim();
      }
      return "";
    };
    const titleLine = text.split("\n").find((ln) => ln.trim().length > 3) || "정책";
    const url = firstUrl(text);
    raw = {
      title: titleLine.replace(/[*#>\-•\s]/g, " ").trim().slice(0, 80),
      target: get("지원 대상","대상"),
      period: get("신청 기간","접수 기간","기간"),
      support: get("지원 내용","지원 금액","내용"),
      method: get("신청 방법","방법"),
      link: url ? { url, title: "" } : null,
    };
  }

  const linkUrlFromRaw = raw.link?.url || raw.url || raw.링크 || "";
  let linkTitleFromRaw = raw.link?.title || raw.링크제목 || "";

  const preferred = toSources(citations).find(s =>
    OFFICIAL_DOMAINS.some(d => s.title === d || s.title.endsWith("." + d))
  );
  const finalLinkUrl = preferred?.url || linkUrlFromRaw ||
    `https://www.gov.kr/portal/service/search?query=${encodeURIComponent(raw.title || "")}`;
  const finalLinkTitle = preferred?.title || linkTitleFromRaw || "정부24 바로가기";

  return {
    title:  raw.title || raw.정책명 || "정책",
    target: raw.target || raw.지원대상 || raw.대상 || "정보 없음",
    period: raw.period || raw.신청기간 || raw.기간 || "정보 없음",
    support: raw.support || raw.지원내용 || raw.내용 || "정보 없음",
    method: raw.method || raw.신청방법 || raw.방법 || "정부24 또는 주민센터 방문",
    link:   { title: finalLinkTitle, url: finalLinkUrl },
    category: raw.category || raw.카테고리 || "",
  };
}

/* reply/정책/본문에서 출처 후보 URL 모으기 */
function collectSourceUrls({ replyText = "", policy }) {
  const urls = new Set();
  extractHiddenSources(replyText).forEach(u => urls.add(u));
  if (policy?.link?.url) urls.add(policy.link.url);
  allUrlsFromText(replyText).forEach(u => urls.add(u));
  return Array.from(urls);
}

/* --- 프롬프트 힌트(단일 정의) --- */
const policyHint =
  "\n\n아래 JSON 포맷으로 정책 요약 1건을 반드시 포함하세요.\n" +
  "- link.url은 반드시 'https://'로 시작하는 절대 URL이어야 합니다.\n" +
  "- 모르면 정부24 검색 URL을 사용하세요.\n" +
  "```policy\n" +
  "{\n" +
  '  "title": "", "target": "", "period": "", "support": "", "method": "",\n' +
  '  "link": {"title":"정부24 바로가기", "url": "https://..."}, "category": ""\n' +
  "}\n" +
  "```";

const explainHint =
  "\n\n아래 질문은 정책 제도/용어 설명입니다.\n" +
  "- 카드 형식 출력 금지\n" +
  "- 자연스러운 문단 설명 (필요시 bullet point)\n" +
"- 출처 링크는 필요하지 않음 (정책카드 질문에만 표시)\n" +
  "- **, __, #, [1] 같은 마크다운/각주 표기 사용 금지\n";

/* --- 텍스트 답변 포맷터: 마크다운/각주 제거 + 리스트/링크 처리 --- */
function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function linkify(html="") {
  // URL을 링크로
  return html.replace(/(https?:\/\/[^\s)>\]]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}
function formatTextReply(text="") {
  // 0) 안전하게 이스케이프
  let t = escapeHtml(text);

  // 1) 각주/인용 번호 제거: [1], [12], [1][3] 등
  t = t.replace(/\[(\d+)\](?=\W|$)/g, "");      // 단일 [n]
  t = t.replace(/(\[(\d+)\]\s*)+/g, "");        // 연속 [n][m]

  // 2) 코드블록/인라인코드 제거(내용만 남김)
  t = t.replace(/```[\s\S]*?```/g, (m)=> escapeHtml(m.replace(/```/g,"")).trim());
  t = t.replace(/`([^`]+)`/g, '$1');

  // 3) 굵게/기울임 마크다운 처리 (**굵게**, *기울임*)
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(?:^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1');

  // 4) 줄 단위 가공: 리스트/문단
  const lines = t.split(/\r?\n/);
  const out = [];
  let inUL = false, inOL = false;

  const openUL = ()=>{ if(!inUL){ out.push("<ul>"); inUL=true; } };
  const closeUL= ()=>{ if(inUL){ out.push("</ul>"); inUL=false; } };
  const openOL = ()=>{ if(!inOL){ out.push("<ol>"); inOL=true; } };
  const closeOL= ()=>{ if(inOL){ out.push("</ol>"); inOL=false; } };

  for (const raw of lines) {
    const ln = raw.trim();

    // 빈 줄: 리스트 닫고 <br/> 구분
    if (!ln) { closeUL(); closeOL(); out.push("<br/>"); continue; }

    // 숫자. 리스트
    if (/^\d+\.\s+/.test(ln)) {
      closeUL(); openOL();
      out.push("<li>" + ln.replace(/^\d+\.\s+/, "") + "</li>");
      continue;
    }
    // 불릿 리스트 (-, *, •)
    if (/^[-*•]\s+/.test(ln)) {
      closeOL(); openUL();
      out.push("<li>" + ln.replace(/^[-*•]\s+/, "") + "</li>");
      continue;
    }

    // 일반 문장
    closeUL(); closeOL();
    out.push("<p>" + ln + "</p>");
  }
  closeUL(); closeOL();

  // 5) 링크 자동 변환
  const html = linkify(out.join("\n"));

  // 6) 과도한 <br/> 정리
  return html.replace(/(?:<br\/>\s*){3,}/g, "<br/><br/>");
}

export default function Chat() {
  const username = (JSON.parse(localStorage.getItem("user") || "null") || {}).username || null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => (s.title || "새 대화").toLowerCase().includes(q));
  }, [sessions, search]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (!drawerOpen) inputRef.current?.focus(); }, [drawerOpen]);

  /* 세션 목록 불러오기: 로그인 → 서버 / 게스트 → localStorage */
  const refreshSessions = useCallback(async () => {
    try {
      if (!username) {
        const local = JSON.parse(localStorage.getItem("chatSessions") || "[]");
        setSessions(Array.isArray(local) ? local : []);
        return;
      }
      const res = await fetch(`${API_BASE}/api/chat/sessions?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("세션 목록 로드 실패:", e);
    }
  }, [username]);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  // 히스토리 로드 + 정책/출처 복원 (로그인) / 게스트는 localStorage
  async function loadMessagesFor(id) {
    try {
      // 게스트: localStorage에서 읽기
      if (!username) {
        const map = JSON.parse(localStorage.getItem("chatMessages") || "{}");
        const list = Array.isArray(map[id]) ? map[id] : [];
        setMessages(list);
        return;
      }

      // 로그인: 서버에서 읽고, PolicyCard/출처 복원
      const res = await fetch(`${API_BASE}/api/chat/messages?sessionId=${id}`);
      const rows = await res.json();

      // 1) 백엔드 원시 레코드 → 정규화 유틸이 기대하는 형태로 1차 매핑
      const pre = rows.map((r) => ({
        role: r.role,                          // 'user' | 'assistant'
        text: r.content ?? "",
        ts: new Date(r.created_at),
        policy: r.policy ?? null,              // (있으면 사용, 보통 null)
        sources: r.citations ? toSources(r.citations) : undefined, // (있으면 변환)
      }));

      // 2) 문자열에서 policy JSON 재추출 + 사용자 템플릿 숨기기 등 정규화
      const normalized = normalizeMessages(pre);

      // 3) 최근대화에선 citations가 없을 수 있으므로, 카드/본문에서 URL들을 추출해 보강
      const final = normalized.map((m) => {
        // 이미 m.sources가 있다면 URL만 뽑아 결합
        const existingUrls = (m.sources || []).map(s => s.url);
        const collected = collectSourceUrls({ replyText: m.text || "", policy: m.policy });

        const merged = toSources([...existingUrls, ...collected]);

        if (m.role === "assistant" && m.policy) {
          return {
            role: "assistant",
            kind: "policy",
            data: m.policy,
            ts: m.ts,
            sources: merged, // ✅ 보강된 참고자료
          };
        }
        return {
          role: m.role,
          content: m.text,
          ts: m.ts,
          sources: merged,
        };
      });

      setMessages(final);
    } catch (e) {
      console.error("메시지 로드 실패:", e);
      setMessages([]);
    }
  }

  // 세션 삭제: 로그인 → 서버 / 게스트 → localStorage
  async function deleteSession(id) {
    try {
      if (!username) {
        const sessions = JSON.parse(localStorage.getItem("chatSessions") || "[]");
        const map = JSON.parse(localStorage.getItem("chatMessages") || "{}");
        const nextSessions = sessions.filter(s => String(s.id) !== String(id));
        delete map[id];
        localStorage.setItem("chatSessions", JSON.stringify(nextSessions));
        localStorage.setItem("chatMessages", JSON.stringify(map));
        setSessions(nextSessions);
        if (id === sessionId) { setSessionId(null); setMessages([]); }
        return;
      }

      await fetch(`${API_BASE}/api/chat/sessions/${id}`, { method: "DELETE" });
      await refreshSessions();
      if (id === sessionId) { setSessionId(null); setMessages([]); }
    } catch (e) { console.error("세션 삭제 실패:", e); }
  }

  /* 즐겨찾기 저장 */
  async function saveBookmarkFromPolicy(p) {
    if (!username) return alert("로그인이 필요합니다.");
    const deadline = extractDateFromText(p.period) || null;

    const body = {
      username,
      title: p.title || "정책",
      category: p.category || "",
      description: `지원대상: ${p.target}\n지원내용: ${p.support}\n신청방법: ${p.method}`,
      source: p.link?.title || "",
      link: p.link?.url || "",
      deadline,
    };

    try {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "저장 실패");
      alert("즐겨찾기에 저장되었습니다!");
    } catch (err) {
      console.error(err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    }
  }

  /* --- 전송 --- */
  async function send(msg) {
    const text = (msg ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text, ts: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const isPolicy = isPolicyQuestion(text);
      const hint = isPolicy ? policyHint : explainHint;
      const full = text + hint;

      // 🔹 비로그인(게스트): localStorage에만 기록
      if (!username) {
        const localId = sessionId || Date.now().toString();
        const now = new Date();
        const nowIso = now.toISOString();
        setSessionId(localId);

        // 임시 안내 응답 (백엔드 호출 없음)
        const aiReply = {
          role: "assistant",
          content:
            "🔎 비로그인(로컬 모드)입니다. 로그인을 하면 채팅 기록이 모든 기기에서 동기화됩니다.\n\n지금은 브라우저에만 임시 저장돼요.",
          ts: now
        };

        const allMsgs = [...(messages || []), { role: "user", content: text, ts: now }, aiReply];

        // 세션 목록 갱신
        const allSessions = JSON.parse(localStorage.getItem("chatSessions") || "[]");
        const idx = allSessions.findIndex(s => String(s.id) === String(localId));
        if (idx === -1) {
          allSessions.push({ id: localId, title: text.slice(0, 20), updated_at: nowIso, created_at: nowIso });
        } else {
          allSessions[idx] = { ...allSessions[idx], title: allSessions[idx].title || text.slice(0, 20), updated_at: nowIso };
        }
        localStorage.setItem("chatSessions", JSON.stringify(allSessions));

        // 메시지 저장
        const map = JSON.parse(localStorage.getItem("chatMessages") || "{}");
        map[localId] = allMsgs;
        localStorage.setItem("chatMessages", JSON.stringify(map));

        setMessages(allMsgs);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sessionId, message: full }),
      });
      const { reply, citations = [], sessionId: sid } = await res.json();

      if (sid && sid !== sessionId) setSessionId(sid);

      const policy = isPolicy ? extractPolicyFromText(reply, citations) : null;
      const combinedSources = toSources([
        ...citations,
        ...collectSourceUrls({ replyText: reply || "", policy }),
      ]);

      if (policy) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", kind: "policy", data: policy, ts: new Date(), sources: combinedSources },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply ?? "(응답 없음)", ts: new Date(), sources: combinedSources },
        ]);
      }

      refreshSessions();
    } catch (err) {
      console.error("❌ Chat API Error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", ts: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing || loading) return;
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-header-left">
          <button className="icon-btn" aria-label="최근 채팅 열기" onClick={() => setDrawerOpen(true)}>☰</button>
          <div>
            <h1 className="chat-title">AI 정책 상담</h1>
            <p className="chat-sub">궁금한 정책에 대해 자연어로 질문해보세요</p>
          </div>
        </div>
      </header>

      <main className="chat-main">
        <section className="chat-card">
          <div className="chat-scroll">
            {messages.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p className="empty-title">안녕하세요! 복지랑 AI입니다.</p>
                <p className="empty-sub">궁금한 정책에 대해 무엇이든 물어보세요.</p>
                <div className="sugg-block">
                  <div className="sugg-title">💡 추천 질문</div>
                  <div className="sugg-grid">
                    {defaultSuggestions.map((q, i) => (
                      <button key={i} className="chip" onClick={() => send(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`chat-item ${m.role === "user" ? "user" : "assistant"}`}>
                  {m.kind === "policy" ? (
                    <div className="bubble">
                      <PolicyCard data={m.data} onBookmark={() => saveBookmarkFromPolicy(m.data)} />
                      {m.sources?.length > 0 && (
                        <div className="sources" style={{ marginTop: 8 }}>
                          <div className="sources-title">참고 자료</div>
                          {m.sources.map((s, idx) => (
                            <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="source-link">↗ {s.title}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`bubble ${m.role === "user" ? "me" : ""}`}>
                      <div
                        className="bubble-text"
                        dangerouslySetInnerHTML={{ __html: formatTextReply(m.content || "") }}
                      />
                      {m.sources?.length > 0 && (
                        <div className="sources">
                          <div className="sources-title">참고 자료</div>
                          {m.sources.map((s, idx) => (
                            <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="source-link">↗ {s.title}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="chat-item assistant">
                <div className="bubble">
                  <span className="dots"><i></i><i></i><i></i></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length > 0 && (
            <div className="sugg-inline">
              {inlineSuggestions.map((q, i) => (
                <button key={i} className="chip small" onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="정책이나 복지 정보에 대해 물어보세요…"
              rows={1}
              className="chat-input"
            />
            <button className="send-btn" disabled={!input.trim() || loading} onClick={() => send()} aria-label="전송">➤</button>
          </div>
        </section>
      </main>

      {/* 좌측 드로어 */}
      <aside className={`chat-drawer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="drawer-header">
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="닫기">✕</button>
          <h2>채팅 기록</h2>
        </div>

        <div className="drawer-body">
          {/* 새 채팅: 게스트일 때 로컬 저장을 지우지는 않고, 새 대화만 시작 */}
          <button
            className="btn-primary"
            onClick={() => {
              setMessages([]);
              setSessionId(null);
              setDrawerOpen(false);
            }}
          >
            ＋ 새 채팅
          </button>

          <div className="search-box"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="채팅 검색…" /></div>
          <div className="drawer-section-label">최근 채팅</div>
          <div className="history-scroll">
            {filtered.map((c) => (
              <div
                key={c.id}
                className={`history-item ${sessionId === c.id ? "active" : ""}`}
                onClick={() => { setSessionId(c.id); setDrawerOpen(false); loadMessagesFor(c.id); }}
              >
                <div className="history-main">
                  <div className="history-title">💬 {c.title || "새 대화"}</div>
                  <div className="history-last">{(() => {
                    const date = new Date(c.updated_at || c.created_at);
                    const now = new Date();
                    const diffH = Math.floor((now - date) / (1000 * 60 * 60));
                    if (diffH < 1) return "방금 전";
                    if (diffH < 24) return `${diffH}시간 전`;
                    if (diffH < 48) return "어제";
                    return `${Math.floor(diffH / 24)}일 전`;
                  })()}</div>
                </div>
                <button
                  className="trash"
                  onClick={(e) => { e.stopPropagation(); deleteSession(c.id); }}
                  aria-label="삭제"
                >🗑️</button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
    </div>
  );
}
