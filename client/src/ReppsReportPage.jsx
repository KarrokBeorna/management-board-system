import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Cell,
} from 'recharts';

const API_BASE = '';

/* ===================== ЦВЕТА ===================== */
const reppsBarTypeColors = {
  year: '#7C3AED',
  month: '#0EA5E9',
  week: '#14B8A6',
  day: '#F59E0B',
};

const reppsTypeBgColors = {
  year: '#F3E8FF',
  month: '#E0F2FE',
  week: '#CCFBF1',
  day: '#FEF3C7',
};

const stackColors = {
  before: '#94A3B8',
  paint: '#EC4899',
};

const modelColors = {
  'ESTEO MX': '#F59E0B',
  'JELAND J6': '#6EE7B7',
  'JELAND J7': '#8B5CF6',
  'TENET A8': '#3B82F6',
  'JELAND J8': '#EC4899',
};

const modelShortNames = {
  'ESTEO MX': 'MX',
  'JELAND J6': 'J6',
  'JELAND J7': 'J7',
  'TENET A8': 'A8',
  'JELAND J8': 'J8',
  'total': 'Total',
};

/* ============ ФИКСИРОВАННЫЕ ВЫСОТЫ ============ */
const H_SECTION_TITLE = 26;
const H_CHART_TITLE = 22;
const H_CHART_1 = 200;
const H_CHART_2 = 220;

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
};

const sectionCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: 14,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const tabStyle = (active) => ({
  padding: '10px 28px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 600,
  fontSize: 15,
  background: active ? '#7C3AED' : '#F3F4F6',
  color: active ? '#FFFFFF' : '#6B7280',
  cursor: 'pointer',
  boxShadow: active ? '0 4px 12px rgba(124,58,237,0.25)' : 'none',
  transition: 'all 0.2s',
});

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
};

const thStyle = {
  textAlign: 'center',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
  padding: '5px 4px',
  fontSize: '10px',
};

const tdStyle = {
  textAlign: 'center',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
  whiteSpace: 'nowrap',
  padding: '3px 4px',
  fontSize: '11px',
};

const sectionTitleStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 10px 0',
  paddingBottom: 6,
  borderBottom: '2px solid #E5E7EB',
  height: H_SECTION_TITLE,
  boxSizing: 'border-box',
};

const chartTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#374151',
  margin: '6px 0 6px 0',
  height: H_CHART_TITLE,
  display: 'flex',
  alignItems: 'center',
};

/* Раздел «Сплит» — с верхней разделительной линией */
const splitTitleStyle = {
  ...chartTitleStyle,
  marginTop: 16,
  paddingTop: 14,
  borderTop: '2px dashed #CBD5E1',
  height: H_CHART_TITLE + 30,
  boxSizing: 'border-box',
};

const tableWrapStyle = {
  marginTop: 8,
  border: '1px solid #E5E7EB',
  borderRadius: 6,
  overflow: 'hidden',
};

/* ===================== Хелперы ===================== */
const shortenLabel = (label, type) => {
  if (type === 'month') {
    const [m, y] = label.split(' ');
    return y ? `${m}'${y.slice(2)}` : m;
  }
  if (type === 'week') {
    return label.split(' ')[0];
  }
  return label;
};

export default function ReppsReportPage() {
  const [period, setPeriod] = useState('all');
  const [count, setCount] = useState(3);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [dataPoints, setDataPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === 'all') {
      setFromDate('');
      setToDate('');
    } else {
      const defaults = { year: 2, month: 3, week: 4, day: 14 };
      setCount(defaults[newPeriod] || 3);
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period !== 'all' && count) params.append('count', count);
    if (period !== 'all' && fromDate && toDate) {
      params.append('fromDate', fromDate);
      params.append('toDate', toDate);
    }
    fetch(`${API_BASE}/api/repps-retrospective?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setDataPoints(json.dataPoints || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Ошибка загрузки REPPS:', err);
        setLoading(false);
      });
  }, [period, count, fromDate, toDate]);

  const chartData = useMemo(() => dataPoints.map(p => ({ ...p })), [dataPoints]);

  const groupedByType = useMemo(() => {
    if (period !== 'all') return null;
    return {
      months: chartData.filter(p => p.type === 'month'),
      weeks:  chartData.filter(p => p.type === 'week'),
      days:   chartData.filter(p => p.type === 'day'),
    };
  }, [chartData, period]);

  const barDataKey = selectedModel === 'ALL' ? 'total' : selectedModel;
  const stackPart1Key = selectedModel === 'ALL' ? 'total_minus_paint' : `${selectedModel}_minus_paint`;
  const stackPart2Key = selectedModel === 'ALL' ? 'paint' : `${selectedModel}_paint`;

  const modelKeys = Object.keys(modelColors);

  /* ===================== CHART 1 ===================== */
  const renderBasicChart = (points) => {
    if (!points.length) return <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>;
    const displayData = points.map(p => ({ ...p, displayLabel: shortenLabel(p.label, p.type) }));

    return (
      <ResponsiveContainer width="100%" height={H_CHART_1}>
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="displayLabel" tick={{ fontSize: 10 }} interval={0} height={28} />
          <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
          <Bar
            dataKey={barDataKey}
            barSize={22}
            radius={[4, 4, 0, 0]}
            label={{
              fill: '#111827', fontSize: 10, fontWeight: 700, position: 'top',
              formatter: (v) => v !== null && v !== undefined && v > 0 ? v : '',
            }}
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={reppsBarTypeColors[entry.type]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ===================== CHART 2 ===================== */
  const renderStackChart = (points) => {
    if (!points.length) return <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>;
    const displayData = points.map(p => ({ ...p, displayLabel: shortenLabel(p.label, p.type) }));

    return (
      <ResponsiveContainer width="100%" height={H_CHART_2}>
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="displayLabel" tick={{ fontSize: 10 }} interval={0} height={28} />
          <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
          <Bar dataKey={stackPart1Key} stackId="split" fill={stackColors.before} barSize={22} />
          <Bar
            dataKey={stackPart2Key}
            stackId="split"
            fill={stackColors.paint}
            barSize={22}
            radius={[4, 4, 0, 0]}
            label={{
              fill: '#111827',
              fontSize: 10,
              fontWeight: 700,
              position: 'top',
              formatter: (v) => v !== null && v !== undefined && v > 0 ? v : '',
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ===================== Таблицы ===================== */
  const renderBasicTable = (points) => {
    if (!points.length) return null;
    const displayLabels = points.map(p => shortenLabel(p.label, p.type));

    return (
      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={{ ...thStyle, width: 40, paddingLeft: 6, textAlign: 'left' }}>Мод.</th>
              {points.map((point, idx) => (
                <th key={idx} style={{ ...thStyle, backgroundColor: reppsTypeBgColors[point.type] }}>
                  {displayLabels[idx]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(selectedModel === 'ALL' ? [...modelKeys, 'total'] : [selectedModel]).map(modelKey => (
              <tr key={modelKey} style={{
                backgroundColor: modelKey === 'total' ? '#F3F4F6' : 'white',
                fontWeight: modelKey === 'total' ? 700 : 400,
                display: (selectedModel !== 'ALL' && modelKey === 'total') ? 'none' : undefined,
              }}>
                <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', fontWeight: 600 }}>
                  {modelShortNames[modelKey] || modelKey}
                </td>
                {points.map((point, idx) => {
                  const val = modelKey === 'total' ? point.total : point[modelKey];
                  return (
                    <td key={idx} style={{
                      ...tdStyle,
                      backgroundColor: reppsTypeBgColors[point.type],
                      color: val !== null && val !== undefined ? '#1F2937' : '#9CA3AF',
                    }}>
                      {val !== null && val !== undefined ? val : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderStackTable = (points) => {
    if (!points.length) return null;
    const displayLabels = points.map(p => shortenLabel(p.label, p.type));

    return (
      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={{ ...thStyle, width: 40, paddingLeft: 6, textAlign: 'left' }}>Кат.</th>
              {points.map((point, idx) => (
                <th key={idx} style={{ ...thStyle, backgroundColor: reppsTypeBgColors[point.type] }}>
                  {displayLabels[idx]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: 'white' }}>
              <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', color: stackColors.before, fontWeight: 700 }}>Без PS</td>
              {points.map((point, idx) => {
                const val = selectedModel === 'ALL' ? point.total_minus_paint : point[stackPart1Key];
                return (
                  <td key={idx} style={{
                    ...tdStyle, backgroundColor: reppsTypeBgColors[point.type],
                    fontWeight: 700, color: stackColors.before,
                  }}>
                    {val !== null && val !== undefined ? val : ''}
                  </td>
                );
              })}
            </tr>
            <tr style={{ backgroundColor: 'white' }}>
              <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', color: stackColors.paint, fontWeight: 700 }}>С PS</td>
              {points.map((point, idx) => {
                const val = selectedModel === 'ALL' ? point.paint : point[stackPart2Key];
                return (
                  <td key={idx} style={{
                    ...tdStyle, backgroundColor: reppsTypeBgColors[point.type],
                    fontWeight: 700, color: stackColors.paint,
                  }}>
                    {val !== null && val !== undefined ? val : ''}
                  </td>
                );
              })}
            </tr>
            <tr style={{ backgroundColor: '#F3F4F6', fontWeight: 700 }}>
              <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left' }}>Всего</td>
              {points.map((point, idx) => {
                const val = selectedModel === 'ALL' ? point.total : point[selectedModel];
                return (
                  <td key={idx} style={tdStyle}>
                    {val !== null && val !== undefined ? val : ''}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  /* ===================== Секция ===================== */
  const renderSection = (title, points, accent) => (
    <div key={title} style={sectionCardStyle}>
      <h2 style={{ ...sectionTitleStyle, color: accent }}>{title}</h2>

      <h3 style={chartTitleStyle}>🛠️ Зашло в REPPS</h3>
      {renderBasicChart(points)}
      {renderBasicTable(points)}

      <h3 style={splitTitleStyle}>🎨 Сплит paint shop</h3>
      {renderStackChart(points)}
      {renderStackTable(points)}
    </div>
  );

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1500, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 20 }}>REPPS Report</h1>

      {/* ============ ФИЛЬТРЫ ============ */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>Период:</span>
            <button onClick={() => handlePeriodChange('all')} style={tabStyle(period === 'all')}>Все</button>
            <button onClick={() => handlePeriodChange('year')} style={tabStyle(period === 'year')}>Год</button>
            <button onClick={() => handlePeriodChange('month')} style={tabStyle(period === 'month')}>Месяц</button>
            <button onClick={() => handlePeriodChange('week')} style={tabStyle(period === 'week')}>Неделя</button>
            <button onClick={() => handlePeriodChange('day')} style={tabStyle(period === 'day')}>День</button>
          </div>

          {period !== 'all' && (
            <>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>От:</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>По:</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => { setFromDate(''); setToDate(''); }}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#9CA3AF', color: '#FFF', cursor: 'pointer' }}
                  >✕</button>
                )}
              </div>
            </>
          )}

          <label style={{ fontSize: 14, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
            Модель:
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={inputStyle}>
              {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* ============ СОДЕРЖИМОЕ ============ */}
      {loading ? (
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Загрузка данных...</p>
        </div>
      ) : period === 'all' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)',
          gap: 16,
          alignItems: 'start',
        }}>
          {renderSection('📅 3 месяца', groupedByType.months, '#0EA5E9')}
          {renderSection('📆 4 недели',  groupedByType.weeks,  '#14B8A6')}
          {renderSection('📊 14 дней',   groupedByType.days,   '#F59E0B')}
        </div>
      ) : (
        <>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>🛠️ Зашло в ремзону REPPS</h2>
            {renderBasicChart(chartData)}
            {renderBasicTable(chartData)}
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ ...splitTitleStyle, margin: 0, border: 'none', borderTop: '2px dashed #CBD5E1', paddingTop: 14 }}>
                🎨 Сплит по paint shop дефектам
              </h2>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#4B5563', marginTop: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, backgroundColor: stackColors.before, borderRadius: 3, display: 'inline-block' }} />
                  Без paint shop дефекта
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, backgroundColor: stackColors.paint, borderRadius: 3, display: 'inline-block' }} />
                  С paint shop дефектом
                </span>
              </div>
            </div>
            {renderStackChart(chartData)}
            {renderStackTable(chartData)}
          </div>
        </>
      )}
    </div>
  );
}