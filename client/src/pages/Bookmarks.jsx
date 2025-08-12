/* src/pages/Bookmarks.jsx */
import React, { useEffect, useMemo, useState } from 'react';
import '../styles/Home.css';        // 공통 색상/레아이웃 일부 재사용
import '../styles/Bookmarks.css';   // 즐겨찾기 전용 스타일
import {
  FaTrash,
  FaCalendarAlt,
  FaBell,
  FaLink,
  FaFilter,
  FaSortAmountDown
} from 'react-icons/fa';

// 백엔드 연결을 고려한 베이스 URL (없으면 로컬 3001 사용)
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

const SEED = [
  {
    id: 1,
    title: '청년 월세 지원',
    category: '청년',
    deadline: '2024-02-15',
    description:
      '만 19~34세 청년에게 월세를 지원하는 정책으로, 월 최대 20만원까지 12개월간 지원',
    savedDate: '2024-01-12',
    notificationEnabled: true,
    source: '복지로',
    link: '#',
  },
  {
    id: 2,
    title: '소상공인 재난지원금',
    category: '소상공인',
    deadline: '2024-02-20',
    description: '코로나19로 피해를 입은 소상공인을 대상으로 하는 재난지원금',
    savedDate: '2024-01-10',
    notificationEnabled: false,
    source: '중소벤처기업부',
    link: '#',
  },
  {
    id: 3,
    title: '어르신 돌봄 서비스',
    category: '어르신',
    deadline: '2024-02-28',
    description: '65세 이상 어르신을 대상으로 하는 재가 돌봄 서비스',
    savedDate: '2024-01-08',
    notificationEnabled: true,
    source: '보건복지부',
    link: '#',
  },
];

export default function Bookmarks() {
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState('');

  const [filterCategory, setFilterCategory] = useState('전체');
  const [sortBy, setSortBy] = useState('deadline'); // 'deadline' | 'recent'

  // 데이터 로드 (백엔드 → 실패 시 localStorage → 없으면 SEED)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/bookmarks`, { credentials: 'include' });
        if (!res.ok) throw new Error('no-backend');
        const data = await res.json();
        if (!cancelled) {
          setBookmarks(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (_) {
        const local = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const data = local.length ? local : SEED;
        if (!local.length) localStorage.setItem('bookmarks', JSON.stringify(SEED));
        if (!cancelled) {
          setBookmarks(data);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 카테고리 목록
  const categories = useMemo(() => {
    const set = new Set(bookmarks.map((b) => b.category));
    return ['전체', ...Array.from(set)];
  }, [bookmarks]);

  // 필터/정렬 적용
  const view = useMemo(() => {
    const list = bookmarks
      .filter((b) => filterCategory === '전체' || b.category === filterCategory)
      .slice();
    if (sortBy === 'deadline') {
      list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else {
      list.sort((a, b) => new Date(b.savedDate) - new Date(a.savedDate));
    }
    return list;
  }, [bookmarks, filterCategory, sortBy]);

  // 알림 토글 (낙관적 업데이트 + localStorage/백엔드 동기화)
  const toggleNotify = (id) => {
    setBookmarks((prev) => {
      const next = prev.map((b) =>
        b.id === id ? { ...b, notificationEnabled: !b.notificationEnabled } : b
      );
      localStorage.setItem('bookmarks', JSON.stringify(next));
      const updated = next.find((b) => b.id === id);
      fetch(`${API_BASE}/bookmarks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationEnabled: updated?.notificationEnabled }),
      }).catch(() => {});
      return next;
    });
  };

  // 삭제 (낙관적 업데이트 + 백엔드 동기화)
  const removeOne = (id) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      localStorage.setItem('bookmarks', JSON.stringify(next));
      fetch(`${API_BASE}/bookmarks/${id}`, { method: 'DELETE' }).catch(() => {});
      return next;
    });
  };

  return (
    <div className="home-page">
      {/* ⬆️ Navbar는 App.js에서 공통 렌더링됨 */}

      <main className="bm-container">
        <div className="bm-header">
          <h1>즐겨찾기</h1>
          <p className="bm-sub">저장한 정책들을 관리하고 알림을 설정하세요</p>
        </div>

        {/* 필터/정렬 바 */}
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

        {/* 목록 */}
        {loading ? (
          <div className="bm-empty">불러오는 중…</div>
        ) : error ? (
          <div className="bm-empty">오류가 발생했어요. 새로고침 해보세요.</div>
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
                    <span className="bm-badge">{item.category}</span>
                  </div>
                  <button
                    className="bm-icon-btn"
                    aria-label="삭제"
                    onClick={() => removeOne(item.id)}
                    title="삭제"
                  >
                    <FaTrash size={16} />
                  </button>
                </header>

                <p className="bm-desc">{item.description}</p>

                <div className="bm-meta">
                  <div className="bm-meta-row">
                    <span className="bm-meta-item">
                      <FaCalendarAlt className="muted" style={{ marginRight: 6 }} />
                      마감: {item.deadline}
                    </span>
                    <span className="bm-meta-item">출처: {item.source}</span>
                    <span className="bm-meta-item">저장: {item.savedDate}</span>
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

                  <a
                    className="bm-btn-outline"
                    href={item.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
