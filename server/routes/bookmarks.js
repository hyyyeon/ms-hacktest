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
  const [rows] = await pool.query('SELECT id FROM users WHERE username=? OR email=?', [username, username]);
  return rows?.[0]?.id ?? null;
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

/** 추가: POST /api/bookmarks */
router.post('/', async (req, res) => {
  try {
    const pool = db(req);
    let { user_id, username, title, category, description, source, link, deadline } = req.body || {};
    if (!user_id) user_id = await getUserIdByUsername(pool, username);
    if (!user_id) return res.status(401).json({ message: '인증 실패' });
    if (!title)   return res.status(400).json({ message: 'title은 필수입니다.' });

    const [r] = await pool.query(
      `INSERT INTO bookmarks
       (user_id, title, category, description, source, link, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, category || null, description || null, source || null, link || null, deadline || null]
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
