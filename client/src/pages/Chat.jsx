// src/pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/Chat.css";
import PolicyCard from "../components/PolicyCard";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

/* 추천 질문 */
const defaultSuggestions = [
  "청년 월세 지원 신청 조건은 무엇인가요?",
  "소상공인 재난지원금은 언제까지 신청할 수 있나요?",
  "기초연금 수급 자격을 알려주세요",
];
const inlineSuggestions = ["지원 대상이 궁금해요", "신청 방법 알려주세요", "필요 서류는 무엇인가요?"];

/* 공식 도메인 우선 */
const OFFICIAL_DOMAINS = [
  "gov.kr","www.gov.kr","bokjiro.go.kr","www.bokjiro.go.kr","moel.go.kr","mohw.go.kr","msit.go.kr","korea.kr"
];

/* citations → sources (공식 우선) */
function toSources(citations = []) {
  const arr = citations.filter(Boolean).map((url) => {
    try { const u = new URL(url); return { title: u.hostname, url }; }
    catch { return { title: url, url }; }
  });
  const official = arr.filter(s => OFFICIAL_DOMAINS.some(d => s.title.endsWith(d)));
  return (official.length ? official : arr).slice(0, 5);
}

/* 날짜 추출 */
function extractDateFromText(t = "") {
  const m = String(t).match(/(20\d{2})[.\-\/년\s]*(\d{1,2})[.\-\/월\s]*(\d{1,2})/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

/* 텍스트에서 첫 URL */
function firstUrl(text="") {
  const m = text.match(/https?:\/\/[^\s)>\]]+/);
  if (!m) return "";
  return m[0].replace(/[)\]}.,;]+$/, "");
}

/* JSON or 규칙 기반 정책 파서 */
const tryJSON = (s) => { try { return JSON.parse(s); } catch { return null; } };

function extractPolicyFromText(text, citations=[]) {
  if (!text) return null;

  // 1) fenced code block 내 JSON
  const fence = text.match(/```(?:policy|json)?\s*([\s\S]*?)\s*```/i);
  let raw = fence ? tryJSON(fence[1]) : null;
  if (!raw && text.trim().startsWith("{") && text.trim().endsWith("}")) raw = tryJSON(text);

  // 2) 규칙 기반(라벨: 값)
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

  // 3) 정규화 + 빈칸 보정 + 공식 링크 선택
  const linkUrlFromRaw = raw.link?.url || raw.url || raw.링크 || "";
  let linkTitleFromRaw = raw.link?.title || raw.링크제목 || "";

  const preferred = toSources(citations).find(s => OFFICIAL_DOMAINS.some(d => s.title.endsWith(d)));
  const finalLinkUrl = preferred?.url || linkUrlFromRaw || `https://www.gov.kr/portal/service/search?query=${encodeURIComponent(raw.title || "")}`;
  const finalLinkTitle = preferred?.title || linkTitleFromRaw || "정부24 바로가기";

  const data = {
    title:  raw.title || raw.정책명 || "정책",
    target: raw.target || raw.지원대상 || raw.대상 || "정보 없음",
    period: raw.period || raw.신청기간 || raw.기간 || "정보 없음",
    support: raw.support || raw.지원내용 || raw.내용 || "정보 없음",
    method: raw.method || raw.신청방법 || raw.방법 || "정부24 또는 주민센터 방문",
    link:   { title: finalLinkTitle, url: finalLinkUrl },
    category: raw.category || raw.카테고리 || "",
  };
  return data;
}

export default function Chat() {
  const username = (JSON.parse(localStorage.getItem("user") || "null") || {}).username || null;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // {role, content|data, kind?, ts, sources?}
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
  useEffect(() => { refreshSessions(); /* eslint-disable-next-line */ }, []);

  async function refreshSessions() {
    try {
      if (!username) return;
      const res = await fetch(`${API_BASE}/api/chat/sessions?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) { console.error("세션 목록 로드 실패:", e); }
  }
  async function loadMessagesFor(id) {
    try {
      const res = await fetch(`${API_BASE}/api/chat/messages?sessionId=${id}`);
      const rows = await res.json();
      setMessages(rows.map((r) => ({ role: r.role, content: r.content, ts: new Date(r.created_at) })));
    } catch (e) { console.error("메시지 로드 실패:", e); setMessages([]); }
  }
  async function deleteSession(id) {
    try {
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

  /* 전송 */
  async function send(msg) {
    const text = (msg ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text, ts: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      // JSON 카드 강제 + 빈칸 금지 힌트
      const hint =
        "\n\n아래 JSON 포맷으로 정책 요약 1건을 반드시 포함하세요. 비어 있는 값은 '정보 없음'으로 채워주세요.\n" +
        "```policy\n" +
        "{\n" +
        '  "title": "", "target": "", "period": "", "support": "", "method": "",\n' +
        '  "link": {"title":"", "url": ""}, "category": ""\n' +
        "}\n" +
        "```\n";
      const full = text + hint;

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sessionId, message: full }),
      });
      const { reply, citations = [], sessionId: sid } = await res.json();

      if (sid && sid !== sessionId) setSessionId(sid);

      const policy = extractPolicyFromText(reply, citations);
      if (policy) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", kind: "policy", data: policy, ts: new Date(), sources: toSources(citations) },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply ?? "(응답 없음)", ts: new Date(), sources: toSources(citations) },
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
                      <div className="bubble-text">{m.content}</div>
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
          <button className="btn-primary" onClick={() => { setMessages([]); setSessionId(null); setDrawerOpen(false); }}>＋ 새 채팅</button>
          <div className="search-box"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="채팅 검색…" /></div>
          <div className="drawer-section-label">최근 채팅</div>
          <div className="history-scroll">
            {filtered.map((c) => (
              <div key={c.id} className={`history-item ${sessionId === c.id ? "active" : ""}`} onClick={() => { setSessionId(c.id); setDrawerOpen(false); loadMessagesFor(c.id); }}>
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
                <button className="trash" onClick={(e) => { e.stopPropagation(); deleteSession(c.id); }} aria-label="삭제">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
    </div>
  );
}
