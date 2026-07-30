import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import logo from './assets/logo.png';
import homeIcon from './assets/home.png';

const headerStyle = {
  backgroundColor: '#35384F',
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '24px',
  padding: '0 20px',
};

const leftGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const homeIconStyle = {
  height: '28px',
  width: 'auto',
  cursor: 'pointer',
};

const logoStyle = {
  height: '40px',
  width: 'auto',
};

const dateStyle = {
  fontSize: '14px',
  fontWeight: 'normal',
};

function getCurrentDate() {
  const d = new Date();
  return d.toLocaleDateString('ru-RU');
}

const mainDefault = {
  maxWidth: '1300px',
  margin: '0 auto',
  padding: '20px',
};

const mainFullScreen = {
  padding: '0',
  height: 'calc(100vh - 60px)',
};

export default function Layout() {
  const location = useLocation();
  const isFullScreen = location.pathname === '/report' || location.pathname === '/daily-top' || location.pathname === '/model-status';
  

  return (
    <>
      <header style={headerStyle}>
        <div style={leftGroupStyle}>
          <Link to="/" title="На главную">
            <img src={homeIcon} alt="Home" style={homeIconStyle} />
          </Link>
          <img src={logo} alt="Logo" style={logoStyle} />
        </div>
        <span>AGM - Quality</span>
        <span style={dateStyle}>{getCurrentDate()}</span>
      </header>
      <main style={isFullScreen ? mainFullScreen : mainDefault}>
        <Outlet />
      </main>
    </>
  );
}