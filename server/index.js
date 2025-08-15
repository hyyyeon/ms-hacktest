// server/index.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// DB 연결 풀
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'yoon',   // @@@ 본인 환경 비번 @@@
  database: 'myusers'
});
app.set('db', pool);

// 라우터
const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const bookmarksRoutes = require('./routes/bookmarks');

app.use('/user', userRoutes);
app.use('/profile', profileRoutes);
app.use('/bookmarks', bookmarksRoutes);

// DB 서버 상태 점검
app.get('/health/db', async (_req, res) => {
  try { const [rows] = await pool.query('SELECT 1 AS ok'); res.json({ ok: true, rows }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// MySQL 연결 확인
(async () => {
  try { const conn = await pool.getConnection(); await conn.ping(); conn.release();
        console.log('✅ MySQL 연결 성공'); }
  catch (err) { console.error('❌ MySQL 연결 실패:', err.message); }
})();

// 마지막에 listen
app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});