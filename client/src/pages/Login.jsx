/* src/pages/Login.jsx */
import React, { useState, useEffect } from 'react';
import '../styles/Login.css';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

const EyeIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 4.36-5.94"/>
    <path d="M1 1l22 22"/>
  </svg>
);

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const modeFromUrl = queryParams.get('mode'); // 'signup' | null

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    setIsLogin(modeFromUrl !== 'signup'); // ?mode=signup 이면 회원가입 폼
    window.scrollTo(0, 0);
  }, [modeFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isLogin) {
        // ✅ 로그인: /api/users/login
        const res = await fetch(`${API_BASE}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usernameOrEmail: username, // 아이디 또는 이메일 입력란을 username에 재사용
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message || '로그인 실패');

        // 사용자 정보 저장(간단)
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('로그인 성공!');
        navigate('/');
      } else {
        // ✅ 회원가입: /api/users/register
        const res = await fetch(`${API_BASE}/api/users/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message || '회원가입 실패');

        alert('회원가입 완료! 로그인 해주세요.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      alert('요청 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fullscreen-center">
      <div className="container">
        <div className="form-box">
          <h2>{isLogin ? '로그인' : '회원가입'}</h2>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {/* 아이디(또는 이메일) */}
            <input
              type="text"
              placeholder={isLogin ? '아이디 또는 이메일' : '아이디'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            {/* 회원가입 때만 이메일 입력 */}
            {!isLogin && (
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}

            {/* 비밀번호 */}
            <div className="pw-field">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="pw-toggle-btn"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                title={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <button type="submit">
              {isLogin ? '로그인' : '회원가입'}
            </button>
          </form>

          <p>
            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
            <span className="toggle" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? '회원가입' : '로그인'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
