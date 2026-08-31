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
  const [activeTab, setActiveTab] = useState('factory');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [period, setPeriod] = useState('all'); // all | year | month | week | day
  const [count, setCount] = useState(3);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dataPoints, setDataPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const [shopTab, setShopTab] = useState('graphs');
  const [drrData, setDrrData] = useState(null);
  const [drrLoading, setDrrLoading] = useState(false);
  const [shopData, setShopData] = useState(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopModel, setShopModel] = useState('ALL');
  const [importingMapping, setImportingMapping] = useState(false);

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
    if (activeTab !== 'factory') return;
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period !== 'all' && count) params.append('count', count);
    if (period !== 'all' && fromDate && toDate) {
      params.append('fromDate', fromDate);
      params.append('toDate', toDate);
    }
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
  }, [activeTab, period, count, fromDate, toDate]);

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

  const handleMappingImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImportingMapping(true);
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const shopMap = {
          'BODY': 'BS',
          'ASSEMBLY': 'AS',
          'PAINT': 'PS',
          'BS': 'BS',
          'AS': 'AS',
          'PS': 'PS',
          'СБОРКА': 'AS',
          'СВАРКА': 'BS',
          'ОКРАСКА': 'PS',
        };
        
        const mappings = json.map(row => {
          const rawShop = String(row.shop || row['Цех'] || '').trim().toUpperCase();
          const mappedShop = shopMap[rawShop] || null;
          
          return {
            part_name: String(row.part_name || row['PartDefect'] || '').trim(),
            defect_type: String(row.defect_type || row['Тип'] || '').trim(),
            shop: mappedShop,
          };
        }).filter(m => m.part_name && m.defect_type && m.shop);
        
        if (!mappings.length) {
          alert('Не найдены данные. Проверьте колонки и значения цехов (BODY, ASSEMBLY, PAINT)');
          return;
        }
        
        const res = await fetch(`${API_BASE}/api/part-defect-shop-mapping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mappings }),
        });
        
        if (res.ok) {
          alert(`Загружено ${mappings.length} записей`);
          loadDrrByShop();
        } else {
          alert('Ошибка загрузки');
        }
      } catch (err) {
        alert('Ошибка: ' + err.message);
      } finally {
        setImportingMapping(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    if (activeTab === 'workshops') {
      loadDrrByShop();
    }
  }, [activeTab]);

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

  const shopChartData = useMemo(() => {
    if (!drrData) return [];
    return drrData.weeks.map((week, idx) => {
      const asValue = parseFloat(drrData.AS[idx]) || 0;
      const bsValue = parseFloat(drrData.BS[idx]) || 0;
      const psValue = parseFloat(drrData.PS[idx]) || 0;
      
      return {
        week,
        AS: Math.max(0, Math.min(100, 100 - asValue)),
        BS: bsValue,
        PS: psValue,
      };
    });
  }, [drrData]);

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
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      style={inputStyle}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>По:</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      style={inputStyle}
                    />
                    {(fromDate || toDate) && (
                      <button
                        onClick={() => { setFromDate(''); setToDate(''); }}
                        style={{ ...buttonStyle, background: '#9CA3AF', padding: '4px 10px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </>
              )}
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
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
            
            <label style={{
              ...buttonStyle,
              background: '#8B5CF6',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}>
              {importingMapping ? '⏳ Импорт...' : '📋 Импорт справочника'}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleMappingImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {shopTab === 'graphs' && (
            <>
              {drrLoading ? (
                <p style={{ textAlign: 'center', padding: 40 }}>Загрузка...</p>
              ) : shopChartData.length > 0 ? (
                <>
                  <div style={cardStyle}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B', marginBottom: 20 }}>🔧 Цех сборки (AS) — % дефектов</h2>
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

                  <div style={cardStyle}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6', marginBottom: 20 }}>🔩 Цех сварки (BS) — DRR %</h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shopChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
                        <XAxis dataKey="week" />
                        <YAxis domain={['dataMin - 3', 'dataMax + 3']} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="BS" fill="#3B82F6" barSize={40} radius={[8, 8, 0, 0]}>
                          <LabelList dataKey="BS" position="top" formatter={(v) => `${parseFloat(v).toFixed(2)}%`} style={{ fill: '#1F2937', fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={cardStyle}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginBottom: 20 }}>🎨 Цех окраски (PS) — DRR %</h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shopChartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F5" />
                        <XAxis dataKey="week" />
                        <YAxis domain={['dataMin - 3', 'dataMax + 3']} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="PS" fill="#10B981" barSize={40} radius={[8, 8, 0, 0]}>
                          <LabelList dataKey="PS" position="top" formatter={(v) => `${parseFloat(v).toFixed(2)}%`} style={{ fill: '#1F2937', fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Нет данных. Загрузите справочник.</p>
              )}
            </>
          )}

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
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 40%', maxWidth: '40%' }}>
                    <h3 style={{ fontWeight: 600, color: '#1F2937', marginBottom: 16, fontSize: 18 }}>
                      Доля дефектов {shopTab}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={{
                            fill: '#1F2937',
                            fontSize: 12,
                            formatter: (value) => `${value}`
                          }}
                          labelLine={{
                            stroke: '#6B7280',
                            strokeWidth: 1
                          }}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, alignItems: 'flex-start' }}>
                      {pieData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: '#1F2937', textAlign: 'left' }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block', flexShrink: 0, marginTop: 3 }} />
                          <span style={{ lineHeight: 1.3 }}>{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: '0 0 60%', maxWidth: '60%', overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: 600, color: '#1F2937', marginBottom: 16, fontSize: 18 }}>
                      Топы дефектов {shopTab}
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                          <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 12 }}>Дефект</th>
                          {shopData.weeks.map(week => (
                            <th key={week} style={{ ...thStyle, textAlign: 'center' }}>{week}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shopData.data.map((row, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                            <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: 12, whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 150 }}>{row.name}</td>
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
                </div>
              ) : (
                <p style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Нет данных. Загрузите справочник.</p>
              )}
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