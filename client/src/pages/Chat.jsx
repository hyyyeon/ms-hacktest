// client/src/pages/Chat.jsx
import React, { useEffect, useMemo, useState } from 'react';
import '../styles/Chat.css';
import { sendChatMessage, toast } from '../utils';
import PolicyCard from '../components/PolicyCard'; // ← 없으면 생성해 주세요 (PolicyCard.jsx/PolicyCard.css)
import { FaHome } from 'react-icons/fa'; // 아이콘 예시(react-icons)

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: '안녕하세요! 무엇을 도와드릴까요?',
};

const SUGGESTED = [
  { cat: '청년', qs: ['청년 월세 지원 알려줘', '청년도약계좌 조건은?', '청년 취업 지원 뭐 있어?'] },
  { cat: '소상공인', qs: ['소상공인 전기요금 지원', '정책자금 대출 절차', '폐업 지원 제도 알려줘'] },
  { cat: '기초생활', qs: ['기초연금 신청 자격', '한부모가정 지원', '의료급여 대상'] },
];

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // /chat?q=... 로 진입 시 입력창 프리필
  const preset = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  }, []);
  useEffect(() => {
    if (preset) setText(preset);
  }, [preset]);

  // 초기 로드: localStorage에서 히스토리 복구
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('chat_history') || '[]');
      setMessages(saved.length ? saved : [WELCOME]);
    } catch {
      setMessages([WELCOME]);
    }
  }, []);

  // 저장: 메시지 변경 시 최소 형태로 저장(role, content만)
  useEffect(() => {
    const minimal = messages.map(({ role, content }) => ({ role, content }));
    localStorage.setItem('chat_history', JSON.stringify(minimal));
  }, [messages]);

  const onSend = async (e) => {
    e?.preventDefault?.();
    const t = text.trim();
    if (!t || sending) return;

    setError('');
    setText('');

    const userMsg = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      role: 'user',
      content: t,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);

    try {
      // 서버에는 role/content만 전송
      const payload = next.map(({ role, content }) => ({ role, content }));
      const res = await sendChatMessage(payload);

      const answer = res?.reply ?? '(응답이 비었습니다)';
      const citations = Array.isArray(res?.citations) ? res.citations : [];

      // 간단 키워드 매칭으로 "정책 카드"로 보여줄지 분기 (예시)
      const isPolicy = /월세|청년|지원|소상공인|신청|정책|대출|자금|보조금/.test(t);

      if (isPolicy) {
        const cardMsg = {
          id: crypto?.randomUUID?.() || String(Math.random()),
          role: 'assistant',
          type: 'policy',
          content: '관련 정책 정보를 카드로 정리했어요.',
          policyData: {
            title: '청년 월세 특별지원',
            icon: <FaHome />,
            target: '만 19~34세 독립세대 청년',
            period: '2025.03.01 ~ 2025.05.31',
            support: '월 최대 20만원(최대 12개월)',
            method: '복지로 또는 주민센터 방문',
            link: { title: '정부24 바로가기', url: 'https://www.gov.kr' },
          },
          citations,
        };
        setMessages((prev) => [...prev, cardMsg]);
      } else {
        const assist = {
          id: crypto?.randomUUID?.() || String(Math.random()),
          role: 'assistant',
          content: answer,
          citations,
        };
        setMessages((prev) => [...prev, assist]);
      }
    } catch (err) {
      setError(err.message || '요청 실패');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* 헤더 */}
        <header className="chat-header">
          <h1>AI 정책·복지 챗봇</h1>
          <p className="sub">공식 출처와 함께 정책 정보를 깔끔하게 제공해요</p>
        </header>

        {/* 히스토리 */}
        <section className="chat-history" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
              <div className="bubble-inner">
                {m.type === 'policy' && m.policyData ? (
                  <PolicyCard
                    data={m.policyData}
                    onBookmark={() => toast('즐겨찾기에 추가되었습니다.')}
                    onCalendar={() => toast('캘린더에 등록되었습니다.')}
                  />
                ) : (
                  <>
                    <pre className="content">{m.content}</pre>
                    {Array.isArray(m.citations) && m.citations.length > 0 && (
                      <ul className="citations">
                        {m.citations.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </section>

        {/* 추천 질문: 첫 진입 등 대화가 비었을 때 */}
        {messages.length === 0 && (
          <section className="suggest">
            <h3>어떤 정책이 궁금하신가요?</h3>
            <p className="muted">카테고리별 추천 질문을 선택하거나 직접 질문해보세요</p>
            <div className="suggest-grid">
              {SUGGESTED.map((cat) => (
                <div key={cat.cat} className="suggest-card">
                  <h4>{cat.cat}</h4>
                  <div className="suggest-list">
                    {cat.qs.map((q) => (
                      <button key={q} type="button" onClick={() => setText(q)} className="suggest-btn">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 입력 */}
        <form className="chat-input" onSubmit={onSend}>
          <input
            type="text"
            placeholder="예) 소상공인 전기요금 지원 정책 알려줘"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="질문 입력"
          />
          <div className="actions">
            <button type="submit" disabled={sending}>
              보내기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
