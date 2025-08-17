// server/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// DB 연결 풀
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',   // ← .env에서 읽음
  database: process.env.DB_NAME || 'myusers',
});
app.set('db', pool);

// === 라우터 (기존 세팅 유지) ===
const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const bookmarksRoutes = require('./routes/bookmarks');

app.use('/user', userRoutes);
app.use('/profile', profileRoutes);
app.use('/bookmarks', bookmarksRoutes);

/** ------------------------------------------------------------------
 *  🔵 AI 프록시 라우트 (초기: 더미 응답 → 추후 LLM 호출로 교체)
 *  POST /api/chat
 *  body: { messages: [{role:'user'|'assistant', content:string}, ...] }
 *  res : { reply: string, citations?: string[] }
 *  ------------------------------------------------------------------ */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;

    // 1) 동작 확인용 더미 응답
    const last = messages.filter(m => m.role === 'user').pop()?.content || '';
    const reply = `“${last}”에 대한 응답 예시입니다. (임시)`;
    return res.json({ reply });

    // 2) 실제 LLM 호출(Perplexity/OpenAI)로 바꿀 때 예시:
    // const apiKey = process.env.PERPLEXITY_API_KEY; // or OPENAI_API_KEY
    // if (!apiKey) return res.status(500).json({ error: 'missing_api_key' });
    // const payload = { model: 'sonar-pro', messages, max_tokens: 1024, temperature: 0.2 };
    // const llmRes = await fetch('https://api.perplexity.ai/chat/completions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    //   body: JSON.stringify(payload)
    // });
    // const data = await llmRes.json();
    // const answer = data?.choices?.[0]?.message?.content ?? '(응답 없음)';
    // const citations = data?.citations ?? [];
    // return res.json({ reply: answer, citations });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'chat_failed' });
  }
});

// === 헬스 체크 (기존 유지) ===
app.get('/health/db', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// MySQL 연결 확인 (기존 유지)
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ MySQL 연결 성공');
  } catch (err) {
    console.error('❌ MySQL 연결 실패:', err.message);
  }
})();

// === 서버 시작 (기존 유지) ===
app.listen(port, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
