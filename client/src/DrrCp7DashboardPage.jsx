import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '';

// ==== СТИЛИ ДЛЯ ТВ (ОГРОМНЫЕ ЦИФРЫ, ВЫСОКИЙ КОНТРАСТ) ====
const containerStyle = {
  padding: '40px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  maxWidth: '1920px',
  margin: '0 auto',
  backgroundColor: '#F8FAFC',
  minHeight: '100vh',
  boxSizing: 'border-box',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '40px',
};

const titleStyle = {
  fontSize: '48px',
  fontWeight: 900,
  color: '#1E293B',
  margin: 0,
  letterSpacing: '-1px',
};

// Кнопки фильтров (огромные, для управления с пульта/пальцем)
const filterButtonStyle = (active) => ({
  padding: '16px 40px',
  borderRadius: '16px',
  border: 'none',
  fontWeight: 800,
  fontSize: '24px',
  background: active ? '#2563EB' : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
  cursor: 'pointer',
  boxShadow: active ? '0 8px 20px rgba(37,99,235,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
  transition: 'all 0.2s',
  marginRight: '16px',
});

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '32px',
  padding: '40px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
  border: '1px solid #E2E8F0',
};

// ==== КОМПОНЕНТ KPI (Крупный блок с цифрой) ====
const KpiCard = ({ label, value, color, suffix = '' }) => (
  <div style={{
    background: color,
    borderRadius: '24px',
    padding: '24px',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    minWidth: '220px',
    flex: 1,
  }}>
    <div style={{ fontSize: '20px', fontWeight: 600, opacity: 0.9, marginBottom: '8px' }}>{label}</div>
    <div style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1 }}>{value}{suffix}</div>
  </div>
);

// ==== СТИЛИ ТАБЛИЦЫ ====
const thStyle = {
  padding: '20px 24px',
  textAlign: 'left',
  fontWeight: 800,
  color: '#475569',
  borderBottom: '3px solid #E2E8F0',
  background: '#F8FAFC',
  fontSize: '22px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '18px 24px',
  borderBottom: '1px solid #F1F5F9',
  color: '#1E293B',
  fontSize: '22px',
};

const PIE_COLORS = ['#10B981', '#EF4444'];
const GRADIENT_GREEN = 'linear-gradient(135deg, #059669 0%, #10B981 100%)';
const GRADIENT_BLUE = 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)';
const GRADIENT_DARK = 'linear-gradient(135deg, #1E293B 0%, #334155 100%)';

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
    { name: 'DRR %', value: data.drrPercent },
    { name: '1-DRR %', value: Math.max(0, 100 - data.drrPercent) },
  ];

  return (
    <div style={containerStyle}>
      {/* Заголовок и фильтры */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>DRR CP7 Dashboard</h1>
        <div>
          <button style={filterButtonStyle(filter === 'all')} onClick={() => setFilter('all')}>Все</button>
          <button style={filterButtonStyle(filter === 'cp7')} onClick={() => setFilter('cp7')}>CP7</button>
          <button style={filterButtonStyle(filter === 'pip')} onClick={() => setFilter('pip')}>PIP</button>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '36px', textAlign: 'center', padding: '60px', color: '#64748B' }}>Загрузка данных...</div>
      ) : error ? (
        <div style={{ fontSize: '36px', textAlign: 'center', color: '#DC2626' }}>❌ {error}</div>
      ) : (
        <>
          {/* Верхний блок: Диаграмма + KPI */}
          <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
            
            {/* Левая часть: Диаграмма */}
            <div style={{ ...cardStyle, flex: '1.5' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>DRR распределение</h2>
              <div style={{ width: '100%', height: '450px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={160}
                      paddingAngle={2}
                      stroke="none"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      labelLine={{ stroke: '#CBD5E1', strokeWidth: 2 }}
                      fontSize="24px"
                      fontWeight="bold"
                      fill="#333"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${value.toFixed(1)}%`}
                      contentStyle={{ fontSize: '24px', borderRadius: '16px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Правая часть: KPI (Огромные карточки) */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1E293B', margin: '0 0 8px 0' }}>Ключевые показатели</h2>
              
              <div style={{ display: 'flex', gap: '24px' }}>
                <KpiCard label="Всего авто (CP72)" value={data.totalVins} color="#1E293B" />
                <KpiCard label="Закрытые дефекты" value={data.closedVins} color="#059669" />
              </div>
              
              <div style={{ 
                background: GRADIENT_BLUE, 
                borderRadius: '24px', 
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
                flex: 1
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, opacity: 0.9, marginBottom: '4px' }}>DRR %</div>
                  <div style={{ fontSize: '96px', fontWeight: 900, lineHeight: 1, color: '#FFFFFF' }}>
                    {data.drrPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Нижний блок: Таблица */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1E293B', marginBottom: '32px' }}>
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
                          borderLeft: idx < 3 ? '8px solid #EF4444' : '8px solid transparent'
                        }}
                      >
                        <td style={tdStyle}>{defect.description}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#475569' }}>{defect.grade}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, fontSize: '32px', color: idx < 3 ? '#DC2626' : '#1E293B' }}>
                          {defect.affectedVins}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '24px' }}>Нет данных</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}