// src/pages/MyPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/MyPage.css";

const API = ((process.env.REACT_APP_API_BASE || "http://localhost:3001").replace(/\/$/, "")) + "/api";

export default function MyPage() {
  const username = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}")?.username || ""; }
    catch { return ""; }
  }, []);

  const [industries, setIndustries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [bands, setBands] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    industry_id: "",
    region_id: "",
    employee_band_id: "",
    start_date: "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" }); // ✅ 복구
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false); // 비번 변경 로딩

  // 프로필 불러오기
  const loadProfile = async () => {
    if (!username) { setLoading(false); return; }
    const res = await fetch(`${API}/profile?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const me = await res.json();
    setForm({
      name: me?.name || "",
      email: "", // user_profiles에 없을 수 있어 표시만 유지
      phone: me?.phone || "",
      industry_id: me?.industry_id || "",
      region_id: me?.region_id || "",
      employee_band_id: me?.employee_band_id || "",
      start_date: me?.start_date || "",
    });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // (옵션) 메타 시도
        try {
          const metaRes = await fetch(`${API}/profile/meta`);
          if (metaRes.ok) {
            const meta = await metaRes.json();
            if (!alive) return;
            setIndustries(meta.industries || []);
            setRegions(meta.regions || []);
            setBands(meta.employeeBands || []);
          }
        } catch {}
        await loadProfile();
      } catch (e) {
        console.error(e);
        alert("프로필을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 저장 → 서버가 최신 profile 반환 → 폼 반영
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!username) return alert("로그인이 필요합니다.");
    setSaving(true);
    try {
      const payload = {
        username,
        name: (form.name || '').trim() || null,
        email: (form.email || '').trim() || null, // 서버에서 무시 가능
        phone: (form.phone || '').trim() || null,
        industry_id: form.industry_id ? Number(form.industry_id) : null,
        region_id: form.region_id ? Number(form.region_id) : null,
        employee_band_id: form.employee_band_id ? Number(form.employee_band_id) : null,
        start_date: (form.start_date || '').trim() || null,
      };
      const res = await fetch(`${API}/profile`, {
        method: "PUT",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "저장 실패");

      if (data.profile) {
        const p = data.profile;
        setForm({
          name: p?.name || "",
          email: form.email || "", // 표시용 유지
          phone: p?.phone || "",
          industry_id: p?.industry_id || "",
          region_id: p?.region_id || "",
          employee_band_id: p?.employee_band_id || "",
          start_date: p?.start_date || "",
        });
      } else {
        await loadProfile(); // 안전하게 재조회
      }
      alert("기본 정보가 저장되었습니다.");
    } catch (err) {
      console.error(err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ 비밀번호 변경 (예전처럼 동작하게)
  // 1차: /api/users/password 시도 → 실패 시 /api/profile/password 폴백
  const changePassword = async (e) => {
    e.preventDefault();
    if (!username) return alert("로그인이 필요합니다.");
    if (!pw.current || !pw.next || !pw.confirm) return alert("모든 비밀번호 필드를 입력하세요.");
    if (pw.next !== pw.confirm) return alert("새 비밀번호가 일치하지 않습니다.");

    setChangingPw(true);
    try {
      const body = {
        username,
        currentPassword: pw.current,
        newPassword: pw.next,
      };

      // 1) /api/users/password
      let res = await fetch(`${API}/users/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      // 404/405 같은 경우 다른 엔드포인트로 폴백
      if (!res.ok && (res.status === 404 || res.status === 405)) {
        res = await fetch(`${API}/profile/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "비밀번호 변경 실패");
      }

      alert("비밀번호가 변경되었습니다.");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      console.error(err);
      alert(err.message || "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setChangingPw(false);
    }
  };

  if (!username) {
    return (
      <main className="mp mp--narrow">
        <h1 className="mp-title">마이페이지</h1>
        <p className="mp-sub">로그인 후 이용해 주세요.</p>
      </main>
    );
  }

  return (
    <main className="mp mp--narrow">
      <h1 className="mp-title">마이페이지</h1>
      <p className="mp-sub">기본 정보와 비밀번호를 관리하세요</p>

      <section className="card">
        <h2 className="card-title">기본 정보</h2>

        {loading ? (
          <div className="skeleton">불러오는 중…</div>
        ) : (
          <form className="grid2" onSubmit={saveProfile}>
            <div className="field">
              <label>이름</label>
              <input name="name" value={form.name} onChange={onChange} placeholder="홍길동" />
            </div>

            <div className="field">
              <label>이메일</label>
              <input type="email" name="email" value={form.email} onChange={onChange} placeholder="hong@example.com" />
            </div>

            <div className="field">
              <label>전화번호</label>
              <input name="phone" value={form.phone} onChange={onChange} placeholder="010-1234-5678" />
            </div>

            <div className="field">
              <label>업종</label>
              <div className="select-wrap">
                <select name="industry_id" value={form.industry_id} onChange={onChange}>
                  <option value="">선택</option>
                  {industries.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>사업장 지역</label>
              <div className="select-wrap">
                <select name="region_id" value={form.region_id} onChange={onChange}>
                  <option value="">선택</option>
                  {regions.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>종업원 수</label>
              <div className="select-wrap">
                <select name="employee_band_id" value={form.employee_band_id} onChange={onChange}>
                  <option value="">선택</option>
                  {bands.map(x => <option key={x.id} value={x.id}>{x.label || x.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>사업 시작일</label>
              <input type="date" name="start_date" value={form.start_date || ""} onChange={onChange} />
            </div>

            <div className="actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? '저장 중…' : '정보 저장'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">비밀번호 변경</h2>
        <form className="grid2" onSubmit={changePassword}>
          <div className="field">
            <label>현재 비밀번호</label>
            <input
              type="password"
              value={pw.current}
              onChange={(e)=>setPw({...pw, current:e.target.value})}
              placeholder="(현재 비밀번호 입력)"
            />
          </div>

          <div className="field">
            <label>새 비밀번호</label>
            <input
              type="password"
              value={pw.next}
              onChange={(e)=>setPw({...pw, next:e.target.value})}
              placeholder="(변경할 비밀번호 입력)"
            />
          </div>

          <div className="field">
            <label>새 비밀번호 확인</label>
            <input
              type="password"
              value={pw.confirm}
              onChange={(e)=>setPw({...pw, confirm:e.target.value})}
              placeholder="(변경할 비밀번호 재입력)"
            />
          </div>

          <div className="actions">
            <button className="btn" type="submit" disabled={changingPw}>
              {changingPw ? '변경 중…' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
