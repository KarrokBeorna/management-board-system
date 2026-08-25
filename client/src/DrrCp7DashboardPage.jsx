import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = '';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
  border: '1px solid #F0F0F5',
};

const filterButtonStyle = (active) => ({
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  fontSize: 14,
  background: active ? '#2563EB' : '#F3F4F6',
  color: active ? '#FFFFFF' : '#6B7280',
  cursor: 'pointer',
  boxShadow: active ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
  transition: 'all 0.2s',
  marginRight: 8,
});

const thStyle = {
  padding: '12px 14px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
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
    { name: 'DRR %', value: data.drrPercent },
    { name: '1-DRR %', value: Math.max(0, 100 - data.drrPercent) },
  ];

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>
        DRR CP7 Dashboard
      </h1>

      {/* Фильтры */}
      <div style={{ marginBottom: 20 }}>
        <button style={filterButtonStyle(filter === 'all')} onClick={() => setFilter('all')}>Все</button>
        <button style={filterButtonStyle(filter === 'cp7')} onClick={() => setFilter('cp7')}>CP7</button>
        <button style={filterButtonStyle(filter === 'pip')} onClick={() => setFilter('pip')}>PIP</button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: 40 }}>Загрузка данных...</p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#DC2626' }}>❌ {error}</p>
      ) : (
        <>
          {/* Карточка с диаграммой и цифрами */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ ...cardStyle, flex: '1 1 400px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>DRR распределение</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...cardStyle, flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Ключевые показатели</h2>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: '#6B7280' }}>Всего автомобилей (CP72)</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#1F2937' }}>{data.totalVins}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: '#6B7280' }}>Авто с закрытыми дефектами</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981' }}>{data.closedVins}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#6B7280' }}>DRR %</div>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#2563EB' }}>{data.drrPercent.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Топ дефектов */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Топ дефектов, повлиявших на DRR
            </h2>
            {data.topDefects.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Описание дефекта</th>
                      <th style={thStyle}>Класс</th>
                      <th style={thStyle}>Количество автомобилей</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topDefects.map((defect, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        <td style={tdStyle}>{defect.description}</td>
                        <td style={tdStyle}>{defect.grade}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{defect.affectedVins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>Нет данных</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}