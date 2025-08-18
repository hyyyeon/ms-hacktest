// server/routes/user.js
const express = require('express');
const router = express.Router();

// 풀 가져오기
function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool not set');
  return pool;
}

/** 회원가입: POST /api/users/register
 * body: { username, email, password }
 */
router.post('/register', async (req, res) => {
  try {
    const pool = db(req);
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ message: '모든 필드를 입력하세요.' });
    }

    // 중복 검사
    const [dups] = await pool.query(
      'SELECT id FROM users WHERE username=? OR email=?',
      [username, email]
    );
    if (dups.length > 0) {
      return res.status(409).json({ message: '이미 존재하는 아이디/이메일입니다.' });
    }

    // (빠른 연결용) 평문 저장 — 나중에 bcrypt로 교체 권장
    const [r] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password]
    );

    // 프로필 기본 행 생성(선택)
    await pool.query('INSERT INTO user_profiles (user_id) VALUES (?)', [r.insertId]);

    res.status(201).json({ id: r.insertId, username, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'register_failed', detail: e.message });
  }
});

/** 로그인: POST /api/users/login
 * body: { usernameOrEmail, password }
 */
router.post('/login', async (req, res) => {
  try {
    const pool = db(req);
    const { usernameOrEmail, password } = req.body || {};
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: '아이디/이메일과 비밀번호를 입력하세요.' });
    }

    // 평문 비교 (덤프가 평문 비밀번호라서 우선 이렇게)
    const [rows] = await pool.query(
      'SELECT id, username, email FROM users WHERE (username=? OR email=?) AND password=?',
      [usernameOrEmail, usernameOrEmail, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: '로그인 실패(계정 없음 또는 비밀번호 불일치)' });
    }

    const user = rows[0];

    // 간단 버전: 토큰 없이 사용자 정보만 반환 → 프론트에서 localStorage에 저장
    res.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'login_failed', detail: e.message });
  }
});

module.exports = router;