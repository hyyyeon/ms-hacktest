// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const bookmarksRoutes = require('./routes/bookmarks');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/** ✅ DB 풀을 라우터 등록 전에 주입 (안전) */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
app.set('db', pool);

/** 라우트 등록 */
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bookmarks', bookmarksRoutes);

/** Perplexity Chat API (그대로 사용) */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'missing_api_key' });

    const payload = { model: 'sonar-pro', messages, max_tokens: 1024, temperature: 0.2 };

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content ?? '(응답 없음)';
    const citations = data?.citations ?? [];
    res.json({ reply: answer, citations });
  } catch (e) {
    console.error('❌ Perplexity API Error:', e);
    res.status(500).json({ error: 'chat_failed', detail: e.message });
  }
});

/** 헬스체크 */
app.get('/healthz', (req, res) => res.json({ ok: true }));

/** 서버 기동 */
app.listen(port, async () => {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('✅ MySQL 연결 성공:', rows);
  } catch (err) {
    console.error('❌ MySQL 연결 실패:', err.message);
  }
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
