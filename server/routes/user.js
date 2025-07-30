// 로그인/회원가입 API 라우터

const express = require('express');
const router = express.Router();

// 회원가입
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const pool = req.app.get('db');

  try {
    const [exists] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', [username, email]
    );
    if (exists.length > 0) {
      return res.status(409).json({ message: '이미 존재하는 아이디 또는 이메일입니다.' });
    }

    await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password]
    );

    res.status(201).json({ message: '회원가입 성공', user: { username, email } });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const pool = req.app.get('db');

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    res.status(200).json({ message: '로그인 성공', user: { username } });
  } catch (err) {
    res.status(500).json({ message: '서버 오류', error: err.message });
  }
});

module.exports = router;
