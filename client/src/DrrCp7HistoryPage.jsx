import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Label, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

const thStyle = {
  textAlign: 'center',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
  padding: '6px 4px',
  fontSize: '11px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const tdStyle = {
  textAlign: 'center',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
  whiteSpace: 'nowrap',
  padding: '4px 4px',
  fontSize: '14px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export default function DrrCp7HistoryPage() {
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('combo'); // combo, year, month, week, day
  const [count, setCount] = useState(3);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'combo') {
      const defaults = { year: 2, month: 3, week: 4, day: 14 };
      setCount(defaults[newPeriod]);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter, period });
      if (period !== 'combo' && count) params.append('count', count);
      const res = await fetch(`${API_BASE}/api/drr-cp7-history?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData(json.periods || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filter, period, count]);

  const chartData = useMemo(() => data, [data]);

  const exportToExcel = () => {
    const exportData = data.map(d => ({
      'Период': d.label,
      'Тип': d.type,
      'DRR %': d.drr,
      'Всего авто': d.totalVins,
      'ОК авто': d.closedVins,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DRR CP7 History');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `drr_cp7_history_${period}.xlsx`);
  };

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>DRR CP7 History</h1>

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 30, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilter('all')} style={tabStyle(filter === 'all')}>Все</button>
        <button onClick={() => setFilter('cp7')} style={tabStyle(filter === 'cp7')}>CP7</button>
        <button onClick={() => setFilter('pip')} style={tabStyle(filter === 'pip')}>PIP</button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>Период:</span>
          <button onClick={() => handlePeriodChange('combo')} style={tabStyle(period === 'combo')}>Комбо</button>
          <button onClick={() => handlePeriodChange('year')} style={tabStyle(period === 'year')}>Год</button>
          <button onClick={() => handlePeriodChange('month')} style={tabStyle(period === 'month')}>Месяц</button>
          <button onClick={() => handlePeriodChange('week')} style={tabStyle(period === 'week')}>Неделя</button>
          <button onClick={() => handlePeriodChange('day')} style={tabStyle(period === 'day')}>День</button>
        </div>

        {period !== 'combo' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563' }}>
            Кол-во периодов:
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              style={{ ...inputStyle, width: 80 }}
            />
          </label>
        )}

        <button onClick={loadHistory} style={buttonStyle}>🔄 Обновить</button>
        <button onClick={exportToExcel} style={{ ...buttonStyle, background: '#059669' }}>📥 Экспорт</button>
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
            <BarChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="5 5">
                <Label value="80%" position="right" style={{ fill: '#EF4444', fontSize: 14, fontWeight: 700 }} />
              </ReferenceLine>
              <Bar dataKey="drr" barSize={28} radius={[6, 6, 0, 0]} fill="#10B981">
                <LabelList dataKey="drr" position="top" formatter={(v) => `${v}%`} style={{ fill: '#1F2937', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Таблица */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
          Данные по DRR
        </h2>
        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <table style={{ width: 'auto', minWidth: 400, maxWidth: 900, margin: '0 auto', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={thStyle}>Период</th>
                <th style={thStyle}>Тип</th>
                <th style={thStyle}>DRR %</th>
                <th style={thStyle}>Всего авто</th>
                <th style={thStyle}>ОК авто</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                  <td style={tdStyle}>{row.label}</td>
                  <td style={tdStyle}>{row.type}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#10B981' }}>{row.drr}%</td>
                  <td style={tdStyle}>{row.totalVins}</td>
                  <td style={tdStyle}>{row.closedVins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}