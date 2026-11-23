import React, { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';

const API_BASE = ''; 

// ===== СТИЛИ =====
const cardStyle = { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid #F0F0F5' };
const labelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500 };
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB' };
const buttonStyle = { padding: '8px 20px', borderRadius: 8, border: 'none', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' };
const tabStyle = (active) => ({ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: active ? '#2563EB' : '#F3F4F6', color: active ? '#FFFFFF' : '#6B7280', cursor: 'pointer', boxShadow: active ? '0 4px 12px rgba(37,99,235,0.25)' : 'none', transition: 'all 0.2s' });

const selectStyle = {
  padding: '8px 36px 8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px top 50%',
  backgroundSize: '10px auto',
  cursor: 'pointer',
  fontWeight: 500,
  color: '#374151',
  minWidth: '220px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};

// ===== ХЕЛПЕРЫ =====
const parseVal = (val) => {
  if (val === null || val === undefined || val === '[NULL]' || val === '') return null;
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(num) ? null : num;
};

const formatDMS = (val) => {
  const num = parseVal(val);
  if (num === null) return '- - -';
  if (num === 0) return "0°00'"; 
  
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const deg = Math.floor(absVal);
  let min = Math.round((absVal - deg) * 60);
  let finalDeg = deg;
  if (min === 60) { finalDeg += 1; min = 0; }
  const sign = isNegative ? '-' : '+';
  return `${sign}${finalDeg}°${String(min).padStart(2, '0')}'`;
};

const formatDecimal = (val) => {
  const num = parseVal(val);
  if (num === null) return '- - -';
  if (num === 0) return '0';
  return Number(num.toFixed(3)).toString();
};

const formatAngle = formatDMS;

const getDiff = (val1, val2) => {
  const num1 = parseVal(val1);
  const num2 = parseVal(val2);
  if (num1 === null || num2 === null) return null;
  return num1 - num2; 
};

const getSmartVal = (after, before) => {
  const a = parseVal(after);
  if (a !== null) return a;
  const b = parseVal(before);
  if (b !== null) return b;
  return 0;
};

// Сенсорное значение: ровно ±90 — «нет данных», в график не ставим
const SENTINEL_VALUE = 90;
const isSentinelValue = (v) => {
  if (v === null || v === undefined || v === '') return false;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return !isNaN(n) && Math.abs(n) === SENTINEL_VALUE;
};

const IoT = {
  f_camber_l: 'NCATable_NCA_Camber_LF', f_camber_r: 'NCATable_NCA_Camber_RF', f_camber_diff: 'NCATable_NCA_Camber_Fcross',
  f_toe_l: 'NCATable_NCA_Toe_LF', f_toe_r: 'NCATable_NCA_Toe_RF', f_toe_total: 'NCATable_NCA_Toe_Fcross',
  f_caster_l: 'NCATable_NCA_Caster_LF', f_caster_r: 'NCATable_NCA_Caster_RF', f_caster_diff: 'NCATable_NCA_Caster_Fcross',
  f_kpi_l: 'NCATable_NCA_SAI_LF', f_kpi_r: 'NCATable_NCA_SAI_RF', f_kpi_diff: 'NCATable_NCA_SAI_FCross',
  r_camber_l: 'NCATable_NCA_Camber_LR', r_camber_r: 'NCATable_NCA_Camber_RR', r_camber_diff: 'NCATable_NCA_Camber_Rcross',
  r_toe_l: 'NCATable_NCA_Toe_LR', r_toe_r: 'NCATable_NCA_Toe_RR', r_toe_total: 'NCATable_NCA_Toe_Rcross',
  r_thrust: 'NCATable_NCA_SWA',
};

const CHARTS_CONFIG = [
  { key: 'f_camber_l', name: 'Развал (П): левый', domain: [-2, 1], norm: [-1.166, 0.333], group: 'Передний мост' },
  { key: 'f_camber_r', name: 'Развал (П): правый', domain: [-2, 1], norm: [-1.166, 0.333], group: 'Передний мост' },
  { key: 'f_camber_diff', name: 'Развал (П): разница', domain: [-1, 1], norm: [-0.5, 0.5], group: 'Передний мост' },
  { key: 'f_toe_l', name: 'Схождение (П): левое', domain: [-0.5, 0.5], norm: [0.033, 0.133], group: 'Передний мост' },
  { key: 'f_toe_r', name: 'Схождение (П): правое', domain: [-0.5, 0.5], norm: [0.033, 0.133], group: 'Передний мост' },
  { key: 'f_toe_total', name: 'Схождение (П): суммарное', domain: [-0.5, 0.5], norm: [0.066, 0.266], group: 'Передний мост' },
  { key: 'f_caster_l', name: 'Продольный наклон: левый', domain: [2, 6], norm: [3.466, 5.466], group: 'Передний мост' },
  { key: 'f_caster_r', name: 'Продольный наклон: правый', domain: [2, 6], norm: [3.466, 5.466], group: 'Передний мост' },
  { key: 'f_caster_diff', name: 'Продольный наклон: разница', domain: [-1, 1], norm: null, group: 'Передний мост' },
  { key: 'f_kpi_l', name: 'Поперечный наклон: левый', domain: [10, 16], norm: [12.716, 14.716], group: 'Передний мост' },
  { key: 'f_kpi_r', name: 'Поперечный наклон: правый', domain: [10, 16], norm: [12.716, 14.716], group: 'Передний мост' },
  { key: 'f_kpi_diff', name: 'Поперечный наклон: разница', domain: [-5, 5], norm: null, group: 'Передний мост' },
  { key: 'r_camber_l', name: 'Развал (З): левый', domain: [-2, 0], norm: [-1.2, -0.2], group: 'Задний мост' },
  { key: 'r_camber_r', name: 'Развал (З): правый', domain: [-2, 0], norm: [-1.2, -0.2], group: 'Задний мост' },
  { key: 'r_camber_diff', name: 'Развал (З): разница', domain: [-1, 1], norm: [-0.5, 0.5], group: 'Задний мост' },
  { key: 'r_toe_l', name: 'Схождение (З): левое', domain: [-0.2, 0.5], norm: [0, 0.166], group: 'Задний мост' },
  { key: 'r_toe_r', name: 'Схождение (З): правое', domain: [-0.2, 0.5], norm: [0, 0.166], group: 'Задний мост' },
  { key: 'r_toe_total', name: 'Схождение (З): суммарное', domain: [-0.2, 0.5], norm: [0, 0.333], group: 'Задний мост' },
  { key: 'r_thrust', name: 'Угол движения', domain: [-1, 1], norm: null, group: 'Задний мост' },
];

export default function AlignmentReport() {
  const [activeSubTab, setActiveSubTab] = useState('table');

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>📐 Отчет по развалу-схождению</h2>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveSubTab('table')} style={tabStyle(activeSubTab === 'table')}>📋 Таблица отчета</button>
        <button onClick={() => setActiveSubTab('models')} style={tabStyle(activeSubTab === 'models')}>📊 Аналитика по моделям</button>
        <button onClick={() => setActiveSubTab('vin')} style={tabStyle(activeSubTab === 'vin')}>📊 Аналитика по VIN</button>
      </div>

      {activeSubTab === 'table' && <TableView />}
      {activeSubTab === 'models' && <ChartsViewModels />}
      {activeSubTab === 'vin' && <ChartsViewVIN />}
    </div>
  );
}

// ======================= VINS MODAL =======================
function VinsModal({ open, vins, label, onClose }) {
  const [copied, setCopied] = useState(false);

  // Блокируем скролл фона, когда окно открыто
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => { if (open) setCopied(false); }, [open]);

  // Закрытие по клику на темный фон
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (e.target.classList.contains('vins-modal-overlay')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    const text = vins.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="vins-modal-overlay"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div style={{
        background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>VIN за {label}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#6B7280' }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Всего: {vins.length}</div>
        <div style={{ flex: 1, overflowY: 'auto', background: '#F9FAFB', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 13, border: '1px solid #E5E7EB', minHeight: 100 }}>
          {vins.map((v, i) => (
            <div key={i} style={{ padding: '4px 0', borderBottom: i < vins.length - 1 ? '1px solid #F0F0F5' : 'none' }}>{v}</div>
          ))}
        </div>
        <button onClick={handleCopy} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none', background: copied ? '#059669' : '#2563EB', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' }}>
          {copied ? '✓ Скопировано' : '📋 Копировать список'}
        </button>
      </div>
    </div>
  );
}

// ======================= ТУЛТИП =======================
const CustomTooltip = ({ active, payload, isModelView, onShowVins }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  const allVins = (Array.isArray(data.hunter_vins) || Array.isArray(data.agm_vins))
    ? [...new Set([...(data.hunter_vins || []), ...(data.agm_vins || [])])]
    : (data.vin ? [data.vin] : []);

  const sentinelTotal = (data.hunter_sentinel_count || 0) + (data.agm_sentinel_count || 0);

  return (
    <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, userSelect: 'text', pointerEvents: 'auto' }}>
      {!isModelView && <p style={{ margin: 0, fontWeight: 700, color: '#1F2937' }}>VIN: {data.vin || '-'}</p>}
      <p style={{ margin: isModelView ? 0 : '4px 0', color: '#6B7280', fontWeight: isModelView ? 700 : 400 }}>
        Дата: {data.fullDate || data.date}
      </p>

      {sentinelTotal > 0 && (
        <p style={{ margin: '2px 0', color: '#B45309', fontSize: 11 }}>
          ⚠️ Исключено 90°: {data.hunter_sentinel_count || 0} Hunter + {data.agm_sentinel_count || 0} AGM
        </p>
      )}

      <hr style={{ margin: '8px 0', borderColor: '#E5E7EB' }} />

      {payload.map((entry, index) => {
        const isAgm = entry.dataKey.startsWith('agm_');
        const baseKey = isAgm ? entry.dataKey.replace('agm_', '') : entry.dataKey.replace('hunter_', '');
        const result = data[`agm_${baseKey}_result`];
        const raw = data[`${isAgm ? 'agm_' : 'hunter_'}${baseKey}_raw`];

        const showVal = entry.value !== null && entry.value !== undefined;
        if (!showVal && raw === undefined) return null;

        return (
          <p key={index} style={{ margin: '2px 0', color: entry.color, fontWeight: 500 }}>
            {entry.name}: {showVal ? formatAngle(entry.value) : '—'}
            {raw !== undefined && (
              <span style={{ color: '#DC2626', marginLeft: 4, fontSize: 10 }} title="Значение 90°, исключено из линии">
                ⚠️ {formatAngle(raw)}
              </span>
            )}
            {!isModelView && isAgm && result && (
              <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 4px', borderRadius: 4, backgroundColor: result === 'Y' ? '#D1FAE5' : '#FEE2E2', color: result === 'Y' ? '#065F46' : '#991B1B' }}>
                {result === 'Y' ? 'OK' : 'NOK'}
              </span>
            )}
          </p>
        );
      })}

      {allVins.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onShowVins(allVins, data.fullDate || data.date);
            }}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #2563EB', background: '#EFF6FF', color: '#1D4ED8', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
          >
            🔍 VINs ({allVins.length}) — открыть список
          </button>
        </div>
      )}
    </div>
  );
};

// ======================= ГРАФИКИ =======================
function AlignmentCharts({ chartData, showVolume = false, isModelView = false }) {
  const [groupFilter, setGroupFilter] = useState('all');
  const [vinModal, setVinModal] = useState({ open: false, vins: [], label: '' });
  const [activeChartId, setActiveChartId] = useState(null);

  // Закрываем тултипы при клике вне графиков и вне модалки
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.recharts-wrapper') && !e.target.closest('.vins-modal-overlay')) {
        setActiveChartId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeData = useMemo(() => {
    if (!Array.isArray(chartData)) return [];
    return chartData.map(row => {
      const clean = { ...row };
      for (const key of Object.keys(clean)) {
        if (!key.startsWith('hunter_') && !key.startsWith('agm_')) continue;
        if (key === 'hunter_cars' || key === 'agm_cars' ||
            key === 'hunter_sentinel_count' || key === 'agm_sentinel_count' ||
            key === 'hunter_vins' || key === 'agm_vins' ||
            key.endsWith('_raw') || key.endsWith('_result')) continue;
        if (isSentinelValue(clean[key])) {
          clean[`${key}_raw`] = clean[key];
          clean[key] = null;
        }
      }
      return clean;
    });
  }, [chartData]);

  const sentinelCount = useMemo(() => {
    let n = 0;
    if (!Array.isArray(chartData)) return n;
    const hasBackend = chartData.some(r =>
      r.hunter_sentinel_count !== undefined || r.agm_sentinel_count !== undefined
    );
    if (hasBackend) {
      for (const row of chartData) {
        n += (row.hunter_sentinel_count || 0) + (row.agm_sentinel_count || 0);
      }
    } else {
      for (const row of chartData) {
        for (const key of Object.keys(row)) {
          if (!key.startsWith('hunter_') && !key.startsWith('agm_')) continue;
          if (key === 'hunter_cars' || key === 'agm_cars' ||
              key === 'hunter_sentinel_count' || key === 'agm_sentinel_count' ||
              key === 'hunter_vins' || key === 'agm_vins' ||
              key.endsWith('_raw') || key.endsWith('_result')) continue;
          if (isSentinelValue(row[key])) n++;
        }
      }
    }
    return n;
  }, [chartData]);

  const openVins = (vins, label) => setVinModal({ open: true, vins, label });
  const closeVins = () => setVinModal({ open: false, vins: [], label: '' });

  const filteredConfig = groupFilter === 'all' 
    ? CHARTS_CONFIG 
    : CHARTS_CONFIG.filter(c => c.group === groupFilter);

  const renderChartCard = (title, domain, key, norm, children) => (
    <div style={{ border: '1px solid #E5E7EB', padding: '16px', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
      <h4 style={{ textAlign: 'center', marginBottom: '16px', color: '#374151', fontSize: 15, fontWeight: 700 }}>{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        {children}
      </ResponsiveContainer>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {sentinelCount > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400E' }}>
          ⚠️ Значений <b>90°</b> исключено из линий: <b>{sentinelCount}</b>. Реальные значения видны в тултипе при клике на точку.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>Выберите группу:</span>
        <button onClick={() => setGroupFilter('all')} style={{ ...buttonStyle, background: groupFilter === 'all' ? '#2563EB' : '#D1D5DB', color: groupFilter === 'all' ? '#FFF' : '#374151' }}>Все графики</button>
        <button onClick={() => setGroupFilter('Передний мост')} style={{ ...buttonStyle, background: groupFilter === 'Передний мост' ? '#2563EB' : '#D1D5DB', color: groupFilter === 'Передний мост' ? '#FFF' : '#374151' }}>Передний мост</button>
        <button onClick={() => setGroupFilter('Задний мост')} style={{ ...buttonStyle, background: groupFilter === 'Задний мост' ? '#2563EB' : '#D1D5DB', color: groupFilter === 'Задний мост' ? '#FFF' : '#374151' }}>Задний мост</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
        {filteredConfig.map(param => (
          <React.Fragment key={param.key}>
            {renderChartCard(param.name, param.domain, param.key, param.norm,
              <LineChart 
                data={safeData} 
                onClick={() => setActiveChartId(param.key)}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }} 
                style={{ userSelect: 'none' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis domain={param.domain} tickFormatter={(val) => formatAngle(val)} width={60} />
                
                <Tooltip 
                  content={<CustomTooltip isModelView={isModelView} onShowVins={openVins} />} 
                  trigger="click"
                  active={activeChartId === param.key ? undefined : false}
                  wrapperStyle={{ pointerEvents: 'auto', zIndex: 1000, outline: 'none' }}
                  isAnimationActive={false}
                />
                
                <Legend wrapperStyle={{ fontSize: 12 }} />
                
                {param.norm && (
                  <>
                    <ReferenceLine y={param.norm[0]} stroke="#ef4444" strokeDasharray="3 3" />
                    {param.norm[1] !== param.norm[0] && <ReferenceLine y={param.norm[1]} stroke="#ef4444" strokeDasharray="3 3" />}
                  </>
                )}

                <Line type="monotone" dataKey={`hunter_${param.key}`} name="Hunter" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey={`agm_${param.key}`} name="AGM (Серийный)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            )}
          </React.Fragment>
        ))}
      </div>

      {showVolume && (
        <div>
          <h3 style={{ fontSize: 18, color: '#1F2937', marginBottom: 16, borderBottom: '2px solid #E5E7EB', paddingBottom: 8 }}>Объем прошедших авто</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            {renderChartCard('Количество машин по дням', [0, 'auto'], 'cars', null,
              <AreaChart 
                data={chartData} 
                onClick={() => setActiveChartId('volume')}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }} 
                style={{ userSelect: 'none' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis width={40} />
                <Tooltip 
                  trigger="click"
                  active={activeChartId === 'volume' ? undefined : false}
                  isAnimationActive={false} 
                  wrapperStyle={{ pointerEvents: 'auto', zIndex: 1000, outline: 'none' }}
                />
                <Area type="monotone" dataKey="cars" name="Кол-во машин (Hunter)" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                <Area type="monotone" dataKey="agm_cars" name="Кол-во машин (IoT)" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
              </AreaChart>
            )}
          </div>
        </div>
      )}

      <VinsModal open={vinModal.open} vins={vinModal.vins} label={vinModal.label} onClose={closeVins} />
    </div>
  );
}

// ======================= ВКЛАДКА: АНАЛИТИКА ПО МОДЕЛЯМ =======================
function ChartsViewModels() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`${API_BASE}/api/alignment-models`)
      .then(r => r.json())
      .then(data => setModels(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadCharts();
  }, [selectedModel]);

  const loadCharts = async () => {
    if (!selectedModel || !startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/alignment-charts?model=${selectedModel}&startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();

      if (!Array.isArray(json) || json.length === 0) {
        setChartData([]);
        return;
      }

      const isPreAggregated = json[0].hunter_cars !== undefined || json[0].agm_cars !== undefined;

      if (isPreAggregated) {
        setChartData(json.map(item => ({
          ...item,
          cars: item.hunter_cars != null ? item.hunter_cars : 0
        })));
      } else {
        const grouped = {};
        json.forEach(item => {
          const dateStr = item.date;
          if (!grouped[dateStr]) grouped[dateStr] = { count: 0, sum: {} };
          const g = grouped[dateStr];
          g.count++;
          Object.keys(item).forEach(key => {
            if (key !== 'date' && key !== 'time' && key !== 'vin' && typeof item[key] === 'number') {
              if (!g.sum[key]) g.sum[key] = 0;
              g.sum[key] += item[key];
            }
          });
        });
        const prepared = Object.keys(grouped).sort().map(dateStr => {
          const g = grouped[dateStr];
          const avg = {
            date: `${dateStr.substring(8, 10)}.${dateStr.substring(5, 7)}`,
            fullDate: `${dateStr.substring(8, 10)}.${dateStr.substring(5, 7)}.${dateStr.substring(0, 4)}`,
            cars: g.count
          };
          Object.keys(g.sum).forEach(key => { avg[key] = g.sum[key] / g.count; });
          return avg;
        });
        setChartData(prepared);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12 }}>
        <label style={labelStyle}>Модель:
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={selectStyle}>
            <option value="ALL">Все модели</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label style={labelStyle}>С даты:
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>По дату:
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
        </label>
        <button onClick={loadCharts} disabled={loading || !selectedModel || !startDate || !endDate} style={{ ...buttonStyle, background: '#2563EB' }}>
          {loading ? '⏳ Загрузка...' : 'Построить графики'}
        </button>
      </div>

      {chartData.length > 0 ? (
        <AlignmentCharts chartData={chartData} showVolume={true} isModelView={true} />
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
          {loading ? 'Загрузка...' : 'Нет данных для выбранного периода'}
        </div>
      )}
    </div>
  );
}

// ======================= ВКЛАДКА: АНАЛИТИКА ПО VIN =======================
function ChartsViewVIN() {
  const [vin, setVin] = useState('');
  const [searchedVin, setSearchedVin] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [partialMessage, setPartialMessage] = useState(null);

  const loadVINData = async () => {
    if (!vin.trim()) return;
    setLoading(true);
    setError(null);
    setPartialMessage(null);
    setChartData([]);
    setSearchedVin('');

    try {
      const res = await fetch(`${API_BASE}/api/alignment-report?vin=${vin.trim()}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();

      const reports = Array.isArray(json) ? json : (json.reports || []);
      const measurements = Array.isArray(json) ? [] : (json.agmMeasurements || []);
      const message = Array.isArray(json) ? null : (json.message || null);

      if (reports.length === 0 && measurements.length === 0) {
        setError(message || 'Отчеты не найдены (проверьте VIN)');
        return;
      }

      const resolvedVin = reports[0]?.requestedVin || reports[0]?.vin || vin;
      setSearchedVin(resolvedVin);
      if (message) setPartialMessage(message);

      const hunterRows = reports
        .filter(r => r.hunterAvailable !== false && !!r.begin_date)
        .map(item => {
          const fl = getSmartVal(item.f_camber_l_after, item.f_camber_l_before);
          const fr = getSmartVal(item.f_camber_r_after, item.f_camber_r_before);
          const rl = getSmartVal(item.r_camber_l_after, item.r_camber_l_before);
          const rr = getSmartVal(item.r_camber_r_after, item.r_camber_r_before);
          return {
            date: item.begin_date.substring(5, 16),
            fullDate: item.begin_date,
            vin: item.vin,
            hunter_vins: item.vin ? [item.vin] : [],
            agm_vins: [],
            hunter_f_camber_l: fl,
            hunter_f_camber_r: fr,
            hunter_f_camber_diff: (fl != null && fr != null) ? fl - fr : null,
            hunter_f_toe_l: getSmartVal(item.f_toe_l_after, item.f_toe_l_before),
            hunter_f_toe_r: getSmartVal(item.f_toe_r_after, item.f_toe_r_before),
            hunter_f_toe_total: getSmartVal(item.f_toe_total_after, item.f_toe_total_before),
            hunter_f_caster_l: getSmartVal(item.f_caster_l_after, item.f_caster_l_before),
            hunter_f_caster_r: getSmartVal(item.f_caster_r_after, item.f_caster_r_before),
            hunter_f_caster_diff: getDiff(item.f_caster_l_after, item.f_caster_r_after),
            hunter_f_kpi_l: getSmartVal(item.f_kpi_l_after, item.f_kpi_l_before),
            hunter_f_kpi_r: getSmartVal(item.f_kpi_r_after, item.f_kpi_r_before),
            hunter_f_kpi_diff: getDiff(item.f_kpi_l_after, item.f_kpi_r_after),
            hunter_r_camber_l: rl,
            hunter_r_camber_r: rr,
            hunter_r_camber_diff: (rl != null && rr != null) ? rl - rr : null,
            hunter_r_toe_l: getSmartVal(item.r_toe_l_after, item.r_toe_l_before),
            hunter_r_toe_r: getSmartVal(item.r_toe_r_after, item.r_toe_r_before),
            hunter_r_toe_total: getSmartVal(item.r_toe_total_after, item.r_toe_total_before),
            hunter_r_thrust: getSmartVal(item.r_thrust_after, item.r_thrust_before)
          };
        });

      const agmRows = measurements.map(m => {
        const v = m.values || {};
        const ct = m.creation_time || '';
        return {
          date: ct ? ct.substring(5, 16) : 'IoT',
          fullDate: ct || '-',
          vin: resolvedVin,
          hunter_vins: [],
          agm_vins: resolvedVin ? [resolvedVin] : [],
          measurement_id: m.measurement_id,
          agm_f_camber_l: parseVal(v.f_camber_l),
          agm_f_camber_r: parseVal(v.f_camber_r),
          agm_f_camber_diff: getDiff(v.f_camber_l, v.f_camber_r),
          agm_f_toe_l: parseVal(v.f_toe_l),
          agm_f_toe_r: parseVal(v.f_toe_r),
          agm_f_toe_total: parseVal(v.f_toe_total),
          agm_f_caster_l: parseVal(v.f_caster_l),
          agm_f_caster_r: parseVal(v.f_caster_r),
          agm_f_caster_diff: getDiff(v.f_caster_l, v.f_caster_r),
          agm_f_kpi_l: parseVal(v.f_kpi_l),
          agm_f_kpi_r: parseVal(v.f_kpi_r),
          agm_f_kpi_diff: getDiff(v.f_kpi_l, v.f_kpi_r),
          agm_r_camber_l: parseVal(v.r_camber_l),
          agm_r_camber_r: parseVal(v.r_camber_r),
          agm_r_camber_diff: getDiff(v.r_camber_l, v.r_camber_r),
          agm_r_toe_l: parseVal(v.r_toe_l),
          agm_r_toe_r: parseVal(v.r_toe_r),
          agm_r_toe_total: parseVal(v.r_toe_total),
          agm_r_thrust: parseVal(v.r_thrust),
          agm_f_camber_l_result: v.f_camber_l_result,
          agm_f_camber_r_result: v.f_camber_r_result,
          agm_f_camber_diff_result: v.f_camber_diff_result,
          agm_f_toe_l_result: v.f_toe_l_result,
          agm_f_toe_r_result: v.f_toe_r_result,
          agm_f_toe_total_result: v.f_toe_total_result,
          agm_f_caster_l_result: v.f_caster_l_result,
          agm_f_caster_r_result: v.f_caster_r_result,
          agm_f_caster_diff_result: v.f_caster_diff_result,
          agm_f_kpi_l_result: v.f_kpi_l_result,
          agm_f_kpi_r_result: v.f_kpi_r_result,
          agm_f_kpi_diff_result: v.f_kpi_diff_result,
          agm_r_camber_l_result: v.r_camber_l_result,
          agm_r_camber_r_result: v.r_camber_r_result,
          agm_r_camber_diff_result: v.r_camber_diff_result,
          agm_r_toe_l_result: v.r_toe_l_result,
          agm_r_toe_r_result: v.r_toe_r_result,
          agm_r_toe_total_result: v.r_toe_total_result,
          agm_r_thrust_result: v.r_thrust_result
        };
      });

      const combined = [...hunterRows, ...agmRows].sort((a, b) => {
        if (!a.fullDate || a.fullDate === '-') return 1;
        if (!b.fullDate || b.fullDate === '-') return -1;
        return a.fullDate.localeCompare(b.fullDate);
      });

      setChartData(combined);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, alignItems: 'center' }}>
        <label style={labelStyle}>🔍 VIN для анализа:
          <input 
            type="text" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') loadVINData(); }} 
            placeholder="Введите VIN" style={{ ...inputStyle, width: 300 }} 
          />
        </label>
        <button onClick={loadVINData} disabled={!vin.trim() || loading} style={{ ...buttonStyle, background: '#2563EB', opacity: vin.trim() ? 1 : 0.6 }}>
          {loading ? '⏳ Загрузка...' : 'Построить графики по VIN'}
        </button>
        {error && <span style={{ color: '#DC2626', fontSize: 14 }}>❌ {error}</span>}
      </div>

      {partialMessage && (
        <div style={{
          padding: '12px 16px', margin: '0 0 20px 0',
          background: '#fff7e6', border: '1px solid #ffd591',
          borderRadius: 8, color: '#874d00', fontSize: 14, fontWeight: 500
        }}>
          ⚠️ {partialMessage}
        </div>
      )}

      {searchedVin && (
        <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, color: '#1F2937', backgroundColor: '#EFF6FF', padding: '10px 16px', borderRadius: 8, borderLeft: '4px solid #2563EB' }}>
          📊 Данные по VIN: {searchedVin}
        </div>
      )}

      {chartData.length > 0 ? (
        <AlignmentCharts chartData={chartData} showVolume={false} />
      ) : (
        !error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
            {loading ? 'Загрузка...' : 'Введите VIN и нажмите "Построить графики"'}
          </div>
        )
      )}
    </div>
  );
}

// ======================= ВКЛАДКА: ТАБЛИЦА =======================
function TableView() {
  const [vin, setVin] = useState('');
  const [reportsList, setReportsList] = useState([]);
  const [reportIndex, setReportIndex] = useState(0);
  const [agmMeasurements, setAgmMeasurements] = useState([]);
  const [agmIndex, setAgmIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [partialMessage, setPartialMessage] = useState(null);
  
  const [isDms, setIsDms] = useState(true);

  const data = reportsList[reportIndex];
  const agm = agmMeasurements[agmIndex]?.values || {};

  // Авто-выбор ближайшего AGM-замера при смене Hunter-отчёта
  useEffect(() => {
    if (agmMeasurements.length === 0) return;
    const hunterDate = reportsList[reportIndex]?.begin_date;
    if (!hunterDate) { setAgmIndex(0); return; }
    const hunterTs = new Date(hunterDate.replace(' ', 'T')).getTime();
    if (isNaN(hunterTs)) { setAgmIndex(0); return; }

    let bestIdx = 0;
    let bestDiff = Infinity;
    agmMeasurements.forEach((m, i) => {
      if (!m.creation_time) return;
      const agmTs = new Date(m.creation_time.replace(' ', 'T')).getTime();
      if (isNaN(agmTs)) return;
      const diff = Math.abs(agmTs - hunterTs);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    });
    setAgmIndex(bestIdx);
  }, [reportIndex, reportsList, agmMeasurements]);

  const loadData = async () => {
    if (!vin.trim()) return;
    setLoading(true);
    setError(null);
    setPartialMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/alignment-report?vin=${vin.trim()}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();

      const reports = Array.isArray(json) ? json : (json.reports || []);
      const measurements = Array.isArray(json) ? [] : (json.agmMeasurements || []);
      const msg = Array.isArray(json) ? null : (json.message || null);

      if (reports.length === 0 && measurements.length === 0) {
        setError(msg || 'Отчеты не найдены (проверьте VIN)');
        setReportsList([]);
        setAgmMeasurements([]);
        setPartialMessage(null);
      } else {
        setReportsList(reports);
        setAgmMeasurements(measurements);
        setReportIndex(0);
        setAgmIndex(0);
        setPartialMessage(msg);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data) return;
    
    const fmt = (val) => isDms ? formatDMS(val) : formatDecimal(val);
    const currentAgm = agmMeasurements[agmIndex]?.values || {};

    const exportData = [
      { 'Наименование': 'Передний мост', 'Мин': '', 'Макс': '', 'Начальное': '', 'Конечное': '', 'Значение IoT': '', 'Наименование IoT': '', 'ОК/НОК AGMWA01': '' },
      { 'Наименование': 'Развал: левый', 'Мин': fmt(data.f_camber_l_min), 'Макс': fmt(data.f_camber_l_max), 'Начальное': fmt(data.f_camber_l_before), 'Конечное': fmt(data.f_camber_l_after), 'Значение IoT': fmt(currentAgm.f_camber_l), 'Наименование IoT': IoT.f_camber_l, 'ОК/НОК AGMWA01': currentAgm.f_camber_l_result },
      { 'Наименование': 'Развал: правый', 'Мин': fmt(data.f_camber_l_min), 'Макс': fmt(data.f_camber_l_max), 'Начальное': fmt(data.f_camber_r_before), 'Конечное': fmt(data.f_camber_r_after), 'Значение IoT': fmt(currentAgm.f_camber_r), 'Наименование IoT': IoT.f_camber_r, 'ОК/НОК AGMWA01': currentAgm.f_camber_r_result },
      { 'Наименование': 'Развал: разница', 'Мин': '-0°30\'', 'Макс': '+0°30\'', 'Начальное': fmt(getDiff(data.f_camber_l_before, data.f_camber_r_before)), 'Конечное': fmt(getDiff(data.f_camber_l_after, data.f_camber_r_after)), 'Значение IoT': fmt(getDiff(currentAgm.f_camber_l, currentAgm.f_camber_r)), 'Наименование IoT': IoT.f_camber_diff, 'ОК/НОК AGMWA01': currentAgm.f_camber_diff_result },
      { 'Наименование': 'Схождение: левое', 'Мин': fmt(data.f_toe_l_min), 'Макс': fmt(data.f_toe_l_max), 'Начальное': fmt(data.f_toe_l_before), 'Конечное': fmt(data.f_toe_l_after), 'Значение IoT': fmt(currentAgm.f_toe_l), 'Наименование IoT': IoT.f_toe_l, 'ОК/НОК AGMWA01': currentAgm.f_toe_l_result },
      { 'Наименование': 'Схождение: правое', 'Мин': fmt(data.f_toe_l_min), 'Макс': fmt(data.f_toe_l_max), 'Начальное': fmt(data.f_toe_r_before), 'Конечное': fmt(data.f_toe_r_after), 'Значение IoT': fmt(currentAgm.f_toe_r), 'Наименование IoT': IoT.f_toe_r, 'ОК/НОК AGMWA01': currentAgm.f_toe_r_result },
      { 'Наименование': 'Схождение: суммарное', 'Мин': fmt(data.f_toe_total_min), 'Макс': fmt(data.f_toe_total_max), 'Начальное': fmt(data.f_toe_total_before), 'Конечное': fmt(data.f_toe_total_after), 'Значение IoT': fmt(currentAgm.f_toe_total), 'Наименование IoT': IoT.f_toe_total, 'ОК/НОК AGMWA01': currentAgm.f_toe_total_result },
      { 'Наименование': 'Продольный наклон шкворня: левый', 'Мин': fmt(data.f_caster_l_min), 'Макс': fmt(data.f_caster_l_max), 'Начальное': fmt(data.f_caster_l_before), 'Конечное': fmt(data.f_caster_l_after), 'Значение IoT': fmt(currentAgm.f_caster_l), 'Наименование IoT': IoT.f_caster_l, 'ОК/НОК AGMWA01': currentAgm.f_caster_l_result },
      { 'Наименование': 'Продольный наклон шкворня: правый', 'Мин': fmt(data.f_caster_l_min), 'Макс': fmt(data.f_caster_l_max), 'Начальное': fmt(data.f_caster_r_before), 'Конечное': fmt(data.f_caster_r_after), 'Значение IoT': fmt(currentAgm.f_caster_r), 'Наименование IoT': IoT.f_caster_r, 'ОК/НОК AGMWA01': currentAgm.f_caster_r_result },
      { 'Наименование': 'Продольный наклон шкворня: разница', 'Мин': '- - -', 'Макс': '- - -', 'Начальное': fmt(getDiff(data.f_caster_l_before, data.f_caster_r_before)), 'Конечное': fmt(getDiff(data.f_caster_l_after, data.f_caster_r_after)), 'Значение IoT': fmt(getDiff(currentAgm.f_caster_l, currentAgm.f_caster_r)), 'Наименование IoT': IoT.f_caster_diff, 'ОК/НОК AGMWA01': currentAgm.f_caster_diff_result },
      { 'Наименование': 'Поперечный наклон шкворня: левый', 'Мин': fmt(data.f_kpi_l_min), 'Макс': fmt(data.f_kpi_l_max), 'Начальное': fmt(data.f_kpi_l_before), 'Конечное': fmt(data.f_kpi_l_after), 'Значение IoT': fmt(currentAgm.f_kpi_l), 'Наименование IoT': IoT.f_kpi_l, 'ОК/НОК AGMWA01': currentAgm.f_kpi_l_result },
      { 'Наименование': 'Поперечный наклон шкворня: правый', 'Мин': fmt(data.f_kpi_l_min), 'Макс': fmt(data.f_kpi_l_max), 'Начальное': fmt(data.f_kpi_r_before), 'Конечное': fmt(data.f_kpi_r_after), 'Значение IoT': fmt(currentAgm.f_kpi_r), 'Наименование IoT': IoT.f_kpi_r, 'ОК/НОК AGMWA01': currentAgm.f_kpi_r_result },
      { 'Наименование': 'Поперечный наклон шкворня: разница', 'Мин': '- - -', 'Макс': '- - -', 'Начальное': fmt(getDiff(data.f_kpi_l_before, data.f_kpi_r_before)), 'Конечное': fmt(getDiff(data.f_kpi_l_after, data.f_kpi_r_after)), 'Значение IoT': fmt(getDiff(currentAgm.f_kpi_l, currentAgm.f_kpi_r)), 'Наименование IoT': IoT.f_kpi_diff, 'ОК/НОК AGMWA01': currentAgm.f_kpi_diff_result },
      { 'Наименование': 'Задний мост', 'Мин': '', 'Макс': '', 'Начальное': '', 'Конечное': '', 'Значение IoT': '', 'Наименование IoT': '', 'ОК/НОК AGMWA01': '' },
      { 'Наименование': 'Развал: левый', 'Мин': fmt(data.r_camber_l_min), 'Макс': fmt(data.r_camber_l_max), 'Начальное': fmt(data.r_camber_l_before), 'Конечное': fmt(data.r_camber_l_after), 'Значение IoT': fmt(currentAgm.r_camber_l), 'Наименование IoT': IoT.r_camber_l, 'ОК/НОК AGMWA01': currentAgm.r_camber_l_result },
      { 'Наименование': 'Развал: правый', 'Мин': fmt(data.r_camber_l_min), 'Макс': fmt(data.r_camber_l_max), 'Начальное': fmt(data.r_camber_r_before), 'Конечное': fmt(data.r_camber_r_after), 'Значение IoT': fmt(currentAgm.r_camber_r), 'Наименование IoT': IoT.r_camber_r, 'ОК/НОК AGMWA01': currentAgm.r_camber_r_result },
      { 'Наименование': 'Развал: разница', 'Мин': '-0°30\'', 'Макс': '+0°30\'', 'Начальное': fmt(getDiff(data.r_camber_l_before, data.r_camber_r_before)), 'Конечное': fmt(getDiff(data.r_camber_l_after, data.r_camber_r_after)), 'Значение IoT': fmt(getDiff(currentAgm.r_camber_l, currentAgm.r_camber_r)), 'Наименование IoT': IoT.r_camber_diff, 'ОК/НОК AGMWA01': currentAgm.r_camber_diff_result },
      { 'Наименование': 'Схождение: левое', 'Мин': fmt(data.r_toe_l_min), 'Макс': fmt(data.r_toe_l_max), 'Начальное': fmt(data.r_toe_l_before), 'Конечное': fmt(data.r_toe_l_after), 'Значение IoT': fmt(currentAgm.r_toe_l), 'Наименование IoT': IoT.r_toe_l, 'ОК/НОК AGMWA01': currentAgm.r_toe_l_result },
      { 'Наименование': 'Схождение: правое', 'Мин': fmt(data.r_toe_l_min), 'Макс': fmt(data.r_toe_l_max), 'Начальное': fmt(data.r_toe_r_before), 'Конечное': fmt(data.r_toe_r_after), 'Значение IoT': fmt(currentAgm.r_toe_r), 'Наименование IoT': IoT.r_toe_r, 'ОК/НОК AGMWA01': currentAgm.r_toe_r_result },
      { 'Наименование': 'Схождение: суммарное', 'Мин': fmt(data.r_toe_total_min), 'Макс': fmt(data.r_toe_total_max), 'Начальное': fmt(data.r_toe_total_before), 'Конечное': fmt(data.r_toe_total_after), 'Значение IoT': fmt(currentAgm.r_toe_total), 'Наименование IoT': IoT.r_toe_total, 'ОК/НОК AGMWA01': currentAgm.r_toe_total_result },
      { 'Наименование': 'Угол движения', 'Мин': '- - -', 'Макс': '- - -', 'Начальное': fmt(data.r_thrust_before), 'Конечное': fmt(data.r_thrust_after), 'Значение IoT': fmt(currentAgm.r_thrust), 'Наименование IoT': IoT.r_thrust, 'ОК/НОК AGMWA01': currentAgm.r_thrust_result },
    ];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Развал');
    XLSX.writeFile(wb, `Развал_${data.requestedVin || data.vin}.xlsx`);
  };

  const TableRow = ({ label, before, after, min, max, iotValue, iotName, agmResult }) => {
    const beforeNum = parseVal(before);
    const minNum = parseVal(min);
    const maxNum = parseVal(max);
    
    const isOk = beforeNum !== null && minNum !== null && maxNum !== null 
      ? (beforeNum >= minNum && beforeNum <= maxNum) 
      : null;

    const fmt = (val) => isDms ? formatDMS(val) : formatDecimal(val);

    return (
      <tr style={{ borderBottom: '1px solid #000', textAlign: 'center', fontSize: '14px', fontFamily: '"Times New Roman", Times, serif' }}>
        <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #000', paddingRight: 15 }}>{label}</td>
        
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{fmt(min)}</td>
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{fmt(max)}</td>
        <td style={{ padding: '6px', borderRight: '1px solid #000', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            {isOk !== null && (
              <span style={{ fontSize: '16px', position: 'absolute', left: '10px' }}>
                {isOk ? '✅' : '❌'}
              </span>
            )}
            <span>{fmt(before)}</span>
          </div>
        </td>
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{fmt(after)}</td>

        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{fmt(iotValue)}</td>
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>
          {iotName || '- - -'}
        </td>
        <td style={{ padding: '6px', color: agmResult === 'Y' ? '#059669' : (agmResult === 'N' ? '#DC2626' : '#374151'), fontWeight: 'bold' }}>
          {agmResult === 'Y' ? 'OK' : (agmResult === 'N' ? 'NOK' : '- - -')}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={labelStyle}>🔍 VIN:
          <input 
            type="text" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') loadData(); }} 
            placeholder="Полный или часть (TG049519)" style={{ ...inputStyle, width: 350 }} 
          />
        </label>
        <button onClick={loadData} disabled={!vin.trim() || loading} style={{ ...buttonStyle, background: '#2563EB', opacity: vin.trim() ? 1 : 0.6 }}>
          {loading ? '⏳ Загрузка...' : '🔍 Найти'}
        </button>
        {error && <span style={{ color: '#DC2626', fontSize: 14 }}>❌ {error}</span>}
      </div>

      {(reportsList.length > 1 || agmMeasurements.length > 1) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8 }}>
          {reportsList.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#4B5563', fontWeight: 500 }}>Замер Hunter:</span>
              <select value={reportIndex} onChange={(e) => setReportIndex(Number(e.target.value))} style={selectStyle}>
                {reportsList.map((r, i) => (
                  <option key={r.report_id || i} value={i}>
                    {r.begin_date || 'IoT-only'} {r.report_id ? `(ID: ${r.report_id})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {agmMeasurements.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#4B5563', fontWeight: 500 }}>Замер IoT:</span>
              <select value={agmIndex} onChange={(e) => setAgmIndex(Number(e.target.value))} style={selectStyle}>
                {agmMeasurements.map((m, i) => (
                  <option key={m.measurement_id || i} value={i}>
                    {m.creation_time || 'IoT'} {m.measurement_id ? `(ID: ${m.measurement_id})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {agmMeasurements.length === 1 && agmMeasurements[0].creation_time && (
            <span style={{ fontSize: 13, color: '#6B7280' }}>
              📅 Замер IoT: {agmMeasurements[0].creation_time}
            </span>
          )}
        </div>
      )}

      {partialMessage && (
        <div style={{
          padding: '12px 16px', margin: '0 0 16px 0',
          background: '#fff7e6', border: '1px solid #ffd591',
          borderRadius: 8, color: '#874d00', fontSize: 14, fontWeight: 500
        }}>
          ⚠️ {partialMessage}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, justifyContent: 'flex-end', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#4B5563', fontWeight: 500, marginRight: 'auto' }}>
              <input type="checkbox" checked={isDms} onChange={(e) => setIsDms(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              Значения: Градусы° Минуты'
            </label>
            <button onClick={() => window.print()} style={{ ...buttonStyle, background: '#DC2626' }}>📄 Экспорт в PDF (Печать)</button>
            <button onClick={exportToExcel} style={{ ...buttonStyle, background: '#059669' }}>📊 Экспорт в Excel</button>
          </div>

          <div id="print-section" style={{ border: '2px solid #000', maxWidth: '1200px', margin: '0 auto', padding: 20 }}>
            <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: 15, fontFamily: '"Times New Roman", Times, serif' }}>
              VIN: {data.requestedVin || data.vin} | Модель: {data.full_model_name ? data.full_model_name.replace('AGM>', '').trim() : '-'} | Дата Hunter: {data.begin_date || '-'}
              {agmMeasurements[agmIndex]?.creation_time && ` | Замер IoT: ${agmMeasurements[agmIndex].creation_time}`}
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
              <thead style={{ fontSize: '14px', fontFamily: '"Times New Roman", Times, serif' }}>
                <tr>
                  <th rowSpan={3} style={{ border: '1px solid #000', padding: '8px', width: '25%', textAlign: 'left' }}>Наименование:</th>
                  <th colSpan={4} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Hunter</th>
                  <th colSpan={3} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>IoT</th>
                </tr>
                <tr>
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'normal' }}>Нормативы</th>
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'normal' }}>Измерение</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', width: '11%', fontWeight: 'normal' }}>Значение IoT</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', width: '16%', fontWeight: 'normal' }}>Наименование IoT</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', width: '10%', fontWeight: 'normal' }}>ОК/НОК AGMWA01</th>
                </tr>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '9%', fontWeight: 'normal' }}>Мин</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '9%', fontWeight: 'normal' }}>Макс.</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '10%', fontWeight: 'normal' }}>Начальное</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '10%', fontWeight: 'normal' }}>Конечное</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={8} style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px', backgroundColor: '#e5e7eb', borderBottom: '1px solid #000', fontFamily: '"Times New Roman", Times, serif', fontSize: '16px' }}>Передний мост</td></tr>
                
                <TableRow label="Развал: левый" before={data.f_camber_l_before} after={data.f_camber_l_after} min={data.f_camber_l_min} max={data.f_camber_l_max} iotName={IoT.f_camber_l} iotValue={agm.f_camber_l} agmResult={agm.f_camber_l_result} />
                <TableRow label="Развал: правый" before={data.f_camber_r_before} after={data.f_camber_r_after} min={data.f_camber_l_min} max={data.f_camber_l_max} iotName={IoT.f_camber_r} iotValue={agm.f_camber_r} agmResult={agm.f_camber_r_result} />
                <TableRow label="Развал: разница" before={getDiff(data.f_camber_l_before, data.f_camber_r_before)} after={getDiff(data.f_camber_l_after, data.f_camber_r_after)} min={-0.5} max={0.5} iotName={IoT.f_camber_diff} iotValue={getDiff(agm.f_camber_l, agm.f_camber_r)} agmResult={agm.f_camber_diff_result} />
                
                <TableRow label="Схождение: левое" before={data.f_toe_l_before} after={data.f_toe_l_after} min={data.f_toe_l_min} max={data.f_toe_l_max} iotName={IoT.f_toe_l} iotValue={agm.f_toe_l} agmResult={agm.f_toe_l_result} />
                <TableRow label="Схождение: правое" before={data.f_toe_r_before} after={data.f_toe_r_after} min={data.f_toe_l_min} max={data.f_toe_l_max} iotName={IoT.f_toe_r} iotValue={agm.f_toe_r} agmResult={agm.f_toe_r_result} />
                <TableRow label="Схождение: суммарное" before={data.f_toe_total_before} after={data.f_toe_total_after} min={data.f_toe_total_min} max={data.f_toe_total_max} iotName={IoT.f_toe_total} iotValue={agm.f_toe_total} agmResult={agm.f_toe_total_result} />
                
                <TableRow label="Продольный наклон шкворня: левый" before={data.f_caster_l_before} after={data.f_caster_l_after} min={data.f_caster_l_min} max={data.f_caster_l_max} iotName={IoT.f_caster_l} iotValue={agm.f_caster_l} agmResult={agm.f_caster_l_result} />
                <TableRow label="Продольный наклон шкворня: правый" before={data.f_caster_r_before} after={data.f_caster_r_after} min={data.f_caster_l_min} max={data.f_caster_l_max} iotName={IoT.f_caster_r} iotValue={agm.f_caster_r} agmResult={agm.f_caster_r_result} />
                <TableRow label="Продольный наклон шкворня: разница" before={getDiff(data.f_caster_l_before, data.f_caster_r_before)} after={getDiff(data.f_caster_l_after, data.f_caster_r_after)} min={null} max={null} iotName={IoT.f_caster_diff} iotValue={getDiff(agm.f_caster_l, agm.f_caster_r)} agmResult={agm.f_caster_diff_result} />
                
                <TableRow label="Поперечный наклон шкворня: левый" before={data.f_kpi_l_before} after={data.f_kpi_l_after} min={data.f_kpi_l_min} max={data.f_kpi_l_max} iotName={IoT.f_kpi_l} iotValue={agm.f_kpi_l} agmResult={agm.f_kpi_l_result} />
                <TableRow label="Поперечный наклон шкворня: правый" before={data.f_kpi_r_before} after={data.f_kpi_r_after} min={data.f_kpi_l_min} max={data.f_kpi_l_max} iotName={IoT.f_kpi_r} iotValue={agm.f_kpi_r} agmResult={agm.f_kpi_r_result} />
                <TableRow label="Поперечный наклон шкворня: разница" before={getDiff(data.f_kpi_l_before, data.f_kpi_r_before)} after={getDiff(data.f_kpi_l_after, data.f_kpi_r_after)} min={null} max={null} iotName={IoT.f_kpi_diff} iotValue={getDiff(agm.f_kpi_l, agm.f_kpi_r)} agmResult={agm.f_kpi_diff_result} />

                <tr><td colSpan={8} style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px', backgroundColor: '#e5e7eb', borderBottom: '1px solid #000', borderTop: '1px solid #000', fontFamily: '"Times New Roman", Times, serif', fontSize: '16px' }}>Задний мост</td></tr>
                
                <TableRow label="Развал: левый" before={data.r_camber_l_before} after={data.r_camber_l_after} min={data.r_camber_l_min} max={data.r_camber_l_max} iotName={IoT.r_camber_l} iotValue={agm.r_camber_l} agmResult={agm.r_camber_l_result} />
                <TableRow label="Развал: правый" before={data.r_camber_r_before} after={data.r_camber_r_after} min={data.r_camber_l_min} max={data.r_camber_l_max} iotName={IoT.r_camber_r} iotValue={agm.r_camber_r} agmResult={agm.r_camber_r_result} />
                <TableRow label="Развал: разница" before={getDiff(data.r_camber_l_before, data.r_camber_r_before)} after={getDiff(data.r_camber_l_after, data.r_camber_r_after)} min={-0.5} max={0.5} iotName={IoT.r_camber_diff} iotValue={getDiff(agm.r_camber_l, agm.r_camber_r)} agmResult={agm.r_camber_diff_result} />
                
                <TableRow label="Схождение: левое" before={data.r_toe_l_before} after={data.r_toe_l_after} min={data.r_toe_l_min} max={data.r_toe_l_max} iotName={IoT.r_toe_l} iotValue={agm.r_toe_l} agmResult={agm.r_toe_l_result} />
                <TableRow label="Схождение: правое" before={data.r_toe_r_before} after={data.r_toe_r_after} min={data.r_toe_l_min} max={data.r_toe_l_max} iotName={IoT.r_toe_r} iotValue={agm.r_toe_r} agmResult={agm.r_toe_r_result} />
                <TableRow label="Схождение: суммарное" before={data.r_toe_total_before} after={data.r_toe_total_after} min={data.r_toe_total_min} max={data.r_toe_total_max} iotName={IoT.r_toe_total} iotValue={agm.r_toe_total} agmResult={agm.r_toe_total_result} />
                
                <TableRow label="Угол движения" before={data.r_thrust_before} after={data.r_thrust_after} min={null} max={null} iotName={IoT.r_thrust} iotValue={agm.r_thrust} agmResult={agm.r_thrust_result} />
              </tbody>
            </table>
          </div>

          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-section, #print-section * { visibility: visible; }
              #print-section { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}