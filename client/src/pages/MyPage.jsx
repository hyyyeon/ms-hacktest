// src/pages/MyPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/MyPage.css";

const API = process.env.REACT_APP_API_BASE || "http://localhost:3001";

export default function MyPage() {
  // 로그인 정보(localStorage.user = {"username":"user1"})
  const username = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}")?.username || ""; }
    catch { return ""; }
  }, []);

  // 드롭다운 메타
  const [industries, setIndustries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [bands, setBands] = useState([]);

  // 내 프로필
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    industry_id: "",
    region_id: "",
    employee_band_id: "",
    start_date: "",
  });

  // 비밀번호 변경
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  // 로딩/메시지
  const [loading, setLoading] = useState(true);

  // 초기 로드: 메타 + 내 프로필
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) 메타(드롭다운)
        const meta = await fetch(`${API}/profile/meta`).then(r=>r.json());
        if (!alive) return;
        setIndustries(meta.industries || []);
        setRegions(meta.regions || []);
        setBands(meta.employeeBands || []);

        // 2) 내 프로필
        if (!username) { setLoading(false); return; }
        const me = await fetch(`${API}/profile/me?username=${encodeURIComponent(username)}`).then(r=>r.json());
        if (!alive) return;

        setUserId(me.user_id ?? null);
        setForm({
          name: me.name || "",
          email: me.email || "",
          phone: me.phone || "",
          industry_id: me.industry_id || "",
          region_id: me.region_id || "",
          employee_band_id: me.employee_band_id || "",
          start_date: me.start_date || "",
        });
      } catch (e) {
        console.error(e);
        toast("데이터를 불러오지 못했습니다.", true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [username]);

  // 입력 핸들러
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 기본 정보 저장 (업서트)
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!userId) return toast("로그인이 필요합니다.", true);
    try {
      const res = await fetch(`${API}/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          name: n(form.name),
          email: n(form.email),
          phone: n(form.phone),
          industry_id: nNum(form.industry_id),
          region_id: nNum(form.region_id),
          employee_band_id: nNum(form.employee_band_id),
          start_date: n(form.start_date),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "저장 실패");
      toast("기본 정보가 저장되었습니다.");
    } catch (e) {
      toast(e.message || "저장 중 오류가 발생했습니다.", true);
    }
  };

// 비밀번호 변경
const changePassword = async (e) => {
  e.preventDefault();
  if (!userId) return toast("로그인이 필요합니다.", true);
  if (!pw.current) return toast("현재 비밀번호를 입력하세요.", true);
  if (!pw.next || !pw.confirm) return toast("새 비밀번호를 입력하세요.", true);
  if (pw.next !== pw.confirm) return toast("새 비밀번호가 일치하지 않습니다.", true);
  if (pw.next.length < 4) return toast("비밀번호는 4자 이상으로 해주세요.", true);

  try {
    const res = await fetch(`${API}/profile/password/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        currentPassword: pw.current,   // ✅ 추가
        newPassword: pw.next           // ✅ 그대로
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "변경 실패");
    setPw({ current:"", next:"", confirm:"" });
    toast("비밀번호가 변경되었습니다.");
  } catch (e) {
    toast(e.message || "변경 중 오류가 발생했습니다.", true);
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

      {/* 기본 정보 카드 */}
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
                  {bands.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>사업 시작일</label>
              <input type="date" name="start_date" value={form.start_date || ""} onChange={onChange} />
            </div>

            <div className="actions">
              <button className="btn" type="submit">정보 저장</button>
            </div>
          </form>
        )}
      </section>

      {/* 비밀번호 변경 카드 */}
      <section className="card">
        <h2 className="card-title">비밀번호 변경</h2>
        <form className="grid2" onSubmit={changePassword}>
          <div className="field">
            <label>현재 비밀번호</label>
            <input type="password" value={pw.current} onChange={(e)=>setPw({...pw, current:e.target.value})} placeholder="(간이 버전: 서버 검증 없음)" />
          </div>

          <div className="field">
            <label>새 비밀번호</label>
            <input type="password" value={pw.next} onChange={(e)=>setPw({...pw, next:e.target.value})} />
          </div>

          <div className="field">
            <label>새 비밀번호 확인</label>
            <input type="password" value={pw.confirm} onChange={(e)=>setPw({...pw, confirm:e.target.value})} />
          </div>

          <div className="actions">
            <button className="btn" type="submit" disabled={!userId}>비밀번호 변경</button>
          </div>
        </form>
      </section>
    </main>
  );
}

/* helpers */
function n(v){ return v==="" ? null : v; }
function nNum(v){ if(v===""||v==null) return null; const n=Number(v); return Number.isNaN(n)?null:n; }
function toast(msg, err=false){
  const el = document.createElement("div");
  el.className = "toast " + (err? "toast-err":"");
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(()=> el.classList.add("show"));
  setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.remove(),250); }, 1800);
}
