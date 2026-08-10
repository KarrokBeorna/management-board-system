import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import tablePreview from './assets/table-preview.png';
import dailyTopPreview from './assets/daily-top-preview.png';
import modelStatusPreview from './assets/123.png';
import checkpointMapPreview from './assets/321.png';
import sgpAuditPreview from './assets/sgp.png';
import mppWeeklyPreview from './assets/mppweek.png';
import partDefectPreview from './assets/search.png';
import externalReportPreview from './assets/kulik.png';
import drrReportPreview from './assets/drrall.png'; // временная картинка

// Общие стили секций
const sectionStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 32,
  marginBottom: 32,
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
  border: '1px solid #F0F0F5',
};

const headingStyle = {
  color: '#1F2937',
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 28,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 24,
};

const getCardStyle = (isHovered, accentColor) => ({
  width: '100%',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: isHovered
    ? '0 20px 30px -10px rgba(0,0,0,0.12)'
    : '0 4px 10px rgba(0,0,0,0.04)',
  transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2), box-shadow 0.3s ease',
  transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
  backgroundColor: '#FFFFFF',
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
  border: `1px solid ${isHovered ? accentColor : '#F3F4F6'}`,
});

const thumbnailStyle = {
  backgroundColor: '#F9FAFB',
  height: 150,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: '1px solid #F3F4F6',
};

const getCaptionStyle = (isHovered, accentColor) => ({
  backgroundColor: isHovered ? accentColor : '#374151',
  height: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '0.3px',
  transition: 'background-color 0.3s ease',
});

// Компонент карточки (поддержка внешних ссылок)
function ReportCard({ to, imgSrc, caption, accentColor = '#2563EB' }) {
  const [isHovered, setIsHovered] = useState(false);
  const cardStyle = getCardStyle(isHovered, accentColor);
  const captionStyle = getCaptionStyle(isHovered, accentColor);

  const isExternal = to.startsWith('http');

  const content = (
    <div style={thumbnailStyle}>
      <img
        src={imgSrc}
        alt={caption}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.4s ease',
          transform: isHovered ? 'scale(1.04)' : 'scale(1)',
        }}
      />
    </div>
  );

  const captionBlock = <div style={captionStyle}>{caption}</div>;

  if (isExternal) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
        {captionBlock}
      </a>
    );
  }

  return (
    <Link
      to={to}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
      {captionBlock}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div style={{ padding: 40, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* Секция "Отчёты" */}
      <div style={sectionStyle}>
        <h2 style={headingStyle}>
          <span style={{ background: '#EEF2FF', padding: '8px 14px', borderRadius: 8, color: '#2563EB', fontSize: 18 }}>
            📊
          </span>
          Отчёты
        </h2>
        <div style={gridStyle}>
          <ReportCard to="/report" imgSrc={tablePreview} caption="Top DRR Board" accentColor="#3B82F6" />
          <ReportCard to="/daily-top" imgSrc={dailyTopPreview} caption="Daily Top CP7/CP8" accentColor="#8B5CF6" />
          <ReportCard to="/model-status" imgSrc={modelStatusPreview} caption="Model Status" accentColor="#F59E0B" />
          <ReportCard to="/checkpoint-map" imgSrc={checkpointMapPreview} caption="Checkpoint Map" accentColor="#EF4444" />
          <ReportCard to="/mpp-weekly-top" imgSrc={mppWeeklyPreview} caption="DRR Defects Top CP7/СP8" accentColor="#10B981" />
          <ReportCard to="http://10.27.195.16/reports/024" imgSrc={externalReportPreview} caption="DRR по заводу" accentColor="#1638f9" />
          <ReportCard to="/drr-report" imgSrc={drrReportPreview} caption="DRR Report" accentColor="#fa0000" />
        </div>
      </div>

      {/* Секция "Сервисы" */}
      <div style={sectionStyle}>
        <h2 style={headingStyle}>
          <span style={{ background: '#F0FDF4', padding: '8px 14px', borderRadius: 8, color: '#16A34A', fontSize: 18 }}>
            🛠️
          </span>
          Сервисы
        </h2>
        <div style={gridStyle}>
          <ReportCard to="/sgp-audit" imgSrc={sgpAuditPreview} caption="СГП Audit" accentColor="#10B981" />
          <ReportCard to="/part-defect-search" imgSrc={partDefectPreview} caption="Part/Defect Search" accentColor="#0e3bec" />
          
        </div>
      </div>
    </div>
  );
}