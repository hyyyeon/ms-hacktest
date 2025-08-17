// server/routes/chat.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

/** 유틸: app.set('db')에서 풀 꺼내기 */
function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool not set');
  return pool;
}

/** 유틸: username -> user_id 매핑 (임시 인증 대용) */
async function getUserIdByUsername(pool, username) {
  if (!username) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=?', [username]);
  return rows?.[0]?.id ?? null;
}

/** 1) 세션 목록: GET /api/chat/sessions?username=user1&limit=20 */
router.get('/sessions', async (req, res) => {
  try {
    const pool = db(req);
    const { username, limit = 20 } = req.query;
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패' });

    const [rows] = await pool.query(
      `SELECT id, title, created_at, updated_at
         FROM chat_sessions
        WHERE user_id=?
        ORDER BY updated_at DESC
        LIMIT ?`, [userId, Number(limit)]
    );
    res.json(rows);
  } catch (e) {
    console.error(e); res.status(500).json({ message: '서버 오류' });
  }
});

/** 2) 세션 생성: POST /api/chat/sessions { username, title? } */
router.post('/sessions', async (req, res) => {
  try {
    const pool = db(req);
    const { username, title } = req.body || {};
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패' });

    const [r] = await pool.query(
      'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
      [userId, title || null]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error(e); res.status(500).json({ message: '서버 오류' });
  }
});

/** 3) 특정 세션 메시지 목록: GET /api/chat/messages?sessionId=1 */
router.get('/messages', async (req, res) => {
  try {
    const pool = db(req);
    const { sessionId } = req.query;
    const [rows] = await pool.query(
      `SELECT id, role, content, created_at
         FROM chat_messages
        WHERE session_id=?
        ORDER BY created_at ASC`, [Number(sessionId)]
    );
    res.json(rows);
  } catch (e) {
    console.error(e); res.status(500).json({ message: '서버 오류' });
  }
});

/** 4) LLM 호출 + 메시지 저장: POST /api/chat
 * body: { username, sessionId?, message }
 * res : { reply, sessionId, citations? }
 */
router.post('/', async (req, res) => {
  try {
    const pool = db(req);
    const { username, sessionId: sessionIdRaw, message } = req.body || {};
    if (!message) return res.status(400).json({ message: 'message는 필수입니다.' });

    // 4-1) 사용자 확인
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패' });

    // 4-2) 세션 준비 (없으면 새로 생성)
    let sessionId = Number(sessionIdRaw) || null;
    if (!sessionId) {
      const [r] = await pool.query(
        'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
        [userId, null]
      );
      sessionId = r.insertId;
    }

    // 4-3) 사용자 메시지 저장
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?, "user", ?)',
      [sessionId, message]
    );

    // 4-4) Perplexity 호출
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'missing_api_key' });

    const payload = {
      model: 'sonar-pro',
      messages: [{ role: 'user', content: message }],
      max_tokens: 1024,
      temperature: 0.2,
    };

    // Node 18+ 내장 fetch 사용
    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content ?? '(응답 없음)';
    const citations = data?.citations ?? [];

    // 4-5) 어시스턴트 메시지 저장 + 세션 갱신
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?, "assistant", ?)',
      [sessionId, answer]
    );
    await pool.query('UPDATE chat_sessions SET updated_at=NOW() WHERE id=?', [sessionId]);

    res.json({ reply: answer, citations, sessionId });
  } catch (e) {
    console.error('❌ Chat Error:', e);
    res.status(500).json({ message: 'chat_failed', detail: e.message });
  }
});

/** 5) 세션 삭제: DELETE /api/chat/sessions/:id */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const pool = db(req);
    const id = Number(req.params.id);
    await pool.query('DELETE FROM chat_sessions WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e); res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
