import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '';

// ====== ГЛАВНЫЙ КОНТЕЙНЕР ======
const containerStyle = {
  padding: '20px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  width: '100%',
  height: '100vh', // Фиксируем высоту под один экран
  boxSizing: 'border-box',
  backgroundColor: '#F8FAFC',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

// ====== ШАПКА ======
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
  marginLeft: '10px',
});

// ====== ОСНОВНАЯ СЕТКА (Чарт слева 40%, Правая часть 60%) ======
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
  justifyContent: 'center',
  boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
  minHeight: 0,
};

const rightColumnStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  minHeight: 0,
};

// ====== KPI БЛОКИ (Единый формат) ======
const kpiRowStyle = {
  display: 'flex',
  gap: '20px',
  flexShrink: 0,
};

const kpiCardStyle = (color) => ({
  flex: 1,
  background: color,
  borderRadius: '20px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  color: '#FFFFFF',
  textAlign: 'center',
});

// Единый размер подписи и цифры для всех блоков
const kpiLabelStyle = {
  fontSize: '1.6rem',
  fontWeight: 600,
  opacity: 0.95,
  marginBottom: '8px',
  lineHeight: 1.4, // Перенос слов в подписи
};

const kpiValueStyle = {
  fontSize: '4rem',
  fontWeight: 900,
  lineHeight: 1,
};

// ====== ТАБЛИЦА (Высота под 5 строк) ======
const tableCardStyle = {
  flex: 2, // Увеличиваем высоту для таблицы
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

export default function DrrCp7DashboardPage() {
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState({ totalVins: 0, closedVins: 0, drrPercent: 0, topDefects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Функция загрузки данных
  const loadData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/drr-cp7-dashboard?filter=${filter}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Первичная загрузка и обновление (ПУНКТ 1)
  useEffect(() => {
    loadData();

    // Обновление каждые 30 секунд (30 000 мс)
    const interval = setInterval(loadData, 30000);

    // Очистка интервала при уходе со страницы
    return () => clearInterval(interval);
  }, [filter]);

  const pieData = [
    { name: 'DRR, %', value: data.drrPercent },
    { name: 'Не прямой сход, %', value: Math.max(0, 100 - data.drrPercent) },
  ];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>DRR CP7 Dashboard</h1>
        <div>
          <button style={filterButtonStyle(filter === 'all')} onClick={() => setFilter('all')}>Все</button>
          <button style={filterButtonStyle(filter === 'cp7')} onClick={() => setFilter('cp7')}>CP7</button>
          <button style={filterButtonStyle(filter === 'pip')} onClick={() => setFilter('pip')}>PIP</button>
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
          
          {/* ЛЕВАЯ КОЛОНКА (40%) - Pie Chart с анимацией */}
          <div style={chartColumnStyle}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1E293B', margin: '0 0 20px 0' }}>DRR распределение</h2>
            
            <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
              {/* Увеличиваем отступы и уменьшаем радиус, чтобы подписи НЕ ОБРЕЗАЛИСЬ (ПУНКТ 2) */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="50%" 
                    outerRadius="70%"
                    paddingAngle={4}
                    stroke="#FFFFFF"
                    strokeWidth={4}
                    labelLine={{ stroke: '#CBD5E1', strokeWidth: 2 }}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    fontSize="1.6rem"
                    fontWeight="bold"
                    fill="#333"
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
              
              {/* ЦИФРА В ЦЕНТРЕ (Появляется с плавной анимацией одновременно с графиком, ПУНКТ 3) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                // Плавное появление (Fade In)
                animation: 'fadeIn 1s ease-out forwards',
                opacity: 0,
              }}>
                <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
                <div style={{ fontSize: '5rem', fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
                  {data.totalVins}
                </div>
              </div>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА (60%) - KPI + Таблица */}
          <div style={rightColumnStyle}>
            
            {/* KPI Блоки (Единый формат цифр и подписей, ПУНКТ 4) */}
            <div style={kpiRowStyle}>
              <div style={kpiCardStyle('#1E293B')}>
                <div style={kpiLabelStyle}>Всего авто, прошедших CP72</div>
                <div style={kpiValueStyle}>{data.totalVins}</div>
              </div>
              
              <div style={kpiCardStyle('#059669')}>
                <div style={kpiLabelStyle}>Авто со всеми закрытыми дефектами</div>
                <div style={kpiValueStyle}>{data.closedVins}</div>
              </div>
              
              <div style={kpiCardStyle('linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)')}>
                <div style={kpiLabelStyle}>DRR, %</div>
                <div style={kpiValueStyle}>{data.drrPercent.toFixed(1)}%</div>
              </div>
            </div>

            {/* Таблица дефектов (Вывод 5 строк, ПУНКТ 5) */}
            <div style={tableCardStyle}>
              <h2 style={tableTitleStyle}>Топ дефектов, повлиявших на DRR</h2>
              
              <div style={tableScrollStyle}>
                {/* slice(0, 5) - жесткое ограничение на 5 строк */}
                {data.topDefects.slice(0, 5).length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Описание дефекта</th>
                        <th style={thStyle}>Класс</th>
                        <th style={thStyle}>Кол-во авто</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topDefects.slice(0, 5).map((defect, idx) => (
                        <tr 
                          key={idx} 
                          style={{ 
                            backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                            borderLeft: idx < 3 ? '10px solid #EF4444' : '10px solid transparent'
                          }}
                        >
                          <td style={tdStyle}>{defect.description}</td>
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