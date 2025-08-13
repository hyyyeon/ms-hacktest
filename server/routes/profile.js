// server/routes/profile.js
// 마이페이지 전용 라우터 (보안 최소 버전: JWT 없이 동작)
// - DB 풀은 app.set('db')로 주입되어 있다고 가정
// - users(id, username, email, password)
// - user_profiles(user_id, name, phone, industry_id, region_id, employee_band_id, start_date)
// - industries / regions / employee_bands (드롭다운 마스터)

const express = require('express');
const router = express.Router();

// 공통: DB 풀 얻기
function db(req) {
  const pool = req.app.get('db');
  if (!pool) throw new Error('MySQL pool (app.set("db")) 이 설정되어 있지 않습니다.');
  return pool;
}

// 유틸: username -> user_id (임시 인증/매핑용)
async function getUserIdByUsername(pool, username) {
  if (!username) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  return rows?.[0]?.id ?? null;
}

/* -------------------------------------------
 * 0) 드롭다운 목록 (업종/지역/종업원수)
 * ----------------------------------------- */
// 프론트 최초 로딩용: /profile/meta
router.get('/meta', async (req, res) => {
  try {
    const pool = db(req);
    const [industries]   = await pool.query('SELECT id, name  FROM industries ORDER BY name');
    const [regions]      = await pool.query('SELECT id, name  FROM regions    ORDER BY name');
    const [employeeBands]= await pool.query('SELECT id, label FROM employee_bands ORDER BY COALESCE(min_n, 999999), label');

    res.json({ industries, regions, employeeBands });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/* -------------------------------------------
 * 1) 내 프로필 조회 (username으로) - 편의 엔드포인트
 *    예: GET /profile/me?username=user1
 * ----------------------------------------- */
router.get('/me', async (req, res) => {
  try {
    const pool = db(req);
    const { username } = req.query;
    const userId = await getUserIdByUsername(pool, username);
    if (!userId) return res.status(401).json({ message: '인증 실패 또는 사용자 없음' });

    // 조인 결과(라벨 포함) + 원본 id값도 함께 반환
    const [[row]] = await pool.query(
      `SELECT
         u.id AS user_id, u.username, u.email,
         p.name, p.phone, p.industry_id, p.region_id, p.employee_band_id, p.start_date, p.updated_at,
         i.name  AS industry_name,
         r.name  AS region_name,
         eb.label AS employee_band_label
       FROM users u
       LEFT JOIN user_profiles p       ON p.user_id = u.id
       LEFT JOIN industries i          ON i.id = p.industry_id
       LEFT JOIN regions r             ON r.id = p.region_id
       LEFT JOIN employee_bands eb     ON eb.id = p.employee_band_id
       WHERE u.id = ?`,
      [userId]
    );

    // 날짜 포맷 보정(YYYY-MM-DD)
    const toDateStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d || null));
    if (row) row.start_date = toDateStr(row.start_date);

    res.json(row || { user_id: userId, username, email: null, name: null, phone: null, industry_id: null, region_id: null, employee_band_id: null, start_date: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/* -------------------------------------------
 * 2) 특정 유저 프로필 조회 (id 기반)
 *    예: GET /profile/3
 * ----------------------------------------- */
router.get('/:id', async (req, res) => {
  try {
    const pool = db(req);
    const userId = Number(req.params.id);

    const [[row]] = await pool.query(
      `SELECT
         u.id AS user_id, u.username, u.email,
         p.name, p.phone, p.industry_id, p.region_id, p.employee_band_id, p.start_date, p.updated_at,
         i.name  AS industry_name,
         r.name  AS region_name,
         eb.label AS employee_band_label
       FROM users u
       LEFT JOIN user_profiles p       ON p.user_id = u.id
       LEFT JOIN industries i          ON i.id = p.industry_id
       LEFT JOIN regions r             ON r.id = p.region_id
       LEFT JOIN employee_bands eb     ON eb.id = p.employee_band_id
       WHERE u.id = ?`,
      [userId]
    );

    const toDateStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d || null));
    if (row) row.start_date = toDateStr(row.start_date);

    if (!row) return res.status(404).json({ message: '사용자 없음' });
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/* -------------------------------------------
 * 3) 신규 프로필 생성 (POST /profile)
 *    body: { user_id, name, phone, industry_id, region_id, employee_band_id, start_date(YYYY-MM-DD) }
 * ----------------------------------------- */
router.post('/', async (req, res) => {
  try {
    const pool = db(req);
    const { user_id, name, phone, industry_id, region_id, employee_band_id, start_date } = req.body || {};

    if (!user_id) return res.status(400).json({ message: 'user_id 필수' });

    await pool.query(
      `INSERT INTO user_profiles
         (user_id, name, phone, industry_id, region_id, employee_band_id, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, name || null, phone || null, industry_id || null, region_id || null, employee_band_id || null, start_date || null]
    );

    res.status(201).json({ message: '프로필 생성 완료' });
  } catch (e) {
    // 중복키(이미 존재)인 경우 가이드
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 프로필이 존재합니다. PUT /profile/:id 사용' });
    }
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});

/* -------------------------------------------
 * 4) 프로필 수정(업서트 느낌으로) PUT /profile/:id
 *    body: { name, phone, industry_id, region_id, employee_band_id, start_date, email? }
 *    - email이 있으면 users.email도 같이 업데이트(옵션)
 * ----------------------------------------- */
router.put('/:id', async (req, res) => {
  try {
    const pool = db(req);
    const userId = Number(req.params.id);
    const { name, phone, industry_id, region_id, employee_band_id, start_date, email } = req.body || {};

    // 이메일 변경(선택)
    if (email) {
      try {
        await pool.query('UPDATE users SET email=? WHERE id=?', [email, userId]);
      } catch (ex) {
        if (ex.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
        }
        throw ex;
      }
    }

    // 프로필 업서트(있으면 UPDATE, 없으면 INSERT)
    const [r] = await pool.query('SELECT 1 FROM user_profiles WHERE user_id=? LIMIT 1', [userId]);
    if (r.length === 0) {
      await pool.query(
        `INSERT INTO user_profiles
           (user_id, name, phone, industry_id, region_id, employee_band_id, start_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, name || null, phone || null, industry_id || null, region_id || null, employee_band_id || null, start_date || null]
      );
    } else {
      await pool.query(
        `UPDATE user_profiles
           SET name=?, phone=?, industry_id=?, region_id=?, employee_band_id=?, start_date=?
         WHERE user_id=?`,
        [name || null, phone || null, industry_id || null, region_id || null, employee_band_id || null, start_date || null, userId]
      );
    }

    res.json({ message: '프로필 수정 완료' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});


/* -------------------------------------------
 * 5) 비밀번호 변경 (현재 비밀번호 검증 추가)
 * ----------------------------------------- */
router.patch('/password/:id', async (req, res) => {
  try {
    const pool = db(req);
    const userId = Number(req.params.id);
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword와 newPassword가 필요합니다.' });
    }

    // 1) 현재 비밀번호 확인
    const [[user]] = await pool.query('SELECT password FROM users WHERE id=?', [userId]);
    if (!user) return res.status(404).json({ message: '사용자 없음' });
    if (user.password !== currentPassword) {
      return res.status(401).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
    }

    // 2) 새 비밀번호로 업데이트
    await pool.query('UPDATE users SET password=? WHERE id=?', [newPassword, userId]);
    res.json({ message: '비밀번호 변경 완료' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: '서버 오류' });
  }
});


module.exports = router;
