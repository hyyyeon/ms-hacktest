// src/components/Navbar.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import '../styles/Home.css'; // 기존 navbar 스타일 재사용

export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('user');

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">복지랑</Link>

        <ul className="gnb">
          <li><NavLink to="/" end>홈</NavLink></li>
          <li><NavLink to="/chat">AI 챗봇</NavLink></li>
      {/* <li><NavLink to="/calendar">정책 캘린더</NavLink></li> */}
          <li><NavLink to="/bookmarks">즐겨찾기</NavLink></li>
          <li><NavLink to="/mypage">마이페이지</NavLink></li>
        </ul>

        <div className="auth-buttons">
          {isLoggedIn ? (
            <button onClick={handleLogout}>로그아웃</button>
          ) : (
            <>
              <button onClick={() => navigate('/login?mode=login')}>로그인</button>
              <button onClick={() => navigate('/login?mode=signup')}>회원가입</button>
            </>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          aria-label="모바일 메뉴 열기"
          onClick={() => document.body.classList.toggle('menu-open')}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
