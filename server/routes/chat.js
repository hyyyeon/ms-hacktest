// server/routes/chat.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

/** ─────────────────────────────
 * 공통: MySQL 풀 꺼내기
 * app.js / index.js 에서 app.set('db', pool) 되어 있어야 함
 * ───────────────────────────── */
function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool not set');
  return pool;
}

/** username → user_id (임시 인증 대용) */
async function getUserIdByUsername(pool, username) {
  if (!username) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=?', [username]);
  return rows?.[0]?.id ?? null;
}

/** 안전 문자열 가드 */
function safeText(s, fallback = '') {
  return typeof s === 'string' && s.trim() ? s.trim() : fallback;
}

/** LLM 응답 파싱(다중 포맷 대응) */
function parseLLMAnswer(data) {
  const candidates = [
    data?.choices?.[0]?.message?.content, // Perplexity/OpenAI chat
    data?.choices?.[0]?.text,             // 일부 모델의 text 필드
    data?.output_text,                     // OpenAI Responses API 등
    data?.reply,                           // 커스텀 백엔드
  ];
  const answer = candidates.find(v => typeof v === 'string' && v.trim());
  return answer ? answer.trim() : null;
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
    console.error('[sessions:error]', e);
    res.status(500).json({ message: '서버 오류' });
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
      [userId, safeText(title, null)]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error('[sessions:create:error]', e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/** 3) 특정 세션 메시지: GET /api/chat/messages?sessionId=1 */
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

/** 4) LLM 호출 + 메시지 저장: POST /api/chat
 * body: { username, sessionId?, message }
 * res : { reply, sessionId, citations? }
 */
router.post('/', async (req, res) => {
  try {
    const pool = db(req);
    const { username, sessionId: sessionIdRaw, message } = req.body || {};
    const userMsg = safeText(message);
    if (!userMsg) return res.status(400).json({ message: 'message는 필수입니다.' });

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
      [sessionId, userMsg]
    );

    // 4-4) Perplexity 호출
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('[chat:error] missing_api_key');
      return res.status(500).json({ reply: '(서버 설정 오류: API 키 없음)', sessionId });
    }

    const payload = {
      model: 'sonar-pro',
      messages: [{ role: 'user', content: userMsg }],
      max_tokens: 1024,
      temperature: 0.2,
    };

    const llmRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // 상태 코드 및 본문 로깅(에러 시)
    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => '(no body)');
      console.error('[chat:llmErr]', llmRes.status, errText);
      const msg =
        llmRes.status === 401 || llmRes.status === 403
          ? '(외부 API 인증 오류)'
          : llmRes.status === 429
          ? '(외부 API 사용량 초과/속도 제한)'
          : '(외부 API 오류)';
      // 어시스턴트 저장(원하면 주석 해제)
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES (?, "assistant", ?)',
        [sessionId, msg]
      );
      await pool.query('UPDATE chat_sessions SET updated_at=NOW() WHERE id=?', [sessionId]);
      return res.status(502).json({ reply: msg, sessionId });
    }

    const data = await llmRes.json().catch(() => ({}));
    console.log('[chat:raw]', JSON.stringify(data, null, 2));

    const answer0 = parseLLMAnswer(data);
    //Perplexity 응답 전체(JSON)를 터미널에 찍기
//    const citations = Array.isArray(data?.citations) ? data.citations : [];

    const answer = safeText(
      answer0,
      '(API 응답 파싱 실패: 응답 구조가 예상과 다릅니다)'
    );

    // 4-5) 어시스턴트 메시지 저장 + 세션 갱신
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?, "assistant", ?)',
      [sessionId, answer]
    );
    await pool.query('UPDATE chat_sessions SET updated_at=NOW() WHERE id=?', [sessionId]);

    res.json({ reply: answer, citations, sessionId });
  } catch (e) {
    console.error('❌ Chat Error:', e);
    // 치명적 서버 오류일 때도 사용자에게 최소한의 안내 제공
    res.status(500).json({ reply: '(서버 내부 오류로 응답 실패)', detail: e.message });
  }
});

/** 5) 세션 삭제: DELETE /api/chat/sessions/:id */
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
