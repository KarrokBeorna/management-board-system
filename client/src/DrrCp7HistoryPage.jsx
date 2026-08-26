import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Label, ResponsiveContainer, Cell, LabelList
} from 'recharts';

const API_BASE = '';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  marginBottom: 30,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
};

const tabStyle = (active) => ({
  padding: '10px 28px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 600,
  fontSize: 15,
  background: active ? '#2563EB' : '#F3F4F6',
  color: active ? '#FFFFFF' : '#6B7280',
  cursor: 'pointer',
  boxShadow: active ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
  transition: 'all 0.2s',
});

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
};

const buttonStyle = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#2563EB',
  color: 'white',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

export default function DrrCp7HistoryPage() {
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13); // последние 14 дней
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Сегодняшняя дата по московскому времени (UTC+3)
  const todayMoscow = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];

  const formatDateLabel = (dateStr) => {
    const parts = dateStr.split('-');
    return `${parts[2]}.${parts[1]}`;
  };

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const dates = [];
      let current = new Date(dateFrom);
      const end = new Date(dateTo);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      const results = await Promise.all(
        dates.map(async (date) => {
          let value;
          if (date === todayMoscow) {
            // Для сегодняшнего дня используем дашборд (сутки)
            const start = `${date} 00:00:00`;
            const end = `${date} 23:59:59`;
            const params = new URLSearchParams({ filter, startTime: start, endTime: end });
            const res = await fetch(`${API_BASE}/api/drr-cp7-dashboard?${params.toString()}`);
            if (!res.ok) throw new Error('Ошибка загрузки сегодня');
            const json = await res.json();
            value = json.drrPercent;
          } else {
            // Для прошлых дней используем исторический расчёт
            const params = new URLSearchParams({ filter, date });
            const res = await fetch(`${API_BASE}/api/drr-cp7-history?${params.toString()}`);
            if (!res.ok) throw new Error('Ошибка загрузки истории');
            const json = await res.json();
            value = json.drrPercent;
          }
          return { label: formatDateLabel(date), value };
        })
      );

      setData(results);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filter, dateFrom, dateTo]);

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>DRR CP7 History</h1>

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 30, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilter('all')} style={tabStyle(filter === 'all')}>Все</button>
        <button onClick={() => setFilter('cp7')} style={tabStyle(filter === 'cp7')}>CP7</button>
        <button onClick={() => setFilter('pip')} style={tabStyle(filter === 'pip')}>PIP</button>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563' }}>
          Период:
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          <span>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </label>

        <button onClick={loadHistory} style={buttonStyle}>🔄 Обновить</button>
      </div>

      {/* График */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
          Динамика DRR CP7
        </h2>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Загрузка данных...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: '#DC2626', padding: 20 }}>❌ {error}</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="5 5">
                <Label value="80%" position="right" style={{ fill: '#EF4444', fontSize: 14, fontWeight: 700 }} />
              </ReferenceLine>
              <Bar dataKey="value" barSize={30} radius={[6, 6, 0, 0]} fill="#10B981">
                <LabelList dataKey="value" position="top" formatter={(v) => `${v}%`} style={{ fill: '#1F2937', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}