// server/routes/bookmarks.js
const express = require('express');
const router = express.Router();

function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool not set');
  return pool;
}

async function getUserIdByUsername(pool, username) {
  if (!username) return null;
  const [rows] = await pool.query(
    'SELECT id FROM users WHERE username=? OR email=?',
    [username, username]
  );
  return rows?.[0]?.id ?? null;
}

/* ──────────────────────────────────────────────────────────
   유틸: 문자열/링크 정규화 (중복 판정 일관성)
   - title: 앞뒤 공백 제거
   - link : URL 유효하면 호스트/프로토콜/경로 기준으로 정규화
            (해시 제거, 쿼리 스트립(utm 계열은 제거), 말미 슬래시 통일)
   ────────────────────────────────────────────────────────── */
function normalizeTitle(s) {
  return (typeof s === 'string' ? s.trim() : '');
}
function normalizeLink(s) {
  const raw = (typeof s === 'string' ? s.trim() : '');
  if (!raw) return '';
  try {
    const u = new URL(raw);
    // 해시 제거
    u.hash = '';
    // utm, gclid 등 추적 파라미터 제거
    const params = u.searchParams;
    const rm = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','igshid'];
    rm.forEach(k => params.delete(k));
    u.search = params.toString() ? `?${params.toString()}` : '';
    // 경로 말미 슬래시 정리(루트는 그대로)
    if (u.pathname.endsWith('/') && u.pathname !== '/') {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    // 호스트 소문자
    u.hostname = u.hostname.toLowerCase();
    // 최종
    return u.toString();
  } catch {
    return raw; // URL 파싱 실패 시 원문 비교로 폴백
  }
}

/** 목록 조회: GET /api/bookmarks?username=user1 */
router.get('/', async (req, res) => {
  try {
    const pool = db(req);
    const { username } = req.query;
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패 또는 사용자 없음' });

    const [rows] = await pool.query(
      `SELECT
         id, title, category, description, source, link,
         DATE_FORMAT(deadline,'%Y-%m-%d')   AS deadline,
         DATE_FORMAT(saved_at,'%Y-%m-%d')   AS savedDate,
         notification_enabled               AS notificationEnabled
       FROM bookmarks
       WHERE user_id=?
       ORDER BY COALESCE(deadline,'9999-12-31') ASC, id DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/** 추가: POST /api/bookmarks
 *  body: { user_id? , username? , title, category?, description?, source?, link?, deadline? }
 *  ✅ 중복 방지 규칙
 *   - link가 있으면 (user_id, normalized(link))로 중복 판단
 *   - link가 없으면 (user_id, normalized(title))로 중복 판단
 */

router.post('/', async (req, res) => {
  try {
    const pool = db(req);
    let {
      user_id,
      username,
      title,
      category,
      description,
      source,
      link,
      deadline,
    } = req.body || {};

    if (!user_id) user_id = await getUserIdByUsername(pool, username);
    if (!user_id) return res.status(401).json({ message: '인증 실패' });

    const nTitle = normalizeTitle(title);
    const nLink  = normalizeLink(link);
    if (!nTitle) return res.status(400).json({ message: 'title은 필수입니다.' });

    // ── 중복 탐지 (user_id + title + link 기준)
    const [dups] = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id=? AND title=? AND link=? LIMIT 1',
      [user_id, nTitle, nLink || null]
    );

    if (dups.length > 0) {
      return res.status(409).json({
        message: '이미 즐겨찾기에 저장된 항목입니다.',
        id: dups[0].id,
      });
    }

    // ── 저장
    const [r] = await pool.query(
      `INSERT INTO bookmarks
       (user_id, title, category, description, source, link, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        nTitle,
        category || null,
        description || null,
        (source || null),
        (nLink || null),
        deadline || null,
      ]
    );

    res.status(201).json({ id: r.insertId, message: '즐겨찾기에 저장되었습니다.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});


/** 알림 토글: PATCH /api/bookmarks/:id { notificationEnabled: boolean } */
router.patch('/:id', async (req, res) => {
  try {
    const pool = db(req);
    const id = Number(req.params.id);
    const { notificationEnabled } = req.body || {};
    await pool.query(
      'UPDATE bookmarks SET notification_enabled=? WHERE id=?',
      [notificationEnabled ? 1 : 0, id]
    );
    res.json({ message: '알림 설정이 변경되었습니다.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/** 삭제 */
router.delete('/:id', async (req, res) => {
  try {
    const pool = db(req);
    const id = Number(req.params.id);
    await pool.query('DELETE FROM bookmarks WHERE id=?', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
// server/routes/bookmarks.js