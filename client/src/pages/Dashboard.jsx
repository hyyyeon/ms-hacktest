/* components/Dashboard.jsx */
import React from 'react';
import '../styles/Dashboard.css';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  return (
    /* ── 페이지 래퍼 : flex column 으로 footer 하단 고정 ── */
    <div className="page-wrapper">
      {/* ──────────  NAV  ────────── */}
      <nav className="navbar">
        <div className="logo">AI 스터디</div>

        <ul className="nav-links">
          <li><a href="#">홈</a></li>
          <li><a href="#">AI 튜터</a></li>
          <li><a href="#">문제 생성</a></li>
          <li><a href="#">학습 분석</a></li>
        </ul>

        <div className="nav-buttons">
          <button
            className="nav-btn nav-outline"
            onClick={() => navigate('/login')}
          >
            로그인
          </button>
          <button
            className="nav-btn nav-filled"
            onClick={() => navigate('/login?mode=signup')}
          >
            회원가입
          </button>
        </div>
      </nav>

      {/* ──────────  MAIN  ────────── */}
      <main className="home-container">
        {/* Hero */}
        <section className="hero">
          <h1>✨ AI 스터디</h1>
          <p className="subtitle">
            AI 챗봇과 함께하는 똑똑한 학습 경험<br />
            질문하고, 문제를 풀고, 스스로 성장하세요
          </p>

          <div className="hero-buttons">
            <button className="btn primary">🔍 AI 튜터와 대화하기</button>
            <button className="btn secondary">📖 학습 시작하기</button>
          </div>
        </section>

        {/* Features */}
        <section className="feature-section">
          <h2>학습을 더 쉽고 재미있게</h2>
          <p className="subtitle">AI 기술로 개인 맞춤형 학습 경험을 제공합니다</p>

          <div className="features">
            <div className="feature-card">
              <div className="icon blue">💬</div>
              <h3>AI 튜터 채팅</h3>
              <p>궁금한 건 언제든 물어보세요.<br />AI가 친절하게 설명해드려요.</p>
            </div>
            <div className="feature-card">
              <div className="icon green">📷</div>
              <h3>문제 사진 인식</h3>
              <p>문제 사진을 찍으면<br />자동으로 풀이해드립니다.</p>
            </div>
            <div className="feature-card">
              <div className="icon pink">📝</div>
              <h3>맞춤 문제 생성</h3>
              <p>원하는 범위와 난이도로<br />문제를 만들어드려요.</p>
            </div>
            <div className="feature-card">
              <div className="icon orange">📈</div>
              <h3>학습 분석</h3>
              <p>공부 패턴을 분석해<br />맞춤 피드백을 제공합니다.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="start-section">
          <div className="start-box">
            <h2>지금 시작해보세요!</h2>
            <p>AI와 함께하는 새로운 학습 경험을 만나보세요</p>
            <button
              className="start-btn"
              onClick={() => navigate('/login?mode=signup')}
            >
              무료로 시작하기
            </button>
          </div>
        </section>
      </main>

      {/* ──────────  FOOTER  ────────── */}
      <footer className="site-footer">
        <p>© 2025 AI 스터디. All rights reserved.</p>
        <div className="social-links">
          <a href="#">Instagram</a>
          <a href="#">GitHub</a>
          <a href="#">LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
