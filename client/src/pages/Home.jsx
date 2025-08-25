/* src/pages/Home.jsx */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaSearch, FaBriefcase, FaComments, FaStar,
  FaCheckCircle, FaBell, FaChartLine, FaStore,
  FaMoneyBillWave, FaRocket, FaArrowRight,
  FaRegIdCard, FaClone,  FaHistory, FaBook, FaFolderOpen   // ✅ 새로 추가
} from 'react-icons/fa';

import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* 🎯 히어로 섹션 */}
      <section className="hero">
        <div className="hero__text">
          <span className="badge"><FaBriefcase /> 소상공인·기업 전용 AI 정책 도우미</span>
          <h1 className="headline">
            <span className="grad-primary">복지랑</span><br />
            내 사업에 딱 맞는<br />
            <span className="grad-mix">지원정책을 찾아드립니다</span>
          </h1>
          <p className="sub">
            소상공인·기업 맞춤형 <strong>AI 챗봇</strong>으로 최신 정책과 지원 정보를 <br/>
            빠르게 확인하세요.
          </p>
          <div className="search-card">
            <div className="search-input">
              <FaSearch className="icon" />
              <input
                type="text"
                placeholder="예: 소상공인 대출 지원, 기업 세제 혜택"
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate('/chat')}
            >
              AI에게 물어보기 <FaArrowRight />
            </button>
          </div>
          <p>인기 검색어 :</p>
          <div className="keywords">
            {[
              ' 소상공인 재난지원금',
              ' 기업 세제 혜택',
              ' 저금리 대출 지원',
              ' 창업 성장 패키지'
            ].map(word => (
              <Link key={word} to={`/chat?q=${encodeURIComponent(word)}`}>
                {word}
              </Link>
            ))}
          </div>
        </div>
        <div className="hero__image">
          <img src="/banner.png" alt="소상공인·기업 정책 미리보기" />
        </div>
      </section>

      {/* 💡 주요 서비스 섹션 */}
      <section className="feature">
        <h2>
          <span className="badge">✨ 주요 서비스</span><br />
          소상공인·기업 전용 <span className="grad-primary">AI 정책 도우미</span>
        </h2>
        <p className="section-sub">
          AI 기술과 공식 데이터를 기반으로 최신 정보를 빠르게 제공합니다.
        </p>
        <div className="feature-grid">
          {[
            { icon: <FaComments />, title: 'AI 맞춤 상담', desc: '내 사업 조건에 맞는 지원정책을 빠르게 요약' },
            { icon: <FaClone />, title: '정책 카드 제공', desc: '정책을 카드 형식으로 한눈에 확인' },
//      { icon: <FaCalendarAlt />, title: '정책 캘린더', desc: '신청 마감일·중요 일정 한눈에 확인' },
            { icon: <FaStar />, title: '관심 정책 즐겨찾기', desc: '필요한 정책을 저장하고 업데이트 알림' },
            { icon: <FaCheckCircle />, title: '공식 데이터 기반', desc: '정부·지자체 신뢰성 보장 자료 제공' },
            { icon: <FaBell />, title: '알림 서비스', desc: '마감일, 새로운 지원 소식 알림 제공' },
            { icon: <FaHistory />, title: '대화 기록/즐겨찾기 관리', desc: '최근 대화와 저장한 정책을 언제든 다시 확인' }
          ].map(card => (
            <div key={card.title} className="feature-card">
              <span className="card-icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 📈 신규 정책 안내 섹션 */}
      <section className="popular">
        <div className="popular-head">
          <span className="popular-icon"><FaChartLine /></span>
          <h2>신규 지원 정책 안내</h2>
          <p className="section-sub">최근 발표된 소상공인·기업 지원정책을 확인하세요</p>
        </div>
        <div className="popular-grid">
          {[
            {
              title: '소상공인 지원',
              color: 'var(--green)',
              icon: <FaStore />,
              questions: [
                '소상공인 재난지원금 신청 조건은?',
                '저금리 대출 지원 프로그램이 있나요?',
                '임대료 지원 정책이 궁금합니다'
              ]
            },
            {
              title: '기업 세제 혜택',
              color: 'var(--blue)',
              icon: <FaMoneyBillWave />,
              questions: [
                '중소기업 세금 감면 정책 알려주세요',
                'R&D 투자 세액 공제 혜택이 있나요?',
                '고용 창출 기업 인센티브 신청 방법은?'
              ]
            },
            {
              title: '창업 성장 패키지',
              color: 'var(--purple)',
              icon: <FaRocket />,
              questions: [
                '창업 지원금 신청 방법 알려주세요',
                '초기 창업자 교육 프로그램 있나요?',
                '창업 공간 지원 정책이 궁금해요'
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
                    <Link to={`/chat?q=${encodeURIComponent(q)}`}> {q}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ✅ 하단 CTA 섹션 */}
      <section className="cta">
        <h2>지금 바로 복지랑을 시작하세요!</h2>
        <p>정책 검색부터 신청 일정 관리까지 한 번에 해결할 수 있습니다.</p>
        <div style={{ marginTop: '24px' }}>
          <button className="btn-compact" onClick={() => navigate('/chat')}>
            무료로 시작하기 <FaArrowRight />
          </button>
        </div>
      </section>

      {/* 📎 푸터 영역 */}
      <footer className="footer">
        <div className="footer-inner">
          <span>© 2025 복지랑 | 소상공인·기업 AI 정책 정보 서비스</span>
          <nav>
            <a
              href="https://github.com/hyyyeon/ms-policy-chatbot"
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

