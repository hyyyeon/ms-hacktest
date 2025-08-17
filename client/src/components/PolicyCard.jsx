import React from 'react';
import './PolicyCard.css';

export default function PolicyCard({ data, onBookmark, onCalendar }) {
  // data: { title, icon, target, period, support, method, link:{title,url} }
  return (
    <div className="pcard">
      <div className="pcard-head">
        <div className="pcard-icon">{data.icon}</div>
        <div className="pcard-title">
          <h3>{data.title}</h3>
          <span className="pcard-badge">2025</span>
        </div>
      </div>

      <div className="pcard-body">
        <div className="pcard-row">
          <span className="pcard-label">지원 대상</span>
          <p>{data.target}</p>
        </div>
        <div className="pcard-row">
          <span className="pcard-label">신청 기간</span>
          <p>{data.period}</p>
        </div>
        <div className="pcard-row">
          <span className="pcard-label">지원 내용</span>
          <p>{data.support}</p>
        </div>
        <div className="pcard-row">
          <span className="pcard-label">신청 방법</span>
          <p>{data.method}</p>
        </div>
        <div className="pcard-row">
          <span className="pcard-label">공식 링크</span>
          <p>
            <a href={data.link.url} target="_blank" rel="noreferrer">
              {data.link.title}
            </a>
          </p>
        </div>
      </div>

      <div className="pcard-actions">
        <button type="button" className="btn-outline" onClick={onBookmark}>⭐ 즐겨찾기</button>
        <button type="button" className="btn-outline" onClick={onCalendar}>📅 캘린더</button>
      </div>
    </div>
  );
}
