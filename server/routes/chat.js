// server/routes/chat.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

/* DB 풀 */
function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool not set');
  return pool;
}

/* username → user_id */
async function getUserIdByUsername(pool, username) {
  if (!username) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=?', [username]);
  return rows?.[0]?.id ?? null;
}

/* 안전 문자열 */
function safeText(s, fallback = '') {
  return typeof s === 'string' && s.trim() ? s.trim() : fallback;
}

/* LLM 응답 파싱 */
function parseLLMAnswer(data) {
  const candidates = [
    data?.choices?.[0]?.message?.content,
    data?.choices?.[0]?.text,
    data?.output_text,
    data?.reply,
  ];
  const answer = candidates.find(v => typeof v === 'string' && v.trim());
  return answer ? answer.trim() : null;
}

/** 세션 목록 */
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
    console.error('[sessions:error]', e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/** 특정 세션 메시지 */
router.get('/messages', async (req, res) => {
  try {
    const pool = db(req);
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ message: 'sessionId는 필수입니다.' });

    const [rows] = await pool.query(
      `SELECT id, role, content, created_at
         FROM chat_messages
        WHERE session_id=?
        ORDER BY created_at ASC`, [Number(sessionId)]
    );
    res.json(rows);
  } catch (e) {
    console.error('[messages:list:error]', e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/** 채팅 */
router.post('/', async (req, res) => {
  try {
    const pool = db(req);
    const { username, sessionId: sessionIdRaw, message } = req.body || {};
    const userMsg = safeText(message);
    if (!userMsg) return res.status(400).json({ message: 'message는 필수입니다.' });

    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패' });

    let sessionId = Number(sessionIdRaw) || null;
    if (!sessionId) {
      const [r] = await pool.query(
        'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
        [userId, null]
      );
      sessionId = r.insertId;
    }

    await pool.query('INSERT INTO chat_messages (session_id, role, content) VALUES (?, "user", ?)',
      [sessionId, userMsg]);

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('[chat:error] missing_api_key');
      return res.status(500).json({ reply: '(서버 설정 오류: API 키 없음)', sessionId, citations: [] });
    }

    const payload = {
      model: 'sonar-pro',
      messages: [{ role: 'user', content: userMsg }],
      max_tokens: 1024,
      temperature: 0.2,
    };

    const llmRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => '(no body)');
      console.error('[chat:llmErr]', llmRes.status, errText);
      const msg =
        llmRes.status === 401 || llmRes.status === 403 ? '(외부 API 인증 오류)' :
        llmRes.status === 429 ? '(외부 API 사용량 초과/속도 제한)' : '(외부 API 오류)';
      await pool.query('INSERT INTO chat_messages (session_id, role, content) VALUES (?, "assistant", ?)',
        [sessionId, msg]);
      await pool.query('UPDATE chat_sessions SET updated_at=NOW() WHERE id=?', [sessionId]);
      return res.status(502).json({ reply: msg, sessionId, citations: [] });
    }

    const data = await llmRes.json().catch(() => ({}));
    const answer0 = parseLLMAnswer(data);
    const answer = safeText(answer0, '(API 응답 파싱 실패: 응답 구조가 예상과 다릅니다)');
    const citations = Array.isArray(data?.citations) ? data.citations : []; // ✅ 반드시 정의

    await pool.query('INSERT INTO chat_messages (session_id, role, content) VALUES (?, "assistant", ?)',
      [sessionId, answer]);
    await pool.query('UPDATE chat_sessions SET updated_at=NOW() WHERE id=?', [sessionId]);

    res.json({ reply: answer, citations, sessionId });
  } catch (e) {
    console.error('❌ Chat Error:', e);
    res.status(500).json({ reply: '(서버 내부 오류로 응답 실패)', detail: e.message, citations: [] });
  }
});

/** 세션 삭제 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const pool = db(req);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: '유효한 세션 ID가 필요합니다.' });
    await pool.query('DELETE FROM chat_sessions WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[sessions:delete:error]', e);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
// server/routes/chat.js