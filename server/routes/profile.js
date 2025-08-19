// server/routes/profile.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');


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

// 최신 프로필 한 번에 가져오기 (이메일 + 날짜포맷 포함)
async function fetchProfile(pool, userId) {
  const [rows] = await pool.query(
    `SELECT
       u.id AS user_id,
       u.email,
       up.name,
       up.phone,
       up.industry_id,
       up.region_id,
       up.employee_band_id,
       DATE_FORMAT(up.start_date, '%Y-%m-%d') AS start_date,
       up.updated_at,
       i.name   AS industry_name,
       r.name   AS region_name,
       eb.label AS employee_band_name
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     LEFT JOIN industries     i ON i.id = up.industry_id
     LEFT JOIN regions        r ON r.id = up.region_id
     LEFT JOIN employee_bands eb ON eb.id = up.employee_band_id
     WHERE u.id=? LIMIT 1`,
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

function isBcryptHash(s) {
  return typeof s === 'string' && /^\$2[aby]\$/.test(s);
}

router.put('/password', async (req, res) => {
  try {
    const pool = db(req);
    const { username, currentPassword, newPassword } = req.body || {};
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'bad_request' });
    }

    const userId = await getUserId(pool, username);
    if (!userId) return res.status(404).json({ message: 'user_not_found' });

    // 현재 저장 비번(해시 또는 평문) 읽기 — password 컬럼만 사용
    const [urows] = await pool.query(
      'SELECT id, password FROM users WHERE id=?',
      [userId]
    );
    const u = urows?.[0];
    const stored = u?.password || '';
    if (!stored) return res.status(400).json({ message: 'no_password_set' });

    // 1) 현재 비번 검증
    let ok = false;
    if (isBcryptHash(stored)) {
      ok = await bcrypt.compare(currentPassword, stored);
    } else {
      ok = (currentPassword === stored);
      if (ok) {
        // 평문 → 해시 즉시 마이그레이션
        const migrated = await bcrypt.hash(currentPassword, 10);
await pool.query('UPDATE users SET password=? WHERE id=?', [migrated, userId]);

      }
    }
    if (!ok) return res.status(401).json({ message: 'invalid_current_password' });

    // 2) 새 비번이 기존과 동일 방지
    if (isBcryptHash(stored)) {
      const same = await bcrypt.compare(newPassword, stored);
      if (same) return res.status(409).json({ message: 'same_password' });
    } else {
      if (newPassword === stored) return res.status(409).json({ message: 'same_password' });
    }

    // 4) 새 비번 저장(해시)
    const newHash = await bcrypt.hash(newPassword, 10);
await pool.query('UPDATE users SET password=? WHERE id=?', [newHash, userId]);

    res.json({ ok: true });
  } catch (e) {
    console.error('password change error:', e);
    res.status(500).json({ message: 'password_change_failed', detail: e.message });
  }
});


// 메타(드롭다운 옵션) 제공: 업종 / 지역 / 종업원수 구간
router.get('/meta', async (req, res) => {
  try {
    const pool = db(req);
    const [industries]    = await pool.query('SELECT id, name FROM industries ORDER BY name');
    const [regions]       = await pool.query('SELECT id, name FROM regions ORDER BY id');
    const [employeeBands] = await pool.query('SELECT id, label, min_n, max_n FROM employee_bands ORDER BY id');
    res.json({ industries, regions, employeeBands });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'meta_fetch_failed', detail: e.message });
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