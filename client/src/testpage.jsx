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

const timeFilterButtonStyle = (active) => ({
  ...filterButtonStyle(active),
  background: active ? '#F59E0B' : '#FFFFFF',
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

const pieLegendStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '30px',
  marginTop: '10px',
  fontSize: '1.6rem',
  fontWeight: 'bold',
};

// Функция определения дефолтного временного фильтра
const getDefaultTimeFilter = () => {
  const nowMoscow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const hours = nowMoscow.getUTCHours();
  const minutes = nowMoscow.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes >= 7 * 60 + 50 && totalMinutes < 19 * 60 + 30) {
    return 'day';
  } else {
    return 'evening';
  }
};

// Функция вычисления границ временного интервала
const getTimeRange = (timeFilter) => {
  const nowMoscow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const year = nowMoscow.getUTCFullYear();
  const month = String(nowMoscow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(nowMoscow.getUTCDate()).padStart(2, '0');
  const hours = nowMoscow.getUTCHours();
  const minutes = nowMoscow.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (timeFilter === 'all') {
    return {
      start: `${year}-${month}-${day} 00:00:00`,
      end: `${year}-${month}-${day} 23:59:59`
    };
  }

  if (timeFilter === 'day') {
    return {
      start: `${year}-${month}-${day} 07:50:00`,
      end: `${year}-${month}-${day} 19:30:00`
    };
  }

  if (timeFilter === 'evening') {
    const isAfterEveningStart = totalMinutes >= 19 * 60 + 31;
    let startDate = new Date(nowMoscow);
    let endDate = new Date(nowMoscow);

    if (isAfterEveningStart) {
      startDate.setUTCHours(19, 31, 0, 0);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      endDate.setUTCHours(7, 49, 0, 0);
    } else {
      startDate.setUTCDate(startDate.getUTCDate() - 1);
      startDate.setUTCHours(19, 31, 0, 0);
      endDate.setUTCHours(7, 49, 0, 0);
    }

    const fmt = (date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      const hh = String(date.getUTCHours()).padStart(2, '0');
      const mm = String(date.getUTCMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}:00`;
    };

    return {
      start: fmt(startDate),
      end: fmt(endDate)
    };
  }

  return {
    start: `${year}-${month}-${day} 00:00:00`,
    end: `${year}-${month}-${day} 23:59:59`
  };
};

export default function TestPage() {
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState(getDefaultTimeFilter());
  const [data, setData] = useState({ totalVins: 0, closedVins: 0, drrPercent: 0, topDefects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getTimeRange(timeFilter);
      const params = new URLSearchParams({ filter, startTime: start, endTime: end });
      const res = await fetch(`${API_BASE}/api/testpage-data?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [filter, timeFilter]);

  const nokVins = data.totalVins - data.closedVins;

  const pieData = [
    { name: 'DRR', value: data.drrPercent },
    { name: 'Не прямой сход', value: Math.max(0, 100 - data.drrPercent) },
  ];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>DRR CP7 Test</h1>
        <div style={filterGroupStyle}>
          <button style={filterButtonStyle(filter === 'all')} onClick={() => setFilter('all')}>Все</button>
          <button style={filterButtonStyle(filter === 'cp7')} onClick={() => setFilter('cp7')}>CP7</button>
          <button style={filterButtonStyle(filter === 'pip')} onClick={() => setFilter('pip')}>PIP</button>

          <button style={timeFilterButtonStyle(timeFilter === 'all')} onClick={() => setTimeFilter('all')}>Сутки</button>
          <button style={timeFilterButtonStyle(timeFilter === 'day')} onClick={() => setTimeFilter('day')}>День</button>
          <button style={timeFilterButtonStyle(timeFilter === 'evening')} onClick={() => setTimeFilter('evening')}>Вечер</button>
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
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={4}
                    stroke="#FFFFFF"
                    strokeWidth={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>DRR</div>
                <div style={{ fontSize: '7.5rem', fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
                  {data.drrPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#FFFFFF', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.9 }}>Всего авто</div>
                <div style={{ width: '70%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '10px auto' }}></div>
                <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>{data.totalVins}</div>
              </div>
              <div style={{ flex: 1, backgroundColor: '#059669', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#FFFFFF', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.9 }}>OK Авто</div>
                <div style={{ width: '70%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '10px auto' }}></div>
                <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>{data.closedVins}</div>
              </div>
              <div style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#FFFFFF', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.9 }}>NOK Авто</div>
                <div style={{ width: '70%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '10px auto' }}></div>
                <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}>{nokVins}</div>
              </div>
            </div>
          </div>

          <div style={rightColumnStyle}>
            <div style={tableCardStyle}>
              <h2 style={tableTitleStyle}>Топ дефектов, повлиявших на DRR CP7</h2>
              <div style={tableScrollStyle}>
                {data.topDefects.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Описание дефекта (MPP)</th>
                        <th style={thStyle}>Класс</th>
                        <th style={thStyle}>Кол-во авто</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topDefects.map((defect, idx) => (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                          <td style={{ ...tdStyle, boxShadow: idx < 3 ? 'inset 10px 0 0 #EF4444' : 'none' }}>{defect.mpp}</td>
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