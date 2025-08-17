/* src/pages/Bookmarks.jsx */
import React, { useEffect, useMemo, useState } from 'react';
import '../styles/Home.css';
import '../styles/Bookmarks.css';
import { FaTrash, FaCalendarAlt, FaBell, FaLink, FaFilter, FaSortAmountDown } from 'react-icons/fa';

// ✅ 백엔드 베이스 + /api 접두사 강제
const API = ((process.env.REACT_APP_API_BASE || 'http://localhost:3001').replace(/\/$/, '')) + '/api';

export default function Bookmarks() {
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [sortBy, setSortBy] = useState('deadline'); // 'deadline' | 'recent'

  const username = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}')?.username || ''; }
    catch { return ''; }
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = username ? `?username=${encodeURIComponent(username)}` : '';
        const res = await fetch(`${API}/bookmarks${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancel) setBookmarks(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setError('목록을 불러오지 못했어요.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [username]);

  const categories = useMemo(() => {
    const set = new Set(bookmarks.map(b => b.category).filter(Boolean));
    return ['전체', ...Array.from(set)];
  }, [bookmarks]);

  const view = useMemo(() => {
    const list = bookmarks
      .filter(b => filterCategory === '전체' || b.category === filterCategory)
      .slice();
    if (sortBy === 'deadline') {
      list.sort((a, b) =>
        new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31')
      );
    } else {
      list.sort((a, b) =>
        new Date(b.savedDate || '1970-01-01') - new Date(a.savedDate || '1970-01-01')
      );
    }
    return list;
  }, [bookmarks, filterCategory, sortBy]);

  const toggleNotify = async (id) => {
    setBookmarks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], notificationEnabled: !next[idx].notificationEnabled };
      return next;
    });

    const target = bookmarks.find(b => b.id === id);
    try {
      const res = await fetch(`${API}/bookmarks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationEnabled: !target?.notificationEnabled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setBookmarks(prev => {
        const idx = prev.findIndex(b => b.id === id);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], notificationEnabled: !next[idx].notificationEnabled };
        return next;
      });
      alert('알림 설정을 변경하지 못했어요.');
    }
  };

  const removeOne = async (id) => {
    const backup = bookmarks;
    setBookmarks(prev => prev.filter(b => b.id !== id));
    try {
      const res = await fetch(`${API}/bookmarks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setBookmarks(backup);
      alert('삭제하지 못했어요.');
    }
  };

  return (
    <div className="home-page">
      <main className="bm-container">
        <div className="bm-header">
          <h1>즐겨찾기</h1>
          <p className="bm-sub">저장한 정책들을 관리하고 알림을 설정하세요</p>
        </div>

        <div className="bm-toolbar">
          <div className="bm-filter">
            <FaFilter className="muted" size={16} />
            <span className="label">카테고리:</span>
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${filterCategory === c ? 'chip-active' : ''}`}
                onClick={() => setFilterCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="bm-sort">
            <FaSortAmountDown className="muted" size={16} />
            <span className="label">정렬:</span>
            <button
              className={`chip ${sortBy === 'deadline' ? 'chip-active' : ''}`}
              onClick={() => setSortBy('deadline')}
            >
              마감 임박순
            </button>
            <button
              className={`chip ${sortBy === 'recent' ? 'chip-active' : ''}`}
              onClick={() => setSortBy('recent')}
            >
              최근 저장순
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bm-empty">불러오는 중…</div>
        ) : error ? (
          <div className="bm-empty">{error}</div>
        ) : view.length === 0 ? (
          <div className="bm-empty">
            <div className="bm-empty-icon">🔖</div>
            <h3>저장된 정책이 없습니다</h3>
            <p className="muted">AI 챗봇에서 관심 있는 정책을 저장해보세요</p>
          </div>
        ) : (
          <section className="bm-grid">
            {view.map((item) => (
              <article className="bm-card" key={item.id}>
                <header className="bm-card-head">
                  <div className="bm-title-wrap">
                    <h3 className="bm-title">{item.title}</h3>
                    {item.category && <span className="bm-badge">{item.category}</span>}
                  </div>
                  <button className="bm-icon-btn" aria-label="삭제" onClick={() => removeOne(item.id)} title="삭제">
                    <FaTrash size={16} />
                  </button>
                </header>

                {item.description && <p className="bm-desc">{item.description}</p>}

                <div className="bm-meta">
                  <div className="bm-meta-row">
                    <span className="bm-meta-item">
                      <FaCalendarAlt className="muted" style={{ marginRight: 6 }} />
                      마감: {item.deadline || '—'}
                    </span>
                    {item.source && <span className="bm-meta-item">출처: {item.source}</span>}
                    {item.savedDate && <span className="bm-meta-item">저장: {item.savedDate}</span>}
                  </div>
                </div>

                <footer className="bm-actions">
                  <label className="bm-switch">
                    <input
                      type="checkbox"
                      checked={!!item.notificationEnabled}
                      onChange={() => toggleNotify(item.id)}
                      aria-label="알림 설정"
                    />
                    <span className="track" />
                    <span className="bm-switch-label">
                      <FaBell className="muted" style={{ marginRight: 6 }} />
                      알림
                    </span>
                  </label>

                  <a className="bm-btn-outline" href={item.link || '#'} target="_blank" rel="noopener noreferrer">
                    <FaLink style={{ marginRight: 6 }} />
                    신청하러 가기
                  </a>
                </footer>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
