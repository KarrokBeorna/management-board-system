import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Label, ResponsiveContainer, Cell
} from 'recharts';

const API_BASE = 'http://localhost:40000';

const modelColors = {
  'ESTEO MX': '#F59E0B',
  'JELAND J6': '#6EE7B7',
  'JELAND J7': '#8B5CF6',
  'TENET A8': '#3B82F6',
  'JELAND J8': '#EC4899',
};

const typeColors = {
  year: '#F0F9FF',
  month: '#F0FFF4',
  week: '#FFF7ED',
  day: '#FEF2F2',
};

const barTypeColors = {
  year: '#0284C7',
  month: '#16A34A',
  week: '#EA580C',
  day: '#DC2626',
};

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

export default function DrrReportPage() {
  const today = new Date();
  const twoYearsAgo = new Date(today.getFullYear() - 2, 0, 1);
  const initialDateFrom = twoYearsAgo.toISOString().split('T')[0];
  const initialDateTo = today.toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState('factory');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [dataPoints, setDataPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'factory') return;
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    fetch(`${API_BASE}/api/drr-retrospective?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setDataPoints(json.dataPoints || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Ошибка загрузки DRR:', err);
        setLoading(false);
      });
  }, [activeTab, dateFrom, dateTo]);

  const chartData = useMemo(() => {
    return dataPoints.map(point => {
      const modelValues = Object.entries(point)
        .filter(([key]) => key !== 'label' && key !== 'type' && key !== 'total')
        .map(([, val]) => val)
        .filter(v => v !== null && v !== undefined);
      const max = modelValues.length > 0 ? Math.max(...modelValues) : 0;
      return { ...point, maxValue: max };
    });
  }, [dataPoints]);

  const barDataKey = selectedModel === 'ALL' ? 'maxValue' : selectedModel;
  const modelKeys = Object.keys(modelColors);

  // Количество столбцов с данными (включая первый столбец "Модель")
  const totalCols = chartData.length + 1;
  // Одинаковая ширина для всех колонок
  const colWidth = `${100 / totalCols}%`;

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>DRR Report</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
        <button onClick={() => setActiveTab('factory')} style={tabStyle(activeTab === 'factory')}>По заводу</button>
        <button onClick={() => setActiveTab('workshops')} style={tabStyle(activeTab === 'workshops')}>По цехам</button>
        <button onClick={() => setActiveTab('cp78')} style={tabStyle(activeTab === 'cp78')}>По CP7/СР8</button>
      </div>

      {activeTab === 'factory' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Выход годной продукции с первого раза - Ретроспектива</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ fontSize: 14, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                Период:
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB' }} />
                <span>—</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB' }} />
              </label>
              <button onClick={() => alert('Excel export coming soon')} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFF', fontWeight: 600, cursor: 'pointer',
              }}>📊 Excel</button>
              <label style={{ fontSize: 14, color: '#4B5563' }}>
                Модель:
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB' }}
                >
                  <option value="ALL">Все</option>
                  {modelKeys.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Загрузка данных...</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="5 5">
                    <Label value="80%" position="right" style={{ fill: '#EF4444', fontSize: 14, fontWeight: 700 }} />
                  </ReferenceLine>
                  <Tooltip />
                  <Bar
                    dataKey={barDataKey}
                    barSize={28}
                    radius={[6, 6, 0, 0]}
                    label={{
                      fill: '#DC2626',
                      fontSize: 12,
                      fontWeight: 600,
                      position: 'top',
                      formatter: (v) => v !== null && v !== undefined ? `${v}%` : '',
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={barTypeColors[entry.type]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={{ ...thStyle, width: colWidth, paddingLeft: 16 }}>Модель</th>
                      {chartData.map((point, idx) => (
                        <th key={idx} style={{
                          ...thStyle,
                          width: colWidth,
                          backgroundColor: typeColors[point.type]
                        }}>
                          {point.label}
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
                        <td style={{ ...tdStyle, width: colWidth, paddingLeft: 16 }}>{modelKey === 'total' ? 'Total' : modelKey}</td>
                        {chartData.map((point, idx) => {
                          const val = modelKey === 'total' ? point.maxValue : point[modelKey];
                          return (
                            <td key={idx} style={{
                              ...tdStyle,
                              width: colWidth,
                              backgroundColor: typeColors[point.type],
                              color: val !== null && val !== undefined ? '#1F2937' : '#9CA3AF'
                            }}>
                              {val !== null && val !== undefined ? `${val}%` : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'workshops' && (
        <div style={cardStyle}>
          <p style={{ color: '#6B7280', fontSize: 16, textAlign: 'center' }}>Данный раздел находится в разработке.</p>
        </div>
      )}

      {activeTab === 'cp78' && (
        <div style={cardStyle}>
          <p style={{ fontSize: 16, color: '#374151', marginBottom: 20, textAlign: 'center' }}>
            Отчёт по дефектам CP7/CP8 (DRR Defects Top).
          </p>
          <div style={{ textAlign: 'center' }}>
            <a
              href="/mpp-weekly-top"
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 16,
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
              }}
            >
              Перейти к DRR Defects Top CP7/СP8
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'center',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
  padding: '6px 4px',
  fontSize: '10px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const tdStyle = {
  textAlign: 'center',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
  whiteSpace: 'nowrap',
  padding: '4px 4px',
  fontSize: '10px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};