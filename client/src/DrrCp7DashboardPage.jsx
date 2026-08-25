import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '';

// ====== ГЛОБАЛЬНЫЕ СТИЛИ (Крупные, для ТВ) ======
const containerStyle = {
  padding: '2vw',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  maxWidth: '100%',
  margin: '0 auto',
  backgroundColor: '#F8FAFC',
  minHeight: '100vh',
  boxSizing: 'border-box',
  width: '100%',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '2vw',
  flexWrap: 'wrap',
  gap: '20px',
};

const titleStyle = {
  fontSize: '3rem', // 48px
  fontWeight: 900,
  color: '#1E293B',
  margin: 0,
  letterSpacing: '-1px',
};

const filterButtonStyle = (active) => ({
  padding: '1.2rem 3rem',
  borderRadius: '16px',
  border: 'none',
  fontWeight: 800,
  fontSize: '1.5rem', // 24px
  background: active ? '#2563EB' : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
  cursor: 'pointer',
  boxShadow: active ? '0 8px 20px rgba(37,99,235,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
  transition: 'all 0.2s',
  marginRight: '12px',
});

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '2rem',
  padding: '2.5rem',
  boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
  border: '1px solid #E2E8F0',
};

// ====== СТИЛИ ДЛЯ ГИГАНТСКОЙ ДИАГРАММЫ ======
const chartCardStyle = {
  ...cardStyle,
  flex: '1 1 65%', // Диаграмма занимает 65% ширины
  minWidth: '500px',
};

const kpiCardStyle = {
  ...cardStyle,
  flex: '1 1 30%', // KPI занимают 30%
  minWidth: '350px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

// ====== KPI КАРТОЧКИ (Огромные) ======
const KpiCard = ({ label, value, color }) => (
  <div style={{
    background: color,
    borderRadius: '20px',
    padding: '24px',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    flex: 1,
  }}>
    <div style={{ fontSize: '1.8rem', fontWeight: 600, opacity: 0.95, marginBottom: '8px' }}>{label}</div>
    <div style={{ fontSize: '4.5rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
  </div>
);

// ====== СТИЛИ ТАБЛИЦЫ (Крупные) ======
const thStyle = {
  padding: '24px 32px',
  textAlign: 'left',
  fontWeight: 800,
  color: '#475569',
  borderBottom: '3px solid #E2E8F0',
  background: '#F8FAFC',
  fontSize: '1.8rem', // 28px
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '20px 32px',
  borderBottom: '1px solid #F1F5F9',
  color: '#1E293B',
  fontSize: '1.6rem', // 25px
};

const PIE_COLORS = ['#10B981', '#EF4444'];

export default function DrrCp7DashboardPage() {
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState({ totalVins: 0, closedVins: 0, drrPercent: 0, topDefects: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/drr-cp7-dashboard?filter=${filter}`);
        if (!res.ok) throw new Error('Ошибка загрузки данных');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filter]);

  const pieData = [
    { name: 'DRR, %', value: data.drrPercent },
    { name: 'Не прямой сход, %', value: Math.max(0, 100 - data.drrPercent) },
  ];

  return (
    <div style={containerStyle}>
      {/* Заголовок и фильтры */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>DRR CP7 Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={filterButtonStyle(filter === 'all')} onClick={() => setFilter('all')}>Все</button>
          <button style={filterButtonStyle(filter === 'cp7')} onClick={() => setFilter('cp7')}>CP7</button>
          <button style={filterButtonStyle(filter === 'pip')} onClick={() => setFilter('pip')}>PIP</button>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '3rem', textAlign: 'center', padding: '60px', color: '#64748B' }}>Загрузка данных...</div>
      ) : error ? (
        <div style={{ fontSize: '3rem', textAlign: 'center', color: '#DC2626' }}>❌ {error}</div>
      ) : (
        <>
          {/* Верхний блок: Диаграмма (слева, огромная) + KPI (справа) */}
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '40px', alignItems: 'stretch' }}>
            
            {/* ЛЕВАЯ ЧАСТЬ: Pie Chart - занимает больше всего места */}
            <div style={chartCardStyle}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>
                DRR распределение
              </h2>
              <div style={{ position: 'relative', width: '100%', height: '650px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%" // Толще, чтобы цифра в центре помещалась
                      outerRadius="85%"
                      paddingAngle={4}
                      stroke="#FFFFFF"
                      strokeWidth={6}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      labelLine={{ stroke: '#CBD5E1', strokeWidth: 3 }}
                      fontSize="1.8rem"
                      fontWeight="bold"
                      fill="#333"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${value.toFixed(1)}%`}
                      contentStyle={{ fontSize: '2rem', borderRadius: '16px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* ЦИФРА В ЦЕНТРЕ ДИАГРАММЫ (без подписи, просто огромная) */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: '7rem', fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
                    {data.totalVins}
                  </div>
                </div>
              </div>
            </div>

            {/* ПРАВАЯ ЧАСТЬ: KPI */}
            <div style={kpiCardStyle}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E293B', margin: '0 0 8px 0' }}>
                Ключевые показатели
              </h2>
              
              <KpiCard 
                label="Всего авто, прошедших CP72" 
                value={data.totalVins} 
                color="#1E293B" 
              />
              
              <KpiCard 
                label="Авто со всеми закрытыми дефектами" 
                value={data.closedVins} 
                color="#059669" 
              />
              
              {/* Синяя карточка DRR - огромная, белый текст */}
              <div style={{ 
                background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)', 
                borderRadius: '20px', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                flex: 1.5
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: '#FFFFFF', opacity: 0.9, marginBottom: '4px' }}>
                  DRR, %
                </div>
                <div style={{ fontSize: '8rem', fontWeight: 900, lineHeight: 1, color: '#FFFFFF' }}>
                  {data.drrPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* НИЖНИЙ БЛОК: Таблица дефектов */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E293B', marginBottom: '32px' }}>
              Топ дефектов, повлиявших на DRR
            </h2>
            {data.topDefects.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Описание дефекта</th>
                      <th style={thStyle}>Класс</th>
                      <th style={thStyle}>Количество автомобилей</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topDefects.map((defect, idx) => (
                      <tr 
                        key={idx} 
                        style={{ 
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          borderLeft: idx < 3 ? '10px solid #EF4444' : '10px solid transparent'
                        }}
                      >
                        <td style={tdStyle}>{defect.description}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#475569' }}>{defect.grade}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, fontSize: '2.2rem', color: idx < 3 ? '#DC2626' : '#1E293B' }}>
                          {defect.affectedVins}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '2rem' }}>Нет данных</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}