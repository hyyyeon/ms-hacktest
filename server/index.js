// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const bookmarksRoutes = require('./routes/bookmarks');
const chatRoutes = require('./routes/chat'); 
const { runD7Notifications } = require("./notify");


const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
    origin: ['http://localhost:3000', 'https://ms-hacktest.vercel.app'],
  credentials: true
}));
app.use(express.json());               
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/chat', chatRoutes); // ✅ 핵심

/* 헬스체크 */
app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* API 404 */
app.use('/api', (req, res) => res.status(404).json({ message: 'not_found', path: req.originalUrl }));

app.listen(port, async () => {
  try { await pool.query('SELECT 1'); console.log('✅ MySQL OK'); }
  catch (e) { console.error('❌ MySQL 실패:', e.message); }
  console.log(`✅ http://localhost:${port}`);
});

// 메일(notify)
// 서버 시작 직후 1회
(async () => {
  try { await runD7Notifications(app); } 
  catch (e) { console.error("[notify] first run error:", e.message); }
})();

// 1시간마다 한 번
setInterval(async () => {
  try { await runD7Notifications(app); } 
  catch (e) { console.error("[notify] interval error:", e.message); }
}, 60 * 60 * 1000);

// (선택) 수동 트리거 라우트
app.get("/internal/run-d7", async (_req, res) => {
  try {
    const out = await runD7Notifications(app);
    res.json({ ok: true, out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});