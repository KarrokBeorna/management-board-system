import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tablePreview from './assets/table-preview.png';
import dailyTopPreview from './assets/daily-top-preview.png';
import modelStatusPreview from './assets/123.png';
import checkpointMapPreview from './assets/321.png';
import sgpAuditPreview from './assets/sgp.png';
import mppWeeklyPreview from './assets/mppweek.png';
import partDefectPreview from './assets/search.png';
import externalReportPreview from './assets/kulik.png';
import drrReportPreview from './assets/drrall.png';
import dailyDashboardPreview from './assets/dailyq.png';
import externalDReportPreview from './assets/dim.png';
import warrantyPreview from './assets/waran.png';
import tlMapPreview from './assets/tlmap.png';
import HoldsSgpPage from './assets/hold.png';
import sgpManagementPreview from './assets/cp8.png';
import DrrCp7DashboardPage from './assets/cp7drr.png'; 

// ====== СТИЛИ ======
const sectionStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 32,
  marginBottom: 32,
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
  border: '1px solid #F0F0F5',
  transition: 'opacity 0.4s ease, transform 0.4s ease, max-height 0.5s ease, margin-bottom 0.4s ease, padding 0.4s ease',
  overflow: 'hidden',
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

const tabBarStyle = {
  display: 'flex',
  gap: 6,
  marginBottom: 32,
  backgroundColor: '#E5E7EB',
  borderRadius: 14,
  padding: 6,
  width: 'fit-content',
};

const tabStyle = (active) => ({
  padding: '10px 28px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 600,
  fontSize: 15,
  background: active ? '#FFFFFF' : 'transparent',
  color: active ? '#111827' : '#6B7280',
  cursor: 'pointer',
  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  whiteSpace: 'nowrap',
});

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

// ====== КОМПОНЕНТ КАРТОЧКИ ======
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

// ====== АНИМИРОВАННАЯ СЕКЦИЯ ======
function AnimatedSection({ title, icon, iconBg, iconColor, children, visible }) {
  const [shouldRender, setShouldRender] = useState(visible);
  const [isAnimating, setIsAnimating] = useState(visible);

  useEffect(() => {
    if (visible) {
      // Показываем секцию
      setShouldRender(true);
      // Небольшая задержка для срабатывания CSS transition
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Скрываем с анимацией
      setIsAnimating(false);
      // После завершения анимации удаляем из DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <div style={{
      ...sectionStyle,
      opacity: isAnimating ? 1 : 0,
      transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
      maxHeight: isAnimating ? '3000px' : '0',
      marginBottom: isAnimating ? 32 : 0,
      padding: isAnimating ? 32 : '0 32px',
    }}>
      <h2 style={headingStyle}>
        <span style={{
          background: iconBg,
          padding: '8px 14px',
          borderRadius: 8,
          color: iconColor,
          fontSize: 18,
        }}>
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ====== ОСНОВНОЙ КОМПОНЕНТ ======
export default function HomePage() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'reports' | 'services'

  const showReports = activeTab === 'all' || activeTab === 'reports';
  const showServices = activeTab === 'all' || activeTab === 'services';

  return (
    <div style={{ padding: 40, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* Табы */}
      <div style={tabBarStyle}>
        <button onClick={() => setActiveTab('all')} style={tabStyle(activeTab === 'all')}>
          Все
        </button>
        <button onClick={() => setActiveTab('reports')} style={tabStyle(activeTab === 'reports')}>
          📊 Отчеты
        </button>
        <button onClick={() => setActiveTab('services')} style={tabStyle(activeTab === 'services')}>
          🛠️ Сервисы
        </button>
      </div>

      {/* Секция "Отчёты" */}
      <AnimatedSection
        title="Отчёты"
        icon="📊"
        iconBg="#EEF2FF"
        iconColor="#2563EB"
        visible={showReports}
      >
        <div style={gridStyle}>
          <ReportCard to="/report" imgSrc={tablePreview} caption="Top DRR Board" accentColor="#3B82F6" />
          <ReportCard to="/daily-top" imgSrc={dailyTopPreview} caption="Daily Top CP7/CP8" accentColor="#8B5CF6" />
          <ReportCard to="/model-status" imgSrc={modelStatusPreview} caption="Model Status" accentColor="#F59E0B" />
          <ReportCard to="/mpp-weekly-top" imgSrc={mppWeeklyPreview} caption="DRR Defects Top CP7/СP8" accentColor="#10B981" />
          <ReportCard to="/drr-report" imgSrc={drrReportPreview} caption="DRR Report" accentColor="#fa0000" />
          <ReportCard to="/daily-dashboard" imgSrc={dailyDashboardPreview} caption="Daily Dashboard" accentColor="#0cb428" />
          <ReportCard to="/tl-map" imgSrc={tlMapPreview} caption="TL Map" accentColor="#0ad5c8" />
          <ReportCard to="/drr-cp7-dashboard" imgSrc={DrrCp7DashboardPage} caption="DRR CP7 Dashboard" accentColor="#3a2ac5" />
        </div>
      </AnimatedSection>

      {/* Секция "Сервисы" */}
      <AnimatedSection
        title="Сервисы"
        icon="🛠️"
        iconBg="#F0FDF4"
        iconColor="#16A34A"
        visible={showServices}
      >
        <div style={gridStyle}>
          <ReportCard to="/sgp-audit" imgSrc={sgpAuditPreview} caption="СГП Audit" accentColor="#10B981" />
          <ReportCard to="/sgp-management" imgSrc={sgpManagementPreview} caption="СГП Management" accentColor="#8B5CF6" />
          <ReportCard to="/part-defect-search" imgSrc={partDefectPreview} caption="Part/Defect Search" accentColor="#0e3bec" />
          <ReportCard to="http://10.27.195.25:5174/time-at-points" imgSrc={externalDReportPreview} caption="Chekpoint Passage" accentColor="#fc7b02" />
          <ReportCard to="/warranty" imgSrc={warrantyPreview} caption="Warranty" accentColor="#0cd72a" />
          <ReportCard to="/holds-sgp" imgSrc={HoldsSgpPage} caption="Holds СГП" accentColor="#f30b2e" />
          <ReportCard to="http://10.27.195.16/reports/024" imgSrc={externalReportPreview} caption="DRR по заводу" accentColor="#1638f9" />
        </div>
      </AnimatedSection>
    </div>
  );
}
