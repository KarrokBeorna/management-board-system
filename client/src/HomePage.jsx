import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import tablePreview from './assets/table-preview.png'; // можно заменить на другую картинку
import dailyTopPreview from './assets/daily-top-preview.png'; // новая картинка для второй карточки

const sectionStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '30px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
};

const headingStyle = {
  color: '#303A4C',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 320px)',
  gap: '20px',
};

const getCardStyle = (isHovered) => ({
  width: '300px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'transform 0.3s, box-shadow 0.3s',
  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
  backgroundColor: 'white',
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
});

const thumbnailStyle = {
  backgroundColor: '#f8f9fa',
  height: '140px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const getCaptionStyle = (isHovered) => ({
  backgroundColor: isHovered ? '#6b7280' : '#4a5568',
  height: '45px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontSize: '16px',
  transition: 'background-color 0.3s',
});

function ReportCard({ to, imgSrc, caption }) {
  const [isHovered, setIsHovered] = useState(false);
  const cardStyle = getCardStyle(isHovered);
  const captionStyle = getCaptionStyle(isHovered);

  return (
    <Link
      to={to}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={thumbnailStyle}>
        <img
          src={imgSrc}
          alt={caption}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={captionStyle}>{caption}</div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div style={sectionStyle}>
      <h2 style={headingStyle}>Отчеты</h2>
      <div style={gridStyle}>
        <ReportCard to="/report" imgSrc={tablePreview} caption="Top DRR Board" />
        <ReportCard to="/daily-top" imgSrc={dailyTopPreview} caption="Daily Top CP7/CP8" />
      </div>
    </div>
  );
}