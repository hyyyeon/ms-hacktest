/* src/pages/Login.jsx */
import React, { useState, useEffect } from 'react';
import '../styles/Login.css';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const modeFromUrl = queryParams.get('mode'); // 'signup' or null

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    setIsLogin(modeFromUrl !== 'signup');
    window.scrollTo(0, 0);
  }, [modeFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url  = isLogin ? '/user/login' : '/user/signup';
    const body = isLogin ? { username, password } : { username, email, password };

    try {
      const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      alert(data.message);

      if (!isLogin && res.status === 201) {
        setIsLogin(true);
        setUsername(''); setEmail(''); setPassword('');
      }
if (isLogin && res.status === 200) {
  localStorage.setItem('user', JSON.stringify({ username }));
  navigate('/'); // 홈으로
}
    } catch (err) {
      alert('오류 발생!');
      console.error(err);
    }
  };

  return (
    <div className="fullscreen-center">
      <div className="container">
        <div className="form-box">
          <h2>{isLogin ? '로그인' : '회원가입'}</h2>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            {!isLogin && (
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}

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
