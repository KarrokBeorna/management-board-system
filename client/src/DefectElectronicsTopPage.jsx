import React, { useState, useEffect } from 'react';

const API_BASE = '';

const containerStyle = {
  padding: '20px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  maxWidth: 1200,
  margin: '0 auto',
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
};

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 16px',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
};

const selectStyle = {
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
};

export default function DefectElectronicsTopPage() {
  const [model, setModel] = useState('ALL');
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekOptions, setWeekOptions] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Генерируем последние 8 недель (пн-вс)
    const options = [];
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      options.push({
        value: i,
        label: `CW${getWeekNumber(monday)} (${formatDate(monday)} – ${formatDate(sunday)})`,
        start: formatDate(monday),
        end: formatDate(sunday),
      });
    }
    setWeekOptions(options);
  }, []);

  useEffect(() => {
    loadData();
  }, [weekOffset, model]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const week = weekOptions.find(w => w.value === weekOffset);
      if (!week) return;
      const params = new URLSearchParams({
        weekStart: week.start,
        weekEnd: week.end,
        model,
      });
      const res = await fetch(`${API_BASE}/api/drr-electronics-top-defects?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  function getWeekNumber(d) {
    const temp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    return Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
  }

  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 24 }}>
        Топ дефектов электроники
      </h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Неделя:</label>
        <select value={weekOffset} onChange={e => setWeekOffset(Number(e.target.value))} style={selectStyle}>
          {weekOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label style={{ fontSize: 14, fontWeight: 600 }}>Модель:</label>
        <select value={model} onChange={e => setModel(e.target.value)} style={selectStyle}>
          <option value="ALL">Все модели</option>
          <option value="ESTEO MX">ESTEO MX</option>
          <option value="JELAND J6">JELAND J6</option>
          <option value="JELAND J7">JELAND J7</option>
          <option value="JELAND J8">JELAND J8</option>
          <option value="TENET A8">TENET A8</option>
        </select>

        <button onClick={loadData} style={buttonStyle}>🔄 Обновить</button>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Загрузка данных...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: '#DC2626', padding: 20 }}>❌ {error}</p>
        ) : data.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Нет данных</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>Описание дефекта (MPP)</th>
                <th style={thStyle}>Класс</th>
                <th style={thStyle}>Кол-во дефектов</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                  <td style={tdStyle}>{item.mpp}</td>
                  <td style={tdStyle}>{item.grade}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{item.defectCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}