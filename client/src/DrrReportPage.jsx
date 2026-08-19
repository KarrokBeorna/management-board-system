import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Label, ResponsiveContainer, Cell,
  PieChart, Pie, Tooltip, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API_BASE = '';

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
  'total': 'Total'
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

const PIE_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16', '#DC2626', '#059669'];

const shopNames = {
  AS: 'Цех сборки (AS)',
  BS: 'Цех сварки (BS)',
  PS: 'Цех окраски (PS)',
};

const shopColors = {
  AS: '#F59E0B',
  BS: '#3B82F6',
  PS: '#10B981',
};

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

  // === Состояния для вкладки "По цехам" ===
  const [shopTab, setShopTab] = useState('graphs');
  const [drrData, setDrrData] = useState(null);
  const [drrLoading, setDrrLoading] = useState(false);
  const [shopData, setShopData] = useState(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopModel, setShopModel] = useState('ALL');
  const [mappingText, setMappingText] = useState('');

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

  // Загрузка DRR по заводу
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

  // Загрузка DRR по цехам
  const loadDrrByShop = async () => {
    setDrrLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/drr-by-shop?weeks=10`);
      if (!res.ok) throw new Error('Ошибка загрузки DRR по цехам');
      const json = await res.json();
      setDrrData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setDrrLoading(false);
    }
  };

  // Загрузка топ дефектов цеха
  const loadShopData = async (shop) => {
    setShopLoading(true);
    try {
      const params = new URLSearchParams({ shop, model: shopModel });
      const res = await fetch(`${API_BASE}/api/shop-top-defects?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных цеха');
      const json = await res.json();
      setShopData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setShopLoading(false);
    }
  };

  // Загрузка справочника
  const loadMapping = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/part-defect-shop-mapping`);
      if (!res.ok) throw new Error('Ошибка загрузки справочника');
      const json = await res.json();
      setMappingText(json.map(m => `${m.part_name}\t${m.defect_type}\t${m.shop}`).join('\n'));
    } catch (err) {
      console.error(err);
    }
  };

  // Сохранение справочника
  const saveMapping = async () => {
    try {
      const lines = mappingText.split('\n').filter(line => line.trim());
      const mappings = lines.map(line => {
        const parts = line.split('\t');
        return {
          part_name: parts[0]?.trim() || '',
          defect_type: parts[1]?.trim() || '',
          shop: parts[2]?.trim() || '',
        };
      }).filter(m => m.part_name && m.defect_type && m.shop);
      
      const res = await fetch(`${API_BASE}/api/part-defect-shop-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });
      
      if (res.ok) {
        alert('Справочник обновлен');
        loadMapping();
      } else {
        alert('Ошибка обновления');
      }
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  // При переключении на вкладку "По цехам"
  useEffect(() => {
    if (activeTab === 'workshops') {
      loadDrrByShop();
      loadMapping();
    }
  }, [activeTab]);

  // При переключении на подстраницу цеха
  useEffect(() => {
    if (activeTab === 'workshops' && ['AS', 'BS', 'PS'].includes(shopTab)) {
      loadShopData(shopTab);
    }
  }, [shopTab, shopModel, activeTab]);

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

  const totalCols = chartData.length + 1;
  const colWidth = `${100 / totalCols}%`;

  // Данные для графика по цехам
  const shopChartData = useMemo(() => {
    if (!drrData) return [];
    return drrData.weeks.map((week, idx) => ({
      week,
      AS: parseFloat(drrData.AS[idx]) || 0,
      BS: parseFloat(drrData.BS[idx]) || 0,
      PS: parseFloat(drrData.PS[idx]) || 0,
    }));
  }, [drrData]);

  // Данные для круговой диаграммы
  const pieData = useMemo(() => {
    if (!shopData || !shopData.data.length) return [];
    const lastWeek = shopData.weeks[shopData.weeks.length - 1];
    return shopData.data
      .map(d => ({ name: d.name, value: d[lastWeek] || 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [shopData]);

  const exportShopTable = () => {
    if (!shopData || !shopData.data.length) return;
    const exportData = shopData.data.map(d => ({
      'Дефект': d.name,
      ...shopData.weeks.reduce((acc, w) => ({ ...acc, [w]: d[w] || 0 }), {}),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Топ дефектов');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Топ_дефектов_${shopTab}.xlsx`);
  };

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>DRR Report</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
        <button onClick={() => setActiveTab('factory')} style={tabStyle(activeTab === 'factory')}>По заводу</button>
        <button onClick={() => setActiveTab('workshops')} style={tabStyle(activeTab === 'workshops')}>По цехам</button>
        <button onClick={() => setActiveTab('cp78')} style={tabStyle(activeTab === 'cp78')}>По CP7/СР8</button>
      </div>

      {/* ========== ПО ЗАВОДУ ========== */}
      {activeTab === 'factory' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Выход годной продукции с первого раза - Ретроспектива</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 14, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                Период:
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
                <span>—</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ fontSize: 14, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                Модель:
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  style={inputStyle}
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
                <BarChart data={chartData} margin={{ top: 20, right: 48, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="5 5">
                    <Label value="80%" position="right" style={{ fill: '#EF4444', fontSize: 14, fontWeight: 700 }} />
                  </ReferenceLine>
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

              <div style={{ overflowX: 'auto', marginTop: 12, paddingRight: 45 }}>
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
                        <td style={{ ...tdStyle, width: colWidth, paddingLeft: 16 }}>
                          {modelShortNames[modelKey] || modelKey}
                        </td>
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

      {/* ========== ПО ЦЕХАМ ========== */}
      {activeTab === 'workshops' && (
        <>
          {/* Подвкладки */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setShopTab('graphs')} style={{
              ...tabStyle(shopTab === 'graphs'),
              background: shopTab === 'graphs' ? '#2563EB' : '#F3F4F6',
            }}>📊 Графики</button>
            <button onClick={() => setShopTab('AS')} style={{
              ...tabStyle(shopTab === 'AS'),
              background: shopTab === 'AS' ? '#F59E0B' : '#F3F4F6',
            }}>🔧 Цех сборки</button>
            <button onClick={() => setShopTab('BS')} style={{
              ...tabStyle(shopTab === 'BS'),
              background: shopTab === 'BS' ? '#3B82F6' : '#F3F4F6',
            }}>🔩 Цех сварки</button>
            <button onClick={() => setShopTab('PS')} style={{
              ...tabStyle(shopTab === 'PS'),
              background: shopTab === 'PS' ? '#10B981' : '#F3F4F6',
            }}>🎨 Цех окраски</button>
            <button onClick={() => { setShopTab('mapping'); loadMapping(); }} style={{
              ...tabStyle(shopTab === 'mapping'),
              background: shopTab === 'mapping' ? '#8B5CF6' : '#F3F4F6',
            }}>📋 Справочник</button>
          </div>

          {/* ===== ГРАФИКИ ЦЕХОВ ===== */}
          {shopTab === 'graphs' && (
            <>
              {drrLoading ? (
                <p style={{ textAlign: 'center', padding: 40 }}>Загрузка...</p>
              ) : shopChartData.length > 0 ? (
                <>
                  {/* AS */}
                  <div style={cardStyle}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B', marginBottom: 20 }}>🔧 Цех сборки (AS)</h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shopChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="AS" fill="#F59E0B" barSize={40} radius={[8, 8, 0, 0]}>
                          <LabelList dataKey="AS" position="top" formatter={(v) => `${parseFloat(v).toFixed(2)}%`} style={{ fill: '#1F2937', fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* BS */}
                  <div style={cardStyle}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6', marginBottom: 20 }}>🔩 Цех сварки (BS)</h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shopChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="BS" fill="#3B82F6" barSize={40} radius={[8, 8, 0, 0]}>
                          <LabelList dataKey="BS" position="top" formatter={(v) => `${parseFloat(v).toFixed(2)}%`} style={{ fill: '#1F2937', fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* PS */}
                  <div style={cardStyle}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginBottom: 20 }}>🎨 Цех окраски (PS)</h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shopChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="PS" fill="#10B981" barSize={40} radius={[8, 8, 0, 0]}>
                          <LabelList dataKey="PS" position="top" formatter={(v) => `${parseFloat(v).toFixed(2)}%`} style={{ fill: '#1F2937', fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Нет данных</p>
              )}
            </>
          )}

          {/* ===== ПОДСТРАНИЦЫ ЦЕХОВ ===== */}
          {['AS', 'BS', 'PS'].includes(shopTab) && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: shopColors[shopTab], margin: 0 }}>
                  {shopNames[shopTab]}
                </h2>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500 }}>
                    Модель:
                    <select value={shopModel} onChange={e => setShopModel(e.target.value)} style={inputStyle}>
                      {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                    </select>
                  </label>
                  <button onClick={exportShopTable} style={{ ...buttonStyle, background: '#059669' }}>
                    📊 Экспорт
                  </button>
                </div>
              </div>

              {shopLoading ? (
                <p style={{ textAlign: 'center', padding: 40 }}>Загрузка...</p>
              ) : shopData && shopData.data.length > 0 ? (
                <>
                  {/* Круговая диаграмма */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 30 }}>
                    <div style={{ flex: 1, minWidth: 300 }}>
                      <h3 style={{ fontWeight: 600, color: '#1F2937', marginBottom: 20 }}>Топ категорий дефектов</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                            labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                          >
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', marginTop: 16 }}>
                        {pieData.map((d, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                            {d.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Таблица */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                          <th style={thStyle}>Дефект</th>
                          {shopData.weeks.map(week => (
                            <th key={week} style={{ ...thStyle, textAlign: 'center' }}>{week}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shopData.data.map((row, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                            <td style={tdStyle}>{row.name}</td>
                            {shopData.weeks.map(week => (
                              <td key={week} style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                                {row[week] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Нет данных</p>
              )}
            </div>
          )}

          {/* ===== СПРАВОЧНИК ===== */}
          {shopTab === 'mapping' && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>📋 Справочник дефектов по цехам</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                Формат: <b>PartDefect</b> Tab <b>Тип</b> Tab <b>Цех</b> (AS, BS, PS)
              </p>
              <textarea
                value={mappingText}
                onChange={e => setMappingText(e.target.value)}
                rows={20}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
              <div style={{ marginTop: 16 }}>
                <button onClick={saveMapping} style={{ ...buttonStyle, background: '#059669' }}>
                  💾 Сохранить справочник
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== ПО CP7/CP8 ========== */}
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