import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ReferenceLine, LabelList, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:40000';

const modelColors = {
  'ESTEO MX': '#F59E0B',
  'JELAND J6': '#6EE7B7',
  'JELAND J7': '#8B5CF6',
  'TENET A8': '#3B82F6',
  'JELAND J8': '#EC4899',
};

function formatPeriodLabel(period, periodType) {
  if (!period) return '';
  if (periodType === 'month') {
    const [year, month] = period.split('-');
    const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  } else if (periodType === 'week') {
    const week = period.split('-')[1];
    return `W${week}`;
  } else if (periodType === 'day') {
    const [y, m, d] = period.split('-');
    return `${d}.${m}`;
  }
  return period;
}

// ---------- Стилизованный дропдаун моделей (как в SgpAudit) ----------
const ModelFilterDropdown = ({ allModels, selectedModels, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const handleToggle = (model) => {
    const updated = selectedModels.includes(model)
      ? selectedModels.filter(m => m !== model)
      : [...selectedModels, model];
    onChange(updated);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid #D1D5DB',
          background: '#FFFFFF',
          fontWeight: 600,
          fontSize: 14,
          color: '#374151',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <span>🏷️ Модели</span>
        <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 400 }}>
          {selectedModels.length === allModels.length ? 'Все' : selectedModels.length}
        </span>
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: 12,
          minWidth: 220,
          zIndex: 20,
          border: '1px solid #F0F0F5',
        }}>
          {allModels.map(model => (
            <label key={model} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selectedModels.includes(model)}
                onChange={() => handleToggle(model)}
              />
              <span style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                backgroundColor: modelColors[model],
                display: 'inline-block',
              }} />
              {model}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- График (без изменений) ----------
const BarChartBlock = ({ title, data, periodType, isLoading, visibleModels, yAxisDomain, onDetailsClick, metricType }) => {
  if (isLoading) return <div style={styles.loading}>Загрузка...</div>;
  if (!data || data.length === 0) return <div style={styles.loading}>Нет данных</div>;

  const allModels = Object.keys(modelColors);
  const modelsToShow = allModels.filter(m => visibleModels.includes(m));
  const [activeModel, setActiveModel] = useState(null);

  const chartData = data.map(d => {
    const entry = { name: formatPeriodLabel(d.period, periodType) };
    modelsToShow.forEach(m => { entry[m] = d.values?.[m] || 0; });
    entry.target = d.target || 0;
    return entry;
  });

  const targetValue = chartData[0]?.target || 0;
  const allPeriods = [...new Set(data.map(d => d.period).filter(Boolean))].sort();

  let detailPeriodType = 'day';
  if (title.includes('Месяцы')) detailPeriodType = 'month';
  else if (title.includes('Недели')) detailPeriodType = 'week';

  const handleDetailsClick = () => {
    if (onDetailsClick && allPeriods.length > 0) {
      onDetailsClick(allPeriods, metricType, detailPeriodType);
    }
  };

  return (
    <div style={{ flex: 1, minWidth: '260px', margin: '0 6px', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
      onMouseLeave={() => setActiveModel(null)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{title}</h3>
        <button onClick={handleDetailsClick} title="Детали" style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer', fontSize: 16, padding: '2px 8px', color: '#374151' }}>📋</button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="name" stroke="#374151" fontSize={11} interval={0} />
          <YAxis domain={yAxisDomain || ['auto', 'auto']} stroke="#374151" fontSize={11} />
          <Legend wrapperStyle={{ color: '#374151', fontSize: 12 }} />
          {modelsToShow.map(model => (
            <Bar
              key={model}
              dataKey={model}
              fill={modelColors[model]}
              barSize={14}
              opacity={activeModel ? (activeModel === model ? 1 : 0.3) : 1}
              onMouseEnter={() => setActiveModel(model)}
              isAnimationActive={false}
            >
              <LabelList dataKey={model} position="top" style={{ fill: '#374151', fontSize: 10, opacity: activeModel ? (activeModel === model ? 1 : 0.3) : 1 }} />
            </Bar>
          ))}
          <ReferenceLine y={targetValue} stroke="#EF4444" strokeDasharray="5 5" label={{ value: targetValue, position: 'right', style: { fill: '#EF4444', fontSize: 12, fontWeight: 600, textDecoration: 'underline' } }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ---------- Таблица CPA (без изменений) ----------
const EditableTable = ({ visibleModels, cp7DpuDays, cp7DrrDays, cp8DpuDays, cp8DrrDays, selectedDate }) => {
  const headers = ['Model', 'CP7 DPU OFF', 'CP7 DRR', 'CP8 DPU OFF', 'CP8 DRR', 'CPA Score'];

  const [cpaValues, setCpaValues] = useState({});
  const [cpaLoaded, setCpaLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/cpa-scores`)
      .then(res => res.json())
      .then(data => {
        setCpaValues(data || {});
        setCpaLoaded(true);
      })
      .catch(() => setCpaLoaded(true));
  }, []);

  const handleSaveAllCpa = () => {
    const promises = Object.entries(cpaValues).map(([model, score]) =>
      fetch(`${API_BASE}/api/cpa-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, score }),
      })
    );
    Promise.all(promises)
      .then(() => alert('CPA сохранены'))
      .catch(err => console.error('Ошибка сохранения CPA', err));
  };

  const handleCpaChange = (model, value) => {
    setCpaValues(prev => ({ ...prev, [model]: value }));
  };

  const rows = useMemo(() => {
    const normalizeDate = (str) => (str || '').trim().slice(0, 10);
    const todayStr = new Date().toISOString().split('T')[0];

    const getLastNonZero = (daysArray, model, excludeToday = false) => {
      if (!Array.isArray(daysArray) || daysArray.length === 0) return { value: 0, date: '' };
      const valid = daysArray
        .filter(e => e && e.values && model in e.values)
        .sort((a, b) => (b.period || '').localeCompare(a.period || ''));
      for (let entry of valid) {
        const dateStr = normalizeDate(entry.period);
        if (excludeToday && dateStr === todayStr) continue;
        const num = Number(entry.values[model]);
        if (!isNaN(num) && num !== 0) return { value: num, date: dateStr };
      }
      return { value: 0, date: '' };
    };

    const getValueForDate = (daysArray, model, targetDate) => {
      if (!Array.isArray(daysArray) || daysArray.length === 0) return { value: 0, date: '' };
      const entry = daysArray.find(d => normalizeDate(d.period) === targetDate && d.values && model in d.values);
      if (entry) {
        const num = Number(entry.values[model]);
        if (!isNaN(num) && num !== 0) return { value: num, date: targetDate };
      }
      return { value: 0, date: '' };
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}.${parts[1]}`;
    };

    const isDefault = selectedDate === 'default';
    return visibleModels.map(model => {
      let cp7Dpu, cp7Drr, cp8Dpu, cp8Drr;
      if (isDefault) {
        cp7Dpu = getLastNonZero(cp7DpuDays, model, true);
        cp7Drr = getLastNonZero(cp7DrrDays, model, true);
        cp8Dpu = getLastNonZero(cp8DpuDays, model, false);
        cp8Drr = getLastNonZero(cp8DrrDays, model, false);
      } else {
        cp7Dpu = getValueForDate(cp7DpuDays, model, selectedDate);
        cp7Drr = getValueForDate(cp7DrrDays, model, selectedDate);
        cp8Dpu = getValueForDate(cp8DpuDays, model, selectedDate);
        cp8Drr = getValueForDate(cp8DrrDays, model, selectedDate);
      }
      return {
        model,
        cp7DpuOff: cp7Dpu.value !== 0 ? cp7Dpu.value.toFixed(2) : '',
        cp7DpuDate: cp7Dpu.date ? formatDate(cp7Dpu.date) : '',
        cp7Drr: cp7Drr.value !== 0 ? cp7Drr.value.toFixed(1) : '',
        cp7DrrDate: cp7Drr.date ? formatDate(cp7Drr.date) : '',
        cp8DpuOff: cp8Dpu.value !== 0 ? cp8Dpu.value.toFixed(2) : '',
        cp8DpuDate: cp8Dpu.date ? formatDate(cp8Dpu.date) : '',
        cp8DrrMes: cp8Drr.value !== 0 ? cp8Drr.value.toFixed(1) : '',
        cp8DrrDate: cp8Drr.date ? formatDate(cp8Drr.date) : '',
        cpaScore: cpaValues[model] || '',
      };
    });
  }, [visibleModels, cp7DpuDays, cp7DrrDays, cp8DpuDays, cp8DrrDays, selectedDate, cpaValues]);

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', backgroundColor: '#FFFFFF' }}>
        <table style={styles.table}>
          <colgroup>
            {headers.map((_, i) => <col key={i} style={{ width: `${100 / headers.length}%` }} />)}
          </colgroup>
          <thead>
            <tr style={styles.tableHeaderRow}>
              {headers.map(h => <th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF' }}>
                <td style={styles.td}>{row.model}</td>
                <td style={styles.td}>
                  <span style={{ fontWeight: 600 }}>{row.cp7DpuOff}</span>
                  {row.cp7DpuDate && <div style={{ fontSize: 10, color: '#6B7280' }}>{row.cp7DpuDate}</div>}
                </td>
                <td style={styles.td}>
                  <span style={{ fontWeight: 600 }}>{row.cp7Drr}</span>
                  {row.cp7DrrDate && <div style={{ fontSize: 10, color: '#6B7280' }}>{row.cp7DrrDate}</div>}
                </td>
                <td style={styles.td}>
                  <span style={{ fontWeight: 600 }}>{row.cp8DpuOff}</span>
                  {row.cp8DpuDate && <div style={{ fontSize: 10, color: '#6B7280' }}>{row.cp8DpuDate}</div>}
                </td>
                <td style={styles.td}>
                  <span style={{ fontWeight: 600 }}>{row.cp8DrrMes}</span>
                  {row.cp8DrrDate && <div style={{ fontSize: 10, color: '#6B7280' }}>{row.cp8DrrDate}</div>}
                </td>
                <td style={{ ...styles.td, padding: '4px' }}>
                  <input
                    type="text"
                    value={row.cpaScore}
                    onChange={(e) => handleCpaChange(row.model, e.target.value)}
                    style={styles.input}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, textAlign: 'right' }}>
        <button
          onClick={handleSaveAllCpa}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            backgroundColor: '#6B7280',
            color: '#FFF',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Сохранить CPA
        </button>
      </div>
    </div>
  );
};

// ---------- Модальное окно (без изменений) ----------
const FilterableDetailsModal = ({ isOpen, onClose, data, loading, title, error, periodType, metricType }) => {
  if (!isOpen) return null;
  const [modelFilter, setModelFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const models = useMemo(() => {
    if (!data || data.length === 0) return [];
    const unique = [...new Set(data.map(row => row.MODEL).filter(Boolean))];
    return ['ALL', ...unique.sort()];
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (modelFilter !== 'ALL') result = result.filter(row => row.MODEL === modelFilter);
    if (dateFrom) result = result.filter(row => row.DATE >= dateFrom);
    if (dateTo) result = result.filter(row => row.DATE <= dateTo);
    return result;
  }, [data, modelFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    if (!filteredData.length) return null;
    const uniqueVins = new Set(filteredData.map(row => row.VIN)).size;
    if (metricType === 'DPU') {
      return { uniqueVins, totalDefects: filteredData.length };
    } else {
      return {
        uniqueVins,
        inRemzone: filteredData.filter(row => row.REMZONE_STATUS === 'В ремзоне').length,
        total: filteredData.length,
      };
    }
  }, [filteredData, metricType]);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Details');
    XLSX.writeFile(wb, `Details_${title || 'export'}.xlsx`);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ color: '#FFF', margin: 0 }}>{title || 'Детали'}</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        {error && <div style={{ color: '#EF4444', marginBottom: 8 }}>Ошибка: {error}</div>}
        {loading ? (
          <div style={{ color: '#D1D5DB' }}>Загрузка...</div>
        ) : !data || data.length === 0 ? (
          <div style={{ color: '#D1D5DB' }}>Нет данных</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ color: '#D1D5DB', fontSize: 13 }}>
                Модель:
                <select
                  value={modelFilter}
                  onChange={e => setModelFilter(e.target.value)}
                  style={{ marginLeft: 4, padding: '2px 4px', borderRadius: 4, border: '1px solid #4B5563', background: '#374151', color: '#FFF' }}
                >
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label style={{ color: '#D1D5DB', fontSize: 13 }}>
                С даты:
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ marginLeft: 4, padding: '2px 4px', borderRadius: 4, border: '1px solid #4B5563', background: '#374151', color: '#FFF' }}
                />
              </label>
              <label style={{ color: '#D1D5DB', fontSize: 13 }}>
                По дату:
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ marginLeft: 4, padding: '2px 4px', borderRadius: 4, border: '1px solid #4B5563', background: '#374151', color: '#FFF' }}
                />
              </label>
              <button onClick={handleExport} style={styles.exportBtn}>
                Экспорт в Excel
              </button>
            </div>
            {summary && (
              <div style={{ color: '#D1D5DB', marginBottom: 8, fontSize: 13, display: 'flex', gap: 15 }}>
                <span>Уникальных VIN: <b>{summary.uniqueVins}</b></span>
                {metricType === 'DPU' ? (
                  <span>Всего дефектов: <b>{summary.totalDefects}</b></span>
                ) : (
                  <>
                    <span>Всего записей: <b>{summary.total}</b></span>
                    <span>В ремзоне: <b>{summary.inRemzone}</b></span>
                  </>
                )}
              </div>
            )}
            <div className="custom-scroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#FFF', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#374151' }}>
                    {Object.keys(data[0]).map(col => <th key={col} style={styles.detailTh}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#1F2937' : '#111827' }}>
                      {Object.keys(data[0]).map(col => <td key={col} style={styles.detailTd}>{row[col]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Топ-10 дефектов (без изменений) ----------
const TodayTopDefects = ({ checkpoint, defectType, onDefectTypeChange, dateFrom, onDateFromChange, dateTo, onDateToChange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    const params = new URLSearchParams({ checkpoint });
    if (defectType !== 'default') params.append('defectType', defectType);
    fetch(`${API_BASE}/api/defects-dashboard?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        const filtered = Array.isArray(json) ? json.filter(item => {
          const itemDate = item.CREATION_TIME;
          if (!itemDate) return false;
          if (dateFrom && itemDate < dateFrom) return false;
          if (dateTo && itemDate > dateTo) return false;
          return true;
        }) : [];
        setData(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [checkpoint, defectType, dateFrom, dateTo]);

  const filterBar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
      <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
        Тип:
        <select
          value={defectType}
          onChange={e => onDefectTypeChange(e.target.value)}
          style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #D1D5DB', fontSize: 13 }}
        >
          <option value="offline">Offline</option>
          <option value="online">Online</option>
          <option value="default">Default</option>
        </select>
      </label>
      <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
        с
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateFromChange(e.target.value)}
          style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #D1D5DB', fontSize: 13, width: 120 }}
        />
      </label>
      <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
        по
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateToChange(e.target.value)}
          style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #D1D5DB', fontSize: 13, width: 120 }}
        />
      </label>
    </div>
  );

  if (loading) {
    return (
      <div style={{ marginTop: 20, color: '#6B7280' }}>
        <h3 style={{ color: '#1F2937', marginBottom: 12 }}>Топ‑10 дефектов ({checkpoint})</h3>
        {filterBar}
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ marginTop: 20, color: '#6B7280' }}>
        <h3 style={{ color: '#1F2937', marginBottom: 12 }}>Топ‑10 дефектов ({checkpoint})</h3>
        {filterBar}
        <p>Нет данных за выбранный период</p>
      </div>
    );
  }

  const grouped = {};
  data.forEach(item => {
    const model = item.MODEL || 'UNKNOWN';
    const defectKey = (item.PART_NAME || '') + ' – ' + (item.PROBLEM_TYPE || '');
    if (!grouped[model]) grouped[model] = {};
    if (!grouped[model][defectKey]) grouped[model][defectKey] = 0;
    grouped[model][defectKey] += item.DEFECTS_COUNT || 0;
  });

  const topByModel = {};
  Object.entries(grouped).forEach(([model, defectMap]) => {
    const arr = Object.entries(defectMap).map(([name, count]) => ({ name, count }));
    arr.sort((a, b) => b.count - a.count);
    topByModel[model] = arr.slice(0, 10);
  });

  const modelOrder = ['JELAND J6', 'JELAND J7', 'JELAND J8', 'ESTEO MX', 'TENET A8'];

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12, marginBottom: 16, borderBottom: '2px solid #E5E7EB', paddingBottom: 8 }}>
        <h3 style={{ color: '#1F2937', fontSize: 20, fontWeight: 700, margin: 0 }}>
          Топ‑10 дефектов ({checkpoint})
        </h3>
        {filterBar}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {modelOrder.map(model => {
          const items = topByModel[model];
          if (!items || items.length === 0) {
            return (
              <div key={model} style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: 12,
                flex: '1 1 220px',
                minWidth: '200px',
              }}>
                <h4 style={{
                  color: modelColors[model] || '#6B7280',
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 8,
                  borderBottom: `2px solid ${modelColors[model] || '#6B7280'}`,
                  paddingBottom: 4,
                }}>
                  {model}
                </h4>
                <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>Нет данных за выбранный период</p>
              </div>
            );
          }

          return (
            <div key={model} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: 12,
              flex: '1 1 220px',
              minWidth: '200px',
            }}>
              <h4 style={{
                color: modelColors[model],
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 8,
                borderBottom: `2px solid ${modelColors[model]}`,
                paddingBottom: 4,
              }}>
                {model}
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F3F4F6' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Деталь – Дефект</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 600, color: '#374151', width: 40 }}>Кол.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF' }}>
                      <td style={{ padding: '4px 6px', color: '#1F2937' }}>{item.name}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600, color: '#1F2937' }}>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- Группа графиков (без изменений) ----------
const ChartsGroup = ({ title, checkpoint, visibleModels, cpDpuDays, cpDrrDays, dpuEndpoint, drrEndpoint, onDetailsClick }) => {
  const [blockCollapsed, setBlockCollapsed] = useState(false);
  const [dpuCollapsed, setDpuCollapsed] = useState(false);
  const [drrCollapsed, setDrrCollapsed] = useState(false);

  const [drrMonths, setDrrMonths] = useState(null);
  const [drrWeeks, setDrrWeeks] = useState(null);
  const [drrLoading, setDrrLoading] = useState(true);

  const [dpuMonths, setDpuMonths] = useState(null);
  const [dpuWeeks, setDpuWeeks] = useState(null);
  const [dpuLoading, setDpuLoading] = useState(true);

  useEffect(() => {
    const fetchDrr = async (period) => {
      const res = await fetch(`${API_BASE}${drrEndpoint}?period=${period}`);
      return res.json();
    };
    Promise.all([fetchDrr('month'), fetchDrr('week')])
      .then(([months, weeks]) => {
        setDrrMonths(months?.slice(-3) || []);
        setDrrWeeks(weeks?.slice(-4) || []);
        setDrrLoading(false);
      }).catch(() => setDrrLoading(false));
  }, [drrEndpoint]);

  useEffect(() => {
    const fetchDpu = async (period) => {
      const res = await fetch(`${API_BASE}${dpuEndpoint}?period=${period}`);
      return res.json();
    };
    Promise.all([fetchDpu('month'), fetchDpu('week')])
      .then(([months, weeks]) => {
        setDpuMonths(months?.slice(-3) || []);
        setDpuWeeks(weeks?.slice(-4) || []);
        setDpuLoading(false);
      }).catch(() => setDpuLoading(false));
  }, [dpuEndpoint]);

  const dpuDays = (cpDpuDays || []).slice(-7);
  const drrDays = (cpDrrDays || []).slice(-7);

  const toggleBlock = () => setBlockCollapsed(!blockCollapsed);
  const toggleDpu = () => setDpuCollapsed(!dpuCollapsed);
  const toggleDrr = () => setDrrCollapsed(!drrCollapsed);

  const handleDetailsClick = (periods, metricType, periodType) => {
    if (onDetailsClick) {
      onDetailsClick(checkpoint, periods, metricType, periodType);
    }
  };

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <h2 style={{ color: '#1F2937', fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
        <button onClick={toggleBlock} style={styles.collapseBtn}>
          {blockCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!blockCollapsed && (
        <>
          {/* DPU */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h3 style={{ color: '#4B5563', fontSize: 15, fontWeight: 600, margin: 0 }}>DPU</h3>
              <button onClick={toggleDpu} style={styles.collapseBtn}>
                {dpuCollapsed ? '▼' : '▲'}
              </button>
            </div>
            {!dpuCollapsed && (
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <BarChartBlock title="Месяцы" data={dpuMonths} periodType="month" isLoading={dpuLoading} visibleModels={visibleModels} onDetailsClick={handleDetailsClick} metricType="DPU" />
                <BarChartBlock title="Недели" data={dpuWeeks} periodType="week" isLoading={dpuLoading} visibleModels={visibleModels} onDetailsClick={handleDetailsClick} metricType="DPU" />
                <BarChartBlock title="Дни" data={dpuDays} periodType="day" isLoading={false} visibleModels={visibleModels} onDetailsClick={handleDetailsClick} metricType="DPU" />
              </div>
            )}
          </div>

          {/* DRR */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h3 style={{ color: '#4B5563', fontSize: 15, fontWeight: 600, margin: 0 }}>DRR</h3>
              <button onClick={toggleDrr} style={styles.collapseBtn}>
                {drrCollapsed ? '▼' : '▲'}
              </button>
            </div>
            {!drrCollapsed && (
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <BarChartBlock title="Месяцы" data={drrMonths} periodType="month" isLoading={drrLoading} visibleModels={visibleModels} yAxisDomain={[0, 100]} onDetailsClick={handleDetailsClick} metricType="DRR" />
                <BarChartBlock title="Недели" data={drrWeeks} periodType="week" isLoading={drrLoading} visibleModels={visibleModels} yAxisDomain={[0, 100]} onDetailsClick={handleDetailsClick} metricType="DRR" />
                <BarChartBlock title="Дни" data={drrDays} periodType="day" isLoading={false} visibleModels={visibleModels} yAxisDomain={[0, 100]} onDetailsClick={handleDetailsClick} metricType="DRR" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========
export default function ModelStatusPage() {
  const allModels = Object.keys(modelColors);
  const [selectedModels, setSelectedModels] = useState(allModels);
  const [selectedDate, setSelectedDate] = useState('default');

  const [cp7DpuDays, setCp7DpuDays] = useState([]);
  const [cp7DrrDays, setCp7DrrDays] = useState([]);
  const [cp8DpuDays, setCp8DpuDays] = useState([]);
  const [cp8DrrDays, setCp8DrrDays] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [defectTypeCP7, setDefectTypeCP7] = useState('offline');
  const [dateFromCP7, setDateFromCP7] = useState(today);
  const [dateToCP7, setDateToCP7] = useState(today);
  const [defectTypeCP8, setDefectTypeCP8] = useState('offline');
  const [dateFromCP8, setDateFromCP8] = useState(today);
  const [dateToCP8, setDateToCP8] = useState(today);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalPeriodType, setModalPeriodType] = useState('day');
  const [modalMetricType, setModalMetricType] = useState('DPU');

  useEffect(() => {
    const fetchAllDaily = async () => {
      try {
        const [cp7Dpu, cp7Drr, cp8Dpu, cp8Drr] = await Promise.all([
          fetch(`${API_BASE}/api/model-status-dpu-cp7?period=day&count=90`).then(r => r.json()),
          fetch(`${API_BASE}/api/model-status-drr-cp7?period=day&count=90`).then(r => r.json()),
          fetch(`${API_BASE}/api/model-status-dpu-cp8?period=day&count=90`).then(r => r.json()),
          fetch(`${API_BASE}/api/model-status-drr?period=day&count=90`).then(r => r.json()),
        ]);
        setCp7DpuDays(Array.isArray(cp7Dpu) ? cp7Dpu : []);
        setCp7DrrDays(Array.isArray(cp7Drr) ? cp7Drr : []);
        setCp8DpuDays(Array.isArray(cp8Dpu) ? cp8Dpu : []);
        setCp8DrrDays(Array.isArray(cp8Drr) ? cp8Drr : []);
      } catch (err) {
        console.error('Ошибка загрузки дневных данных', err);
      } finally {
        setDataLoaded(true);
      }
    };
    fetchAllDaily();
  }, []);

  const handleDetailsClick = (checkpoint, periods, metricType, periodType) => {
    const isDpu = metricType === 'DPU';
    let endpoint = '';
    if (checkpoint === 'CP7' && isDpu) endpoint = '/api/model-status-dpu-cp7-details';
    else if (checkpoint === 'CP7' && !isDpu) endpoint = '/api/model-status-drr-cp7-details';
    else if (checkpoint === 'CP8' && isDpu) endpoint = '/api/model-status-dpu-cp8-details';
    else if (checkpoint === 'CP8' && !isDpu) endpoint = '/api/model-status-drr-cp8-details';
    if (!endpoint) {
      setModalError('Неизвестный эндпоинт');
      return;
    }
    const sortedPeriods = [...periods].sort();
    const startLabel = formatPeriodLabel(sortedPeriods[0], periodType);
    const endLabel = formatPeriodLabel(sortedPeriods[sortedPeriods.length - 1], periodType);
    let rangeLabel = sortedPeriods.length === 1 ? startLabel : `${startLabel} – ${endLabel}`;
    setModalTitle(`${checkpoint} – ${metricType} (${rangeLabel})`);
    setModalPeriodType(periodType);
    setModalMetricType(metricType);
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalData([]);
    const periodsParam = sortedPeriods.join(',');
    const url = `${API_BASE}${endpoint}?periods=${encodeURIComponent(periodsParam)}&periodType=${periodType}`;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Ошибка сервера: ${r.status}`);
        return r.json();
      })
      .then(data => {
        setModalData(Array.isArray(data) ? data : []);
        setModalLoading(false);
      })
      .catch(err => {
        console.error('Ошибка загрузки деталей', err);
        setModalError(err.message);
        setModalLoading(false);
      });
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData([]);
    setModalError(null);
  };

  if (!dataLoaded) {
    return <div style={styles.loading}>Загрузка данных...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>Model Status</h1>

      {/* Фильтры и таблица в стильной карточке (как в SgpAudit) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 30,
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        border: '1px solid #F0F0F5',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <ModelFilterDropdown
            allModels={allModels}
            selectedModels={selectedModels}
            onChange={setSelectedModels}
          />

          <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>Режим таблицы:</span>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 14,
              background: '#F9FAFB',
              color: '#374151',
              fontWeight: 500,
            }}
          >
            <option value="default">По умолчанию</option>
            {[...new Set([...cp7DpuDays, ...cp7DrrDays, ...cp8DpuDays, ...cp8DrrDays].map(d => (d.period || '').trim().slice(0, 10)))].filter(Boolean).sort().reverse().map(date => (
              <option key={date} value={date}>{date.split('-').reverse().join('.')}</option>
            ))}
          </select>
        </div>

        <EditableTable
          visibleModels={selectedModels}
          cp7DpuDays={cp7DpuDays}
          cp7DrrDays={cp7DrrDays}
          cp8DpuDays={cp8DpuDays}
          cp8DrrDays={cp8DrrDays}
          selectedDate={selectedDate}
        />
      </div>

      <ChartsGroup
        title="CP7"
        checkpoint="CP7"
        visibleModels={selectedModels}
        cpDpuDays={cp7DpuDays}
        cpDrrDays={cp7DrrDays}
        dpuEndpoint="/api/model-status-dpu-cp7"
        drrEndpoint="/api/model-status-drr-cp7"
        onDetailsClick={handleDetailsClick}
      />
      <ChartsGroup
        title="CP8"
        checkpoint="CP8"
        visibleModels={selectedModels}
        cpDpuDays={cp8DpuDays}
        cpDrrDays={cp8DrrDays}
        dpuEndpoint="/api/model-status-dpu-cp8"
        drrEndpoint="/api/model-status-drr"
        onDetailsClick={handleDetailsClick}
      />

      <TodayTopDefects
        checkpoint="CP7"
        defectType={defectTypeCP7} onDefectTypeChange={setDefectTypeCP7}
        dateFrom={dateFromCP7} onDateFromChange={setDateFromCP7}
        dateTo={dateToCP7} onDateToChange={setDateToCP7}
      />
      <TodayTopDefects
        checkpoint="CP8"
        defectType={defectTypeCP8} onDefectTypeChange={setDefectTypeCP8}
        dateFrom={dateFromCP8} onDateFromChange={setDateFromCP8}
        dateTo={dateToCP8} onDateToChange={setDateToCP8}
      />

      <FilterableDetailsModal
        isOpen={modalOpen}
        onClose={closeModal}
        data={modalData}
        loading={modalLoading}
        title={modalTitle}
        error={modalError}
        periodType={modalPeriodType}
        metricType={modalMetricType}
      />
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#F3F4F6',
    minHeight: '100vh',
    padding: 20,
    color: '#111827',
    fontFamily: 'Segoe UI, Arial, sans-serif',
  },
  mainTitle: { fontSize: 26, marginBottom: 24, fontWeight: 700, color: '#1F2937' },
  collapseBtn: {
    background: 'none',
    border: '1px solid #D1D5DB',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 8px',
    color: '#374151',
    lineHeight: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  tableHeaderRow: { backgroundColor: '#F3F4F6' },
  th: {
    padding: '10px 8px',
    borderBottom: '2px solid #E5E7EB',
    textAlign: 'center',
    fontWeight: 600,
    color: '#374151',
    fontSize: 20,
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #E5E7EB',
    textAlign: 'center',
    color: '#1F2937',
    fontSize: 20,
    fontWeight: 500,
  },
  input: {
    width: '80px',
    padding: '4px',
    border: '1px solid #D1D5DB',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    textAlign: 'center',
    fontSize: 15,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 20,
    maxWidth: '850px',
    width: '95%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#FFF',
    fontSize: 18,
    cursor: 'pointer',
  },
  exportBtn: {
    padding: '6px 14px',
    backgroundColor: '#2563EB',
    color: '#FFF',
    border: 'none',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  detailTh: {
    padding: '6px 8px',
    textAlign: 'left',
    borderBottom: '1px solid #4B5563',
    fontWeight: 600,
  },
  detailTd: {
    padding: '6px 8px',
    borderBottom: '1px solid #4B5563',
    whiteSpace: 'nowrap',
  },
  loading: {
    textAlign: 'center',
    padding: 20,
    fontSize: 18,
    color: '#6B7280',
  },
};