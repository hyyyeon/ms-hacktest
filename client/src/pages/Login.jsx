/* Login.jsx */
import React, { useState, useEffect } from 'react';
import '../styles/Login.css';
import { useLocation, useNavigate } from 'react-router-dom';

const Login = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const modeFromUrl = queryParams.get('mode'); // 'signup' or null
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    setIsLogin(modeFromUrl !== 'signup');
    window.scrollTo(0, 0); // 페이지 최상단으로 이동
  }, [modeFromUrl]);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? '/user/login' : '/user/signup';
    const body = isLogin
      ? { username, password }
      : { username, email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      alert(data.message);  

  // ✅ 회원가입 성공 후 로그인으로 전환
  if (!isLogin && res.status === 201) {
    setIsLogin(true);
    setUsername('');
    setEmail('');
    setPassword('');
  }

  
  // ✅ 로그인 성공 시 localStorage 저장
  if (isLogin && res.status === 200) {
  localStorage.setItem('user', JSON.stringify({ username }));
  navigate('/'); // ← 이 줄 추가 (로그인 후 홈으로 이동)
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
        <input
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {!isLogin && (
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleSubmit}>
          {isLogin ? '로그인' : '회원가입'}
        </button>
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
