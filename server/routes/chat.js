// server/routes/chat.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

/* =========================================
 * 비회원용 임시 세션 저장소 (메모리)
 * - 프로세스 재시작 시 초기화되는 임시 저장소
 * - 구조: { id, title, created_at, updated_at, messages: [{role, content, created_at}] }
 * ========================================= */
const memorySessions = new Map();

/* ---------- 공통 유틸 ---------- */
function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool not set');
  return pool;
}

async function getUserIdByUsername(pool, username) {
  if (!username) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=? OR email=?', [username, username]);
  return rows?.[0]?.id ?? null;
}

function safeText(s, fallback = '') {
  return typeof s === 'string' && s.trim() ? s.trim() : fallback;
}

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

function mkTitleFrom(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > 40 ? t.slice(0, 40) + '…' : t || '새 대화';
}

/* =========================================
 * 세션 목록 (회원=DB / 비회원=메모리)
 *  - /api/chat/sessions?username=foo (회원)
 *  - /api/chat/sessions           (비회원)
 * ========================================= */
router.get('/sessions', async (req, res) => {
  try {
    const pool = db(req);
    const { username, limit = 20 } = req.query;

    // 비로그인 → 메모리 세션 목록
    if (!username) {
      const sessions = Array.from(memorySessions.values())
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, Number(limit))
        .map(s => ({ id: s.id, title: s.title, created_at: s.created_at, updated_at: s.updated_at }));
      return res.json(sessions);
    }

    // 로그인 → DB 세션 목록
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패' });

    const [rows] = await pool.query(
      `SELECT id, title, created_at, updated_at
         FROM chat_sessions
        WHERE user_id=?
        ORDER BY updated_at DESC
        LIMIT ?`,
      [userId, Number(limit)]
    );
    res.json(rows);
  } catch (e) {
    console.error('[sessions:error]', e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/* =========================================
 * 특정 세션 메시지 (회원=DB / 비회원=메모리)
 *  - /api/chat/messages?sessionId=123&username=foo
 *  - /api/chat/messages?sessionId=123            (guest)
 * ========================================= */
router.get('/messages', async (req, res) => {
  try {
    const pool = db(req);
    const { sessionId, username } = req.query;
    if (!sessionId) return res.status(400).json({ message: 'sessionId는 필수입니다.' });

    // 비로그인 → 메모리
    if (!username) {
      const s = memorySessions.get(Number(sessionId));
      if (!s) return res.status(404).json({ message: '세션을 찾을 수 없습니다. (guest)' });
      return res.json(s.messages);
    }

    // 로그인 → DB
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패' });

    // 세션 소유권 확인 (보안)
    const [own] = await pool.query('SELECT id FROM chat_sessions WHERE id=? AND user_id=?', [Number(sessionId), userId]);
    if (own.length === 0) return res.status(404).json({ message: '세션을 찾을 수 없습니다.' });

    const [rows] = await pool.query(
      `SELECT id, role, content, created_at
         FROM chat_messages
        WHERE session_id=?
        ORDER BY created_at ASC`,
      [Number(sessionId)]
    );
    res.json(rows);
  } catch (e) {
    console.error('[messages:list:error]', e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/* =========================================
 * 채팅 전송 (회원=DB / 비회원=메모리)
 * body: { username?, sessionId?, message }
 * ========================================= */
router.post('/', async (req, res) => {
  try {
    const pool = db(req);
    const { username, sessionId: sessionIdRaw, message, history: clientHistory } = req.body || {};
    const userMsg = safeText(message);
    if (!userMsg) return res.status(400).json({ message: 'message는 필수입니다.' });

    let sessionId = Number(sessionIdRaw) || null;

    /* ----- 로그인 사용자(=DB) ----- */
    if (username) {
      const userId = await getUserIdByUsername(pool, username);
      if (!userId) return res.status(401).json({ message: '인증 실패' });

      if (!sessionId) {
        const [r] = await pool.query(
          'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
          [userId, mkTitleFrom(userMsg)]
        );
        sessionId = r.insertId;
      }

      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES (?, "user", ?)',
        [sessionId, userMsg]
      );
    }
    /* ----- 비로그인 사용자(=메모리) ----- */
    else {
      if (!sessionId) {
        sessionId = Date.now();
        memorySessions.set(sessionId, {
          id: sessionId,
          title: mkTitleFrom(userMsg),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: []
        });
      }
      if (!memorySessions.has(sessionId)) {
        memorySessions.set(sessionId, {
          id: sessionId,
          title: mkTitleFrom(userMsg),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: []
        });
      }
      const s = memorySessions.get(sessionId);
      s.messages.push({ role: 'user', content: userMsg, created_at: new Date().toISOString() });
      s.updated_at = new Date().toISOString();
    }

    // ── LLM 호출
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('[chat:error] missing_api_key');
      return res.status(500).json({ reply: '(서버 설정 오류: API 키 없음)', sessionId, citations: [] });
    }

// === 히스토리 구성 ===
    let history = [];
    // 1) 프론트에서 보낸 compact history가 있으면 우선 사용 (최근 N개만 신뢰)
    if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      history = clientHistory
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-12);
      // 현재 질문을 맨 뒤에 추가 (clientHistory에는 직전까지만 들어있음)
      history.push({ role: 'user', content: userMsg });
    } else if (sessionId) {
      // 2) 프론트 히스토리가 없으면 서버 저장 이력으로 복원
      if (username) {
        // 로그인: DB에서 세션 이력 로드 (이미 방금 userMsg가 INSERT 됨)
        const [rows] = await pool.query(
          `SELECT role, content
             FROM chat_messages
            WHERE session_id=?
            ORDER BY created_at ASC
            LIMIT 20`,
          [sessionId]
        );
        history = rows.map(r => ({ role: r.role, content: r.content || '' }));
      } else {
        // 비로그인: 메모리 세션에서 이력 로드 (이미 방금 userMsg가 push 됨)
        const s = memorySessions.get(sessionId);
        if (s) history = s.messages.map(m => ({ role: m.role, content: m.content || '' })).slice(-20);
      }
    } else {
      // 3) 신규 세션이면서 프론트 히스토리도 없는 경우
      history = [{ role: 'user', content: userMsg }];
    }

    const payload = {
      model: 'sonar-pro',
      messages: history,
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

      // 회원: DB 기록
      if (username) {
        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES (?, "assistant", ?)',
          [sessionId, msg]
        );
        await pool.query('UPDATE chat_sessions SET updated_at=NOW() WHERE id=?', [sessionId]);
      } else {
        // 비회원: 메모리 기록
        const s = memorySessions.get(sessionId);
        if (s) {
          s.messages.push({ role: 'assistant', content: msg, created_at: new Date().toISOString() });
          s.updated_at = new Date().toISOString();
        }
      }

      return res.status(502).json({ reply: msg, sessionId, citations: [] });
    }

    const data = await llmRes.json().catch(() => ({}));
    const answer0 = parseLLMAnswer(data);
    const answer = safeText(answer0, '(API 응답 파싱 실패: 응답 구조가 예상과 다릅니다)');
    const citations = Array.isArray(data?.citations) ? data.citations : [];

    // 회원: DB 기록
    if (username) {
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES (?, "assistant", ?)',
        [sessionId, answer]
      );
      await pool.query('UPDATE chat_sessions SET updated_at=NOW(), title=COALESCE(title, ?) WHERE id=?', [mkTitleFrom(userMsg), sessionId]);
    } else {
      // 비회원: 메모리 기록
      const s = memorySessions.get(sessionId);
      if (s) {
        s.messages.push({ role: 'assistant', content: answer, created_at: new Date().toISOString() });
        s.updated_at = new Date().toISOString();
      }
    }

    res.json({ reply: answer, citations, sessionId });
  } catch (e) {
    console.error('❌ Chat Error:', e);
    res.status(500).json({ reply: '(서버 내부 오류로 응답 실패)', detail: e.message, citations: [] });
  }
});

/* =========================================
 * 세션 삭제 (회원=DB / 비회원=메모리)
 *  - DELETE /api/chat/sessions/:id            (guest)
 *  - DELETE /api/chat/sessions/:id?username=foo (member)
 * ========================================= */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const pool = db(req);
    const { username } = req.query;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: '유효한 세션 ID가 필요합니다.' });

    // 비회원 → 메모리에서 삭제
    if (!username) {
      if (memorySessions.has(id)) {
        memorySessions.delete(id);
        return res.json({ ok: true, message: '세션이 삭제되었습니다. (guest)' });
      }
      return res.status(404).json({ message: '세션을 찾을 수 없습니다. (guest)' });
    }

    // 회원 → DB에서 삭제 (소유권 확인)
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패' });

    const [own] = await pool.query('SELECT id FROM chat_sessions WHERE id=? AND user_id=?', [id, userId]);
    if (own.length === 0) return res.status(404).json({ message: '세션을 찾을 수 없습니다.' });

    await pool.query('DELETE FROM chat_sessions WHERE id=?', [id]); // FK ON DELETE CASCADE라 messages 자동삭제
    res.json({ ok: true, message: '세션이 삭제되었습니다. (DB)' });
  } catch (e) {
    console.error('[sessions:delete:error]', e);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
// server/routes/chat.js