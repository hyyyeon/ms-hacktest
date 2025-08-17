// src/pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/Chat.css";

/* 백엔드 기본 주소 */
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

/* ───────── 추천 질문 ───────── */
const defaultSuggestions = [
  "청년 월세 지원 신청 조건은 무엇인가요?",
  "소상공인 재난지원금은 언제까지 신청할 수 있나요?",
  "기초연금 수급 자격을 알려주세요",
];
const inlineSuggestions = ["지원 대상이 궁금해요", "신청 방법 알려주세요", "필요 서류는 무엇인가요?"];

/* citations(URL[]) → sources([{title,url}]) */
function toSources(citations = []) {
  return citations
    .filter(Boolean)
    .map((url) => {
      try {
        const u = new URL(url);
        return { title: u.hostname, url };
      } catch {
        return { title: url, url };
      }
    });
}

/* 칩 버튼 */
function SuggestionChip({ q, onPick }) {
  return (
    <button className="chip" onClick={() => onPick(q)}>
      {q}
    </button>
  );
}

/* 상대시간 */
function formatTime(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now - date) / (1000 * 60 * 60));
  if (diffH < 1) return "방금 전";
  if (diffH < 24) return `${diffH}시간 전`;
  if (diffH < 48) return "어제";
  return `${Math.floor(diffH / 24)}일 전`;
}

export default function Chat() {
  /* 로그인 사용자명 (localStorage에 {username} 저장했다고 가정) */
  const username = (JSON.parse(localStorage.getItem("user") || "null") || {}).username || null;

  /* 상태 */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState([]); // 최근 세션 목록
  const [sessionId, setSessionId] = useState(null); // 현재 세션 ID
  const [messages, setMessages] = useState([]); // 현재 세션 메시지
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  /* refs */
  const endRef = useRef(null);
  const inputRef = useRef(null);

  /* 목록 필터 */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => (s.title || "새 대화").toLowerCase().includes(q));
  }, [sessions, search]);

  /* 스크롤 */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* 포커스 */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!drawerOpen) inputRef.current?.focus();
  }, [drawerOpen]);

  /* 초기: 세션 목록 불러오기 */
  useEffect(() => {
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───────── API 함수들 ───────── */
  async function refreshSessions() {
    try {
      if (!username) return;
      const res = await fetch(`${API_BASE}/api/chat/sessions?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("세션 목록 로드 실패:", e);
    }
  }

  async function loadMessagesFor(id) {
    try {
      const res = await fetch(`${API_BASE}/api/chat/messages?sessionId=${id}`);
      const rows = await res.json();
      // rows: [{id, role, content, created_at}]
      const mapped = rows.map((r) => ({
        role: r.role,
        content: r.content,
        ts: new Date(r.created_at),
      }));
      setMessages(mapped);
    } catch (e) {
      console.error("메시지 로드 실패:", e);
      setMessages([]);
    }
  }

  async function deleteSession(id) {
    try {
      await fetch(`${API_BASE}/api/chat/sessions/${id}`, { method: "DELETE" });
      // 목록 갱신
      await refreshSessions();
      // 현재 세션 삭제했다면 초기화
      if (id === sessionId) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("세션 삭제 실패:", e);
    }
  }

  /* ───────── UI 이벤트 ───────── */
  async function onNewChat() {
    setMessages([]);
    setSessionId(null);
    setDrawerOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function onSelectChat(id) {
    setSessionId(id);
    setDrawerOpen(false);
    await loadMessagesFor(id);
  }

  async function onDelete(id, e) {
    e.stopPropagation();
    await deleteSession(id);
  }

  /* 전송(백엔드 POST) */
  async function send(message) {
    const text = (message ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text, ts: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,                 // 사용자명(서버에서 user_id 매핑)
          sessionId,                // 없으면 서버가 새 세션 생성
          message: text,
        }),
      });
      const { reply, citations = [], sessionId: sid } = await res.json();

      // 새 세션이 생성되었으면 세션ID 반영
      if (sid && sid !== sessionId) setSessionId(sid);

      // 답변 표시
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply ?? "(응답 없음)", ts: new Date(), sources: toSources(citations) },
      ]);

      // 목록 갱신(업데이트 시간 반영)
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

  /* Enter 전송 */
  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing || loading) return;
      e.preventDefault();
      send();
    }
  }

  /* ───────── 렌더 ───────── */
  return (
    <div className="chat-page">
      {/* 상단 */}
      <header className="chat-header">
        <div className="chat-header-left">
          <button className="icon-btn" aria-label="최근 채팅 열기" onClick={() => setDrawerOpen(true)}>
            ☰
          </button>
          <div>
            <h1 className="chat-title">AI 정책 상담</h1>
            <p className="chat-sub">궁금한 정책에 대해 자연어로 질문해보세요</p>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="chat-main">
        <section className="chat-card">
          <div className="chat-scroll">
            {/* 빈 상태 */}
            {messages.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p className="empty-title">안녕하세요! 복지랑 AI입니다.</p>
                <p className="empty-sub">궁금한 정책에 대해 무엇이든 물어보세요.</p>
                <div className="sugg-block">
                  <div className="sugg-title">💡 추천 질문</div>
                  <div className="sugg-grid">
                    {defaultSuggestions.map((q, i) => (
                      <SuggestionChip key={i} q={q} onPick={(qq) => send(qq)} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // 대화 버블
              messages.map((m, i) => (
                <div key={i} className={`chat-item ${m.role === "user" ? "user" : "assistant"}`}>
                  <div className={`bubble ${m.role === "user" ? "me" : ""}`}>
                    <div className="bubble-text">{m.content}</div>
                    {m.sources && (
                      <div className="sources">
                        <div className="sources-title">참고 자료</div>
                        {m.sources.map((s, idx) => (
                          <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="source-link">
                            ↗ {s.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* 타이핑 */}
            {loading && (
              <div className="chat-item assistant">
                <div className="bubble">
                  <span className="dots">
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* 인라인 추천칩 */}
          {messages.length > 0 && (
            <div className="sugg-inline">
              {inlineSuggestions.map((q, i) => (
                <button key={i} className="chip small" onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 입력창 */}
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
            <button className="send-btn" disabled={!input.trim() || loading} onClick={() => send()} aria-label="전송">
              ➤
            </button>
          </div>
        </section>
      </main>

      {/* 좌측 드로어 */}
      <aside className={`chat-drawer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="drawer-header">
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="닫기">
            ✕
          </button>
          <h2>채팅 기록</h2>
        </div>

        <div className="drawer-body">
          <button className="btn-primary" onClick={onNewChat}>
            ＋ 새 채팅
          </button>

          <div className="search-box">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="채팅 검색…" />
          </div>

          <div className="drawer-section-label">최근 채팅</div>
          <div className="history-scroll">
            {filtered.map((c) => (
              <div
                key={c.id}
                className={`history-item ${sessionId === c.id ? "active" : ""}`}
                onClick={() => onSelectChat(c.id)}
              >
                <div className="history-main">
                  <div className="history-title">💬 {c.title || "새 대화"}</div>
                  <div className="history-last">{formatTime(c.updated_at || c.created_at)}</div>
                </div>
                <button className="trash" onClick={(e) => onDelete(c.id, e)} aria-label="삭제">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
    </div>
  );
}
