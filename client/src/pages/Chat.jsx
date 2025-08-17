// src/pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/Chat.css";

/* ───────────────────────── ① 추천 질문(상수) ───────────────────────── */
const defaultSuggestions = [
  "청년 월세 지원 신청 조건은 무엇인가요?",
  "소상공인 재난지원금은 언제까지 신청할 수 있나요?",
  "기초연금 수급 자격을 알려주세요",
];

const inlineSuggestions = [
  "지원 대상이 궁금해요",
  "신청 방법 알려주세요",
  "필요 서류는 무엇인가요?",
];

// 버튼형 칩
function SuggestionChip({ q, onPick }) {
  return (
    <button className="chip" onClick={() => onPick(q)}>
      {q}
    </button>
  );
}

/* ───────────────────────── ② 데모용 대화 히스토리 ───────────────────────── */
const mockHistory = [
  {
    id: "1",
    title: "청년 월세 지원 문의",
    last: "청년 월세 지원 신청 방법이 궁금해요",
    ts: new Date(2025, 0, 16, 14, 30),
  },
  {
    id: "2",
    title: "소상공인 재난지원금",
    last: "소상공인 재난지원금은 어떻게 받나요?",
    ts: new Date(2025, 0, 15, 9, 15),
  },
  {
    id: "3",
    title: "기초연금 신청",
    last: "기초연금 신청 조건이 궁금합니다",
    ts: new Date(2025, 0, 14, 16, 45),
  },
  {
    id: "4",
    title: "창업 지원 프로그램",
    last: "청년 창업 지원 프로그램 알려주세요",
    ts: new Date(2025, 0, 13, 11, 20),
  },
];

// 상대시간 표기
function formatTime(date) {
  const now = new Date();
  const diffH = Math.floor((now - date) / (1000 * 60 * 60));
  if (diffH < 1) return "방금 전";
  if (diffH < 24) return `${diffH}시간 전`;
  if (diffH < 48) return "어제";
  return `${Math.floor(diffH / 24)}일 전`;
}

/* ───────────────────────── ③ 메인 컴포넌트 ───────────────────────── */
export default function Chat() {
  // 상태
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState(mockHistory);
  const [currentId, setCurrentId] = useState("new");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // refs
  const endRef = useRef(null);   // 목록 맨 아래
  const inputRef = useRef(null); // 입력창 포커스

  // 좌측 검색 필터
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) || h.last.toLowerCase().includes(q)
    );
  }, [search, history]);

  /* ── 스크롤: 메시지/로딩 변화 시 맨 아래로 */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ── 포커스: 초기/드로어 닫힘/새 채팅 후 */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!drawerOpen) inputRef.current?.focus();
  }, [drawerOpen]);

  /* ───────────────────────── ④ 이벤트 핸들러 ───────────────────────── */
  // 새 채팅
  function onNewChat() {
    setMessages([]);
    setCurrentId("new");
    setDrawerOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // 히스토리 선택(실제론 서버에서 불러오기)
  function onSelectChat(id) {
    setCurrentId(id);
    setMessages([]);
    setDrawerOpen(false);
  }

  // 히스토리 삭제
  function onDelete(id, e) {
    e.stopPropagation();
    setHistory((prev) => prev.filter((x) => x.id !== id));
  }

  // 전송(데모 로직)
  function send(message) {
    const text = (message ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, ts: new Date() },
    ]);
    setInput("");
    setLoading(true);

    // TODO: 여기서 서버 POST로 교체
    setTimeout(() => {
      if (/(월세|청년|지원)/.test(text)) {
        setMessages((prev) => [
          ...prev,
          {
            role: "policy",
            content: "청년 월세 특별지원 정책 정보를 찾았습니다.",
            ts: new Date(),
            policy: {
              title: "청년 월세 특별지원",
              target: "만 19~34세 독립세대 청년",
              period: "2025.03.01 ~ 2025.05.31",
              support: "월 최대 20만원 (최대 12개월)",
              method: "복지로 또는 주민센터",
              linkTitle: "정부24 바로가기",
              link: "https://www.gov.kr",
            },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `"${text}" 관련 정보를 찾는 중입니다. 정책명/키워드를 포함해 주시면 더 정확해요.\n\n참고: 복지로, 정부24`,
            ts: new Date(),
            sources: [
              {
                title: "복지로 - 통합 복지 서비스",
                url: "https://www.bokjiro.go.kr",
              },
              {
                title: "정부24 - 온라인 민원서비스",
                url: "https://www.gov.kr",
              },
            ],
          },
        ]);
      }
      setLoading(false);
    }, 900);
  }

  // Enter 전송(Shift+Enter는 줄바꿈, IME 조합/로딩 중이면 무시)
  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing || loading) return;
      e.preventDefault();
      send();
    }
  }

  /* ───────────────────────── ⑤ 렌더링 ───────────────────────── */
  return (
    <div className="chat-page">
      {/* 상단 헤더 */}
      <header className="chat-header">
        <div className="chat-header-left">
          <button
            className="icon-btn"
            aria-label="최근 채팅 열기"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
          <div>
            <h1 className="chat-title">AI 정책 상담</h1>
            <p className="chat-sub">궁금한 정책에 대해 자연어로 질문해보세요</p>
          </div>
        </div>
      </header>

      {/* 본문 카드 */}
      <main className="chat-main">
        <section className="chat-card">
          {/* 메시지 스크롤 영역 */}
          <div className="chat-scroll">
            {/* 빈 상태: 환영 + 추천 질문(첫 대화만) */}
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
                <div
                  key={i}
                  className={`chat-item ${m.role === "user" ? "user" : "assistant"}`}
                >
                  {m.role === "policy" ? (
                    <div className="policy-card">
                      <div className="policy-head">
                        <div className="policy-icon">🏠</div>
                        <div>
                          <div className="policy-title">{m.policy.title}</div>
                          <span className="badge">2025</span>
                        </div>
                      </div>

                      <ul className="policy-list">
                        <li>
                          <b>지원 대상</b> {m.policy.target}
                        </li>
                        <li>
                          <b>신청 기간</b> {m.policy.period}
                        </li>
                        <li>
                          <b>지원 내용</b> {m.policy.support}
                        </li>
                        <li>
                          <b>신청 방법</b> {m.policy.method}
                        </li>
                        <li>
                          <b>공식 링크</b>{" "}
                          <a
                            className="link"
                            href={m.policy.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {m.policy.linkTitle} ↗
                          </a>
                        </li>
                      </ul>

                      <div className="policy-actions">
                        <button className="btn-outline">⭐ 즐겨찾기</button>
                        <button className="btn-outline">🗓️ 캘린더</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`bubble ${m.role === "user" ? "me" : ""}`}>
                      <div className="bubble-text">{m.content}</div>
                      {m.sources && (
                        <div className="sources">
                          <div className="sources-title">참고 자료</div>
                          {m.sources.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="source-link"
                            >
                              ↗ {s.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* 타이핑 표시 */}
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

          {/* 대화 중 상시 추천 칩(입력창 위) */}
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
            <button
              className="send-btn"
              disabled={!input.trim() || loading}
              onClick={() => send()}
              aria-label="전송"
            >
              ➤
            </button>
          </div>
        </section>
      </main>

      {/* 사이드 드로어 */}
      <aside
        className={`chat-drawer ${drawerOpen ? "open" : ""}`}
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-header">
          <button
            className="icon-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="닫기"
          >
            ✕
          </button>
          <h2>채팅 기록</h2>
        </div>

        <div className="drawer-body">
          <button className="btn-primary" onClick={onNewChat}>
            ＋ 새 채팅
          </button>

          <div className="search-box">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="채팅 검색…"
            />
          </div>

          <div className="drawer-section-label">최근 채팅</div>

          <div className="history-scroll">
            {filtered.map((c) => (
              <div
                key={c.id}
                className={`history-item ${currentId === c.id ? "active" : ""}`}
                onClick={() => onSelectChat(c.id)}
              >
                <div className="history-main">
                  <div className="history-title">💬 {c.title}</div>
                  <div className="history-last">{c.last}</div>
                  <div className="history-time">{formatTime(c.ts)}</div>
                </div>
                <button
                  className="trash"
                  onClick={(e) => onDelete(c.id, e)}
                  aria-label="삭제"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* 드로어 오버레이 */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}
