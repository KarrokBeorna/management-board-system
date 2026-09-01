import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '';

const containerStyle = {
  padding: '20px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  width: '100%',
  height: '100vh',
  boxSizing: 'border-box',
  backgroundColor: '#F8FAFC',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px',
  flexShrink: 0,
};

const titleStyle = {
  fontSize: '2.5rem',
  fontWeight: 900,
  color: '#1E293B',
  margin: 0,
};

const filterGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const filterButtonStyle = (active) => ({
  padding: '12px 24px',
  borderRadius: '12px',
  border: 'none',
  fontWeight: 700,
  fontSize: '1.4rem',
  background: active ? '#2563EB' : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.2s',
});

const timeFilterButtonStyle = (active, activeColor) => ({
  ...filterButtonStyle(active),
  background: active ? activeColor : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
});

const dashboardGridStyle = {
  display: 'flex',
  gap: '20px',
  flex: 1,
  minHeight: 0,
};

const chartColumnStyle = {
  flex: '0 0 40%',
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
  minHeight: 0,
};

const rightColumnStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

const tableCardStyle = {
  flex: 1,
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
  minHeight: 0,
};

const tableTitleStyle = {
  fontSize: '2rem',
  fontWeight: 800,
  color: '#1E293B',
  margin: '0 0 16px 0',
};

const tableScrollStyle = {
  flex: 1,
  overflowY: 'auto',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
};

const thStyle = {
  padding: '18px 24px',
  textAlign: 'left',
  fontWeight: 800,
  color: '#475569',
  borderBottom: '3px solid #E2E8F0',
  background: '#F8FAFC',
  fontSize: '1.6rem',
  textTransform: 'uppercase',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const tdStyle = {
  padding: '14px 24px',
  borderBottom: '1px solid #F1F5F9',
  color: '#1E293B',
  fontSize: '1.6rem',
};

const PIE_COLORS = ['#10B981', '#EF4444'];

const getDefaultTimeFilter = () => {
  const nowMoscow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const hours = nowMoscow.getUTCHours();
  const minutes = nowMoscow.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes >= 1 * 60 + 31 && totalMinutes < 7 * 60 + 50) {
    return 'night';
  }
  if (totalMinutes >= 7 * 60 + 50 && totalMinutes < 16 * 60 + 41) {
    return 'day';
  }
  return 'evening';
};

const getTimeRange = (timeFilter) => {
  const nowMoscow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const hours = nowMoscow.getUTCHours();
  const minutes = nowMoscow.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  const getDateStr = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = new Date(nowMoscow);
  today.setUTCHours(0,0,0,0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const todayStr = getDateStr(today);
  const yesterdayStr = getDateStr(yesterday);

  if (timeFilter === 'all') {
    return {
      start: `${todayStr} 00:00:00`,
      end: `${todayStr} 23:59:59`,
    };
  }

  if (timeFilter === 'day') {
    const dateToUse = totalMinutes >= 7 * 60 + 50 ? todayStr : yesterdayStr;
    return {
      start: `${dateToUse} 07:50:00`,
      end: `${dateToUse} 16:40:00`,
    };
  }

  if (timeFilter === 'evening') {
    const dateToUse = totalMinutes >= 16 * 60 + 41 ? todayStr : yesterdayStr;
    const startDateObj = new Date(dateToUse + 'T00:00:00Z');
    const endDateObj = new Date(startDateObj);
    endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
    const endStr = getDateStr(endDateObj);
    return {
      start: `${dateToUse} 16:41:00`,
      end: `${endStr} 01:30:00`,
    };
  }

  if (timeFilter === 'night') {
    const dateToUse = totalMinutes >= 1 * 60 + 31 ? todayStr : yesterdayStr;
    return {
      start: `${dateToUse} 01:31:00`,
      end: `${dateToUse} 07:50:00`,
    };
  }

  return {
    start: `${todayStr} 00:00:00`,
    end: `${todayStr} 23:59:59`,
  };
};

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getCurrentShiftInfo = () => {
  const nowMoscow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const hours = nowMoscow.getUTCHours();
  const minutes = nowMoscow.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  let shiftDate = new Date(nowMoscow);
  let shiftType = 'night';

  if (totalMinutes >= 7 * 60 + 50 && totalMinutes <= 16 * 60 + 40) {
    shiftType = 'day';
  } else if (totalMinutes >= 16 * 60 + 41 || totalMinutes <= 1 * 60 + 30) {
    shiftType = 'evening';
    if (totalMinutes <= 1 * 60 + 30) {
      shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
    }
  } else {
    shiftType = 'night';
  }

  const weekNumber = getWeekNumber(shiftDate);
  const isEvenWeek = weekNumber % 2 === 0;
  let shiftLetter = 'C';

  if (shiftType === 'night') {
    shiftLetter = 'C';
  } else if (shiftType === 'day') {
    shiftLetter = isEvenWeek ? 'B' : 'A';
  } else if (shiftType === 'evening') {
    shiftLetter = isEvenWeek ? 'A' : 'B';
  }

  return { weekNumber, shiftLetter, shiftType };
};

export default function DrrCpfinalDashboardPage() {
  const [timeFilter, setTimeFilter] = useState(getDefaultTimeFilter());
  const [isManualFilter, setIsManualFilter] = useState(false);
  const [shiftInfo, setShiftInfo] = useState(getCurrentShiftInfo());
  const [drrData, setDrrData] = useState({ totalVins: 0, closedVins: 0, drrPercent: 0 });
  const [topDefects, setTopDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getTimeRange(timeFilter);
      const drrParams = new URLSearchParams({ startTime: start, endTime: end });
      const drrRes = await fetch(`${API_BASE}/api/drr-cp8-dashboard?${drrParams.toString()}`);
      if (!drrRes.ok) throw new Error('Ошибка загрузки DRR');
      const drrJson = await drrRes.json();
      setDrrData(drrJson);

      const defectsParams = new URLSearchParams({ startTime: start, endTime: end });
      const defectsRes = await fetch(`${API_BASE}/api/drr-cp8-top-defects?${defectsParams.toString()}`);
      if (!defectsRes.ok) throw new Error('Ошибка загрузки топа дефектов');
      const defectsJson = await defectsRes.json();
      setTopDefects(defectsJson);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newShiftInfo = getCurrentShiftInfo();
      setShiftInfo(newShiftInfo);

      if (!isManualFilter) {
        const defaultFilter = getDefaultTimeFilter();
        setTimeFilter(defaultFilter);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isManualFilter]);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [timeFilter]);

  const nokVins = drrData.totalVins - drrData.closedVins;
  const pieData = [
    { name: 'DRR', value: drrData.drrPercent },
    { name: 'Не прямой сход', value: Math.max(0, 100 - drrData.drrPercent) },
  ];

  const handleFilterClick = (filter) => {
    setIsManualFilter(true);
    setTimeFilter(filter);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>DRR CPFINAL Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* УЛУЧШЕННЫЙ БЛОК НЕДЕЛИ И СМЕНЫ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '20px' }}>
            {/* Капсула с номером недели */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '12px 28px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
              border: '3px solid #fdfeff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '1.8rem', color: '#64748B', fontWeight: 800 }}>CW</span>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: '#1E293B', letterSpacing: '2px', lineHeight: 1 }}>
                {shiftInfo.weekNumber}
              </span>
            </div>

            {/* Буква смены (огромная, тёмный текст) */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: shiftInfo.shiftLetter === 'A' ? '#F59E0B' : shiftInfo.shiftLetter === 'B' ? '#ffffff' : '#6B7280',
              color: '#1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '3.5rem',
              lineHeight: 1,
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              border: '4px solid #FFFFFF',
            }}>
              {shiftInfo.shiftLetter}
            </div>
          </div>

          <div style={{ width: '1px', height: '60px', backgroundColor: '#D1D5DB' }} />
          <div style={filterGroupStyle}>
            <button
              style={timeFilterButtonStyle(timeFilter === 'all', '#6B7280')}
              onClick={() => handleFilterClick('all')}
            >
              Сутки
            </button>
            <button
              style={timeFilterButtonStyle(timeFilter === 'day', '#F59E0B')}
              onClick={() => handleFilterClick('day')}
            >
              День
            </button>
            <button
              style={timeFilterButtonStyle(timeFilter === 'evening', '#3B82F6')}
              onClick={() => handleFilterClick('evening')}
            >
              Вечер
            </button>
            <button
              style={timeFilterButtonStyle(timeFilter === 'night', '#1F2937')}
              onClick={() => handleFilterClick('night')}
            >
              Ночь
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '2.5rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
          Загрузка данных...
        </div>
      ) : error ? (
        <div style={{ fontSize: '2.5rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
          ❌ {error}
        </div>
      ) : (
        <div style={dashboardGridStyle}>
          <div style={chartColumnStyle}>
            <div style={{ position: 'relative', width: '100%', height: '600px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="75%"
                    outerRadius="98%"
                    paddingAngle={4}
                    stroke="#FFFFFF"
                    strokeWidth={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(1)}%`}
                    contentStyle={{ fontSize: '1.8rem', borderRadius: '16px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>DRR</div>
                <div style={{ fontSize: '6.2rem', fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
                  {drrData.drrPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
              <div style={{ 
                flex: 1, 
                backgroundColor: '#1E293B', 
                borderRadius: '12px', 
                padding: '16px', 
                textAlign: 'center', 
                color: '#FFFFFF', 
                minHeight: '140px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center' 
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.9 }}>Всего авто</div>
                <div style={{ width: '70%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '10px auto' }}></div>
                <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>{drrData.totalVins}</div>
              </div>
              <div style={{ 
                flex: 1, 
                backgroundColor: '#059669', 
                borderRadius: '12px', 
                padding: '16px', 
                textAlign: 'center', 
                color: '#FFFFFF', 
                minHeight: '140px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center' 
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.9 }}>OK Авто</div>
                <div style={{ width: '70%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '10px auto' }}></div>
                <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>{drrData.closedVins}</div>
              </div>
              <div style={{ 
                flex: 1, 
                backgroundColor: '#DC2626', 
                borderRadius: '12px', 
                padding: '16px', 
                textAlign: 'center', 
                color: '#FFFFFF', 
                minHeight: '140px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center' 
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.9 }}>NOK Авто</div>
                <div style={{ width: '70%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '10px auto' }}></div>
                <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>{nokVins}</div>
              </div>
            </div>
          </div>

          <div style={rightColumnStyle}>
            <div style={tableCardStyle}>
              <h2 style={tableTitleStyle}>Топ дефектов, повлиявших на DRR CPFINAL</h2>
              
              <div style={tableScrollStyle}>
                {topDefects.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Описание дефекта (MPP)</th>
                        <th style={thStyle}>Класс</th>
                        <th style={thStyle}>Кол-во авто</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDefects.map((defect, idx) => (
                        <tr 
                          key={idx} 
                          style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}
                        >
                          <td style={{ 
                            ...tdStyle, 
                            boxShadow: idx < 3 ? 'inset 10px 0 0 #EF4444' : 'none'
                          }}>
                            {defect.mpp}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#475569' }}>{defect.grade}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, fontSize: '2rem', color: idx < 3 ? '#DC2626' : '#1E293B' }}>
                            {defect.affectedVins}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '2rem' }}>Нет данных</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}