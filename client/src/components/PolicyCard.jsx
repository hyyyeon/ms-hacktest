import React from 'react';
import './PolicyCard.css';

/** 정책 카드 (단일 정책)
 * data: { title, target, period, support, method, link:{title,url} }
 */
export default function PolicyCard({ data, onBookmark }) {
  const d = {
    title: data?.title || '정책',
    target: data?.target || '정보 없음',
    period: data?.period || '정보 없음',
    support: data?.support || '정보 없음',
    method: data?.method || '정보 없음',
    link: data?.link || { title: '', url: '' },
  };

  return (
    <div className="pcard">
      <h3 className="pcard-title">{d.title}</h3>

      <ul className="pcard-list">
        <li>
          <span className="pcard-ico">🎯</span>
          <div>
            <div className="pcard-label">지원 대상</div>
            <div className="pcard-text">{d.target}</div>
          </div>
        </li>
        <li>
          <span className="pcard-ico">🗓️</span>
          <div>
            <div className="pcard-label">신청 기간</div>
            <div className="pcard-text">{d.period}</div>
          </div>
        </li>
        <li>
          <span className="pcard-ico">💰</span>
          <div>
            <div className="pcard-label">지원 내용</div>
            <div className="pcard-text">{d.support}</div>
          </div>
        </li>
        <li>
          <span className="pcard-ico">📝</span>
          <div>
            <div className="pcard-label">신청 방법</div>
            <div className="pcard-text">{d.method}</div>
          </div>
        </li>
        <li>
          <span className="pcard-ico">🔗</span>
          <div>
            <div className="pcard-label">공식 링크</div>
            <div className="pcard-text">
              {d.link?.url ? (
                <a href={d.link.url} target="_blank" rel="noreferrer">
                  {d.link.title || d.link.url}
                </a>
              ) : (
                '정부24 검색 결과'
              )}
            </div>
          </div>
        </li>
      </ul>

      <div className="pcard-actions">
        <button type="button" className="pcard-btn" onClick={onBookmark}>
          <span className="pcard-btn-ico">🔖</span>
          즐겨찾기 추가
        </button>
      </div>
    </div>
  );
}
