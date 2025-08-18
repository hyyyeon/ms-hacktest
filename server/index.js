// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const bookmarksRoutes = require('./routes/bookmarks');
const chatRoutes = require('./routes/chat'); // ✅ 추가

const app = express();
const port = process.env.PORT || 3001;

/* 미들웨어 */
app.use(cors({
  origin: ['http://localhost:3000'], // 프론트 주소
  credentials: true,
}));
app.use(express.json());

/* ✅ DB 풀 생성 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'myusers',
  waitForConnections: true,
  connectionLimit: 10,
});
app.set('db', pool);

/* 라우터 등록 */
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/chat', chatRoutes);   // ✅ 핵심: chat 라우터 등록

/* 헬스체크 */
app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* API 404 → JSON 반환 */
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'not_found', path: req.originalUrl });
});

/* 서버 실행 */
app.listen(port, async () => {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('✅ MySQL 연결 성공:', rows);
  } catch (err) {
    console.error('❌ MySQL 연결 실패:', err.message);
  }
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
