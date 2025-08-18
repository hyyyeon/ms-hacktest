// server/routes/profile.js
const express = require('express');
const router = express.Router();

function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool not set');
  return pool;
}

async function getUserId(pool, username) {
  const [r] = await pool.query(
    'SELECT id FROM users WHERE username=? OR email=?',
    [username, username]
  );
  return r?.[0]?.id || null;
}

// 최신 프로필 한 번에 가져오는 헬퍼
async function fetchProfile(pool, userId) {
  const [rows] = await pool.query(
    `SELECT up.user_id, up.name, up.phone, up.industry_id, up.region_id, up.employee_band_id, up.start_date, up.updated_at,
            i.name   AS industry_name,
            r.name   AS region_name,
            eb.label AS employee_band_name
       FROM user_profiles up
       LEFT JOIN industries     i ON i.id = up.industry_id
       LEFT JOIN regions        r ON r.id = up.region_id
       LEFT JOIN employee_bands eb ON eb.id = up.employee_band_id
      WHERE up.user_id=?`,
    [userId]
  );
  return rows[0] || null;
}

/** GET /api/profile?username=... */
router.get('/', async (req, res) => {
  try {
    const pool = db(req);
    const { username } = req.query;
    if (!username) return res.status(400).json({ message: 'username 필요' });

    const userId = await getUserId(pool, username);
    if (!userId) return res.status(404).json({ message: '유저 없음' });

    const profile = await fetchProfile(pool, userId);
    res.json(profile);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'profile_fetch_failed', detail: e.message });
  }
});

/** PUT /api/profile
 *  body: { username, name, phone, industry_id, region_id, employee_band_id, start_date }
 *  저장/업데이트 후 최신 프로필 반환
 */
router.put('/', async (req, res) => {
  try {
    const pool = db(req);
    const {
      username,
      name,
      phone,
      industry_id,
      region_id,
      employee_band_id,
      start_date,
    } = req.body || {};
    if (!username) return res.status(400).json({ message: 'username 필요' });

    const userId = await getUserId(pool, username);
    if (!userId) return res.status(404).json({ message: '유저 없음' });

    // 존재 여부 확인
    const [exists] = await pool.query(
      'SELECT user_id FROM user_profiles WHERE user_id=?',
      [userId]
    );

    if (exists.length === 0) {
      await pool.query(
        `INSERT INTO user_profiles
         (user_id, name, phone, industry_id, region_id, employee_band_id, start_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          name || null,
          phone || null,
          industry_id || null,
          region_id || null,
          employee_band_id || null,
          start_date || null,
        ]
      );
    } else {
      await pool.query(
        `UPDATE user_profiles
            SET name=?,
                phone=?,
                industry_id=?,
                region_id=?,
                employee_band_id=?,
                start_date=?,
                updated_at=NOW()
          WHERE user_id=?`,
        [
          name || null,
          phone || null,
          industry_id || null,
          region_id || null,
          employee_band_id || null,
          start_date || null,
          userId,
        ]
      );
    }

    // ✅ 최신 프로필 반환
    const profile = await fetchProfile(pool, userId);
    res.json({ ok: true, profile });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'profile_update_failed', detail: e.message });
  }
});

module.exports = router;