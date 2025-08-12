/* src/pages/Home.jsx */
import React from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import '../styles/Home.css';
export default function Home() {
   const navigate = useNavigate();


   return (
     <div className="home-page">
      {/* 🎯 히어로 섹션 */}
      <section className="hero">
        <div className="hero__text">
          <span className="badge">🎯 맞춤형 AI 정책 도우미</span>
          <h1 className="headline">
            <span className="grad-primary">복지랑</span><br />
            나에게 딱 맞는<br />
            <span className="grad-mix">정책을 찾아드려요</span>
          </h1>
          <p className="sub">
            청년부터 어르신까지, 누구나 손쉽게 <strong>AI 챗봇</strong>으로
            자신에게 맞는 복지·정책 정보를 빠르게 검색해 보세요
          </p>
          <div className="search-card">
            <div className="search-input">
              <span className="icon">🔍</span>
              <input
                type="text"
                placeholder="어떤 정책이 궁금하신가요? (예: 청년 월세 지원)"
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate('/chat')}
            >
              AI에게 물어보기 →
            </button>
          </div>
          <p>인기 검색어 :</p>
          <div className="keywords">
            {[
              '💰 청년 월세 지원',
              '🏪 소상공인 재난지원금',
              '👥 어르신 돌봄 서비스',
              '🚀 창업 지원 정책'
            ].map(word => (
              <Link key={word} to={`/chat?q=${encodeURIComponent(word)}`}>
                {word}
              </Link>
            ))}
          </div>
        </div>
        <div className="hero__image">
          <img src="/banner.png" alt="복지랑 서비스 미리보기" />
        </div>
      </section>

      {/* 💡 주요 서비스 섹션 */}
      <section className="feature">
        <h2>
          <span className="badge">✨ 주요 서비스</span><br />
          복지랑이 제공하는 <span className="grad-primary">스마트한 기능</span>
        </h2>
        <p className="section-sub">
          AI 기술과 최신 정책 데이터로 가장 정확한 정보를 빠르게 제공합니다
        </p>
        <div className="feature-grid">
          {[ 
            { icon: '💬', title: 'AI 챗봇 상담', desc: '자연어로 질문하면 맞춤형 정책을 즉시 찾아드려요' },
            { icon: '📅', title: '정책 캘린더', desc: '중요한 신청 마감일을 한눈에 보고 놓치지 마세요' },
            { icon: '⭐', title: '즐겨찾기', desc: '관심 정책을 저장하고 업데이트 알림을 받아보세요' },
            { icon: '🎯', title: '맞춤 추천', desc: '나이·직업·상황에 맞춘 정확한 정책 추천' },
            { icon: '🔔', title: '마감일 알림', desc: '중요한 마감일을 푸시/메일로 미리 안내' },
            { icon: '🏛️', title: '공식 출처', desc: '정부·지자체 공개 데이터를 기반으로 신뢰성 보장' }
          ].map(card => (
            <div key={card.title} className="feature-card">
              <span className="card-icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 📊 복지랑 통계 섹션 (비활성화 상태) */}
      {/*
      <section className="stats">
        <h2>복지랑과 함께하는 성과</h2>
        <p className="section-sub">
          더 많은 분들이 복지랑을 통해 자신에게 맞는 정책을 찾고 계십니다
        </p>
        <div className="stats-grid">
          {[ 
            { icon: '📨', value: '500K+', label: 'AI 상담 완료' },
            { icon: '📁', value: '1,200+', label: '정책 정보 등록' },
            { icon: '👍', value: '98%', label: '이용자 만족도' },
            { icon: '⏱️', value: '24시간', label: '평균 응답 시간' }
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="stat-icon">{stat.icon}</div>
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
      */}

      {/* 🎖️ 인증 뱃지 섹션 (비활성화 상태) */}
      {/*
      <section className="badges">
        {[ 
          { icon: '🛡️', title: '정부 인증', desc: '공식 정책 데이터' },
          { icon: '🏅', title: '신뢰성 보장', desc: '검증된 정보만 제공' },
          { icon: '👥', title: '50만+ 이용자', desc: '많은 분들이 선택' },
          { icon: '⏰', title: '24시간 서비스', desc: '언제든지 이용 가능' }
        ].map(badge => (
          <div key={badge.title} className="badge-card">
            <div className="badge-icon">{badge.icon}</div>
            <h4>{badge.title}</h4>
            <p>{badge.desc}</p>
          </div>
        ))}
      </section>
      */}

      {/* ❓ 신규 정책 소개 섹션 */}
      <section className="popular">
        <div className="popular-head">
          <span className="popular-icon">📈</span>
          <h2>신규 정책 안내</h2>
<p className="section-sub">최근에 새로 발표된 주요 정책들을 한눈에 확인해보세요</p>
        </div>
        <div className="popular-grid">
          {[ 
            {
              title: '청년 정책',
              color: 'var(--blue)',
              icon: '🧑‍🎓',
              questions: [
                '청년 월세 지원 신청 방법이 궁금해요',
                '청년 취업 지원금은 어떻게 받나요?',
                '청년 창업 지원 프로그램 알려주세요'
              ]
            },
            {
              title: '소상공인 지원',
              color: 'var(--green)',
              icon: '🏢',
              questions: [
                '소상공인 재난지원금 신청 조건은?',
                '소상공인 대출 지원 프로그램이 있나요?',
                '임대료 지원 정책이 궁금합니다'
              ]
            },
            {
              title: '어르신 복지',
              color: 'var(--purple)',
              icon: '❤️',
              questions: [
                '기초연금 신청 방법을 알려주세요',
                '어르신 돌봄 서비스는 어떻게 이용하나요?',
                '노인장기요양보험 등급 판정은 어떻게?'
              ]
            }
          ].map(cat => (
            <div key={cat.title} className="popular-card">
              <div className="popular-banner" style={{ background: cat.color }}>
                <span>{cat.icon}</span>
              </div>
              <h3>{cat.title}</h3>
              <ul className="popular-list">
                {cat.questions.map(q => (
                  <li key={q}>
                    <Link to={`/chat?q=${encodeURIComponent(q)}`}>💬 {q}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ✅ 하단 CTA 섹션 */}
      <section className="cta">
        <h2>지금 바로 복지랑을 체험해 보세요!</h2>
        <p>정책 검색부터 신청 일정 관리까지 한 곳에서 해결할 수 있습니다</p>
        <div style={{ marginTop: '24px' }}>
          <button className="btn-compact" onClick={() => navigate('/chat')}>
            무료로 시작하기
          </button>
        </div>
      </section>

      {/* 📎 푸터 영역 */}
      <footer className="footer">
        <div className="footer-inner">
          <span>© 2025 복지랑 | AI 정책 정보 서비스</span>
          <nav>
            <a
              href="https://github.com/hyyyeon/ms-hacktest"
              target="_blank"
              rel="noopener noreferrer"
            >
              깃허브
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
