import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList, ReferenceLine
} from 'recharts';

const API_BASE = '';

// ====== БЛЕКЛИСТ VIN ======
const EXCLUDED_VINS = new Set([
  // Старый список
  'EDXDD21B0SC027197','EDXDD21B1SC027192','EDXDD24B0SD145837','EDXDD24B7SD145835',
  'EDXDD24B4SD150488','EDXDD24B8SD150526','EDXDD24B3SD150482','EDXDD24B3SD151342',
  'EDXDD24B6SD151335','EDXGTB221SD831632','EDXGTB226SD831626','EDXGTB227SD831635',
  'EDXGTB228SD831627','EDXDB21B1TG008318','EDXDD24B6TG000821','EDXDD24B7TG000763',
  'EDXDB21B9TG013606','EDXDB21B1TG013606','EDXDD21B6TG017235','EDXDD21B9TG017228',
  'EDXDD24B3TG700098','EDXDD24B5TG700099','EDXDC21B3TG021181','EDXDC24B7TG021180',
  'EDXDDB1BXTG027069','EDXDDB1B9TG027001','EDXDB21B3TG030241','EDXDB21B0TG022016',
  'EDXDC21B5TG026642','EDXDC21B9TG022450','EDXDDB1B4TG027097','EDXDDB1B2TG027096',
  'EDXDDB1B1TG027106','EDXDDB1B0TG027100','EDXDD24B8TG014851','EDXDD24B4TG016242',
  'EDXDD24B7TG014663','EDXDD24B0TG014665','EDXDB21B2TG008568','EDXDB21B0TG013610',
  'EDXDD21B4TG026015','EDXDD21B1TG017238','EDXDD21B0TG026108','EDXDD24B1TG024878',
  'EDXDD24BXTG016245','EDXDD24B5TG016203','EDXDD24B8TG033285','EDXDD24B2TG033928',
  'EDXDD21B1TG035626','EDXDD21BXTG031204','EDXDC24B4TG031584','EDXDD24B4TG016161',
  'EDXDB21B5TG033075','EDXDB21B3TG009213','EDXDB21B6TG023509','EDXDB21BXTG044296',
  'EDXDDB1B2TG025879','EDXDD24B6TG033267','LNNBDDGC2S245927',
  
  // Новый список
  'EDXDD21B0SC059700', 'EDXDD21B6SC053061', 'EDXDD21B4SC059120', 'EDXDD21B6SC061354',
  'EDXDD21B7SC060701', 'EDXDD21B0SC060751', 'LVTDD24B6RDF18537', 'LVTDD24BXRDF18539',
  'LVTDD24B0RDF18582', 'LVTDD24B2RDF18566', 'LVTDD24B6RD537537', 'LVTDD24B8RDF23416',
  'LVTDD24B1RD661697', 'LVTDD24B1RDF10006', 'LVTDD24BXRD580178', 'LVTDD24B9RD580169',
  'LVTDD24B2RD580174', 'LVTDD24B0RD580173', 'EDXDD21B6SC053108', 'EDXDD21B5SC028507',
  'EDXDD21B6SC028516', 'EDXDB21B6SC051722', 'EDXDB21B4SC050942', 'EDXDB21B7SC029521',
  'EDXDB21B0SC051800', 'EDXDD24B7SD057125', 'EDXDB21B8SC078663', 'EDXDB21B2SC078660',
  'EDXDB21B7SC078606', 'EDXDD24B8TG000805', 'EDXDD24B6TG000771', 'EDXDD24B2SD057078',
  'EDXDB21B1SC077953', 'EDXDD21B4SС027185', 'EDXDD21B7SC060746', 'EDXDB21B3SC029046',
  'EDXDB21B9TG000967', 'EDXDB21B0TG000968', 'EDXDB21B9SG700082', 'EDXDB21B3TG000964',
  'EDXGTB22XSD831628', 'EDXGTB229SD831636', 'LVVDC21B6SD369497', 'EDXDB21B4TG000973',
  'EDXDB21BXTG009466', 'EDXDC24B9TG026123', 'EDXDD21B0TG005307', 'EDXDD21B1SC197090',
  'EDXDD21B7SC029311', 'EDXDD21B8SG000001', 'EDXDD21B2SG700001', 'EDXDD21BXSG000002',
  'EDXDB21B4SC029296', 'EDXDD24BXSD145831', 'EDXGTB221SD831629', 'EDXDB21B5TG000979',
  'EDXDB21B1TG002888', 'EDXGTB222SD831624', 'EDXGTB228SD831630', 'EDXDD21B5SC027907',
  
  // Шаттлы
  'EDXXDD21B8SG700004', 'EDXGTB22XSD831631', 'EDXGTB225SD831634', 'EDXDD24B8TG700095',
  'EDXDB21B5SC197934', 'EDXDB21BXSC197931', 'Z94G2813DMR354738', 'Z94PC814BNR000051'
]);

// Один порог на каждый stock-график
const STOCK_THRESHOLD = 5;

const tableToHtml = (rows) => {
  if (!rows.length) return '<p>Нет данных</p>';
  const headers = Object.keys(rows[0]);
  let html = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%">';
  html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  rows.forEach(row => { html += '<tr>' + headers.map(h => `<td>${row[h] != null ? row[h] : ''}</td>`).join('') + '</tr>'; });
  html += '</table>';
  return html;
};

const cardStyle = { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid #F0F0F5' };
const labelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500 };
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB' };
const textareaStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB', minHeight: '44px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.4' };
const buttonStyle = { padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s, transform 0.1s', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' };
const tabStyle = (active) => ({ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: active ? '#2563EB' : '#F3F4F6', color: active ? '#FFFFFF' : '#6B7280', cursor: 'pointer', boxShadow: active ? '0 4px 12px rgba(37,99,235,0.25)' : 'none', transition: 'all 0.2s' });

const cpNames = [
  { value: 'Key_Uloc_Type_TRIMIN', label: 'TRIMIN' },
  { value: 'Key_Uloc_Type_CP7', label: 'CP7' },
  { value: 'Key_Uloc_Type_CP72', label: 'CP72' },
  { value: 'Key_Uloc_Type_CPFINAL', label: 'CPFINAL' },
  { value: 'Key_Uloc_Type_CP8', label: 'CP8' },
];

const filterDropdownStyle = { position: 'fixed', zIndex: 1000, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', maxHeight: 300, overflowY: 'auto', minWidth: 200, padding: 8 };
const filterOptionStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, transition: 'background 0.15s' };
const timeFilterBlockStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const timeFilterLabelStyle = { fontWeight: 700, fontSize: 12, color: '#2563EB', whiteSpace: 'nowrap', minWidth: 40, textAlign: 'center', background: '#EFF6FF', padding: '4px 8px', borderRadius: 6 };

const neighborPointOptions = ['CP5','CP6','TRIMIN','CP7','CP72','TLWA','TLRT','TLADAS','TLTT','CPFINAL','CP8','Inbound','Outbound'];

const loadingAnimation = `@keyframes blink {0%{opacity:.2}20%{opacity:1}100%{opacity:.2}}.loading-dots span{animation:blink 1.4s infinite both}.loading-dots span:nth-child(2){animation-delay:.2s}.loading-dots span:nth-child(3){animation-delay:.4s}`;

const parseVinList = (input) => !input ? [] : input.split(/[\s,;\n\r]+/).map(v => v.trim()).filter(v => v.length > 0);

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const parseDbDate = (str) => {
  if (!str) return 0;
  const isoStr = String(str).includes('T') ? str : str.replace(' ', 'T');
  const t = new Date(isoStr).getTime();
  return isNaN(t) ? 0 : t;
};

// ============ WATERFALL / CANDLE ============
const StockCandleChart = ({ data, color = '#A78BFA' }) => {
  if (!data || data.length < 2) {
    return <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>Нет данных</div>;
  }

  const width = 1000, height = 340;
  const padding = { top: 40, right: 60, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const baseline = data[0].count;
  const deltas = [];
  for (let i = 1; i < data.length; i++) {
    deltas.push({ date: data[i].name, delta: (data[i].count || 0) - (data[i - 1].count || 0), total: data[i].count || 0 });
  }
  const points = [];
  let acc = baseline;
  deltas.forEach(d => { points.push({ start: acc, end: acc + d.delta, delta: d.delta, date: d.date, total: d.total }); acc += d.delta; });

  const allValues = [baseline, 0, ...points.flatMap(p => [p.start, p.end])];
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = Math.max(maxVal - minVal, 1);
  const yScale = (v) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight;
  const slotWidth = chartWidth / Math.max(points.length + 1, 1);
  const barWidth = slotWidth * 0.55;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const startX = padding.left + (slotWidth - barWidth) / 2 + barWidth / 2;
  const startY = yScale(baseline);
  const lastPoint = points[points.length - 1];
  const endX = padding.left + points.length * slotWidth + (slotWidth - barWidth) / 2 + barWidth / 2;
  const endY = lastPoint ? yScale(lastPoint.end) : startY;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {gridLines.map((r, i) => {
        const y = padding.top + chartHeight * r;
        const val = Math.round(maxVal - (maxVal - minVal) * r);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#F3F4F6" strokeWidth="1" />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">{val}</text>
          </g>
        );
      })}

      <line x1={startX - barWidth / 2} y1={startY} x2={startX + barWidth / 2} y2={startY} stroke="#111827" strokeWidth="4" strokeLinecap="round" />
      <text x={startX} y={startY - 8} textAnchor="middle" fontSize="11" fontWeight="800" fill="#111827">{baseline}</text>
      <text x={startX} y={height - padding.bottom + 16} textAnchor="middle" fontSize="9" fill="#9CA3AF">{data[0].name}</text>

      {points.length > 0 && <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={color} strokeWidth="2" opacity={0.65} />}

      {points.slice(0, -1).map((p, i) => {
        const x1 = padding.left + (i + 1) * slotWidth + (slotWidth + barWidth) / 2;
        const x2 = padding.left + (i + 2) * slotWidth + (slotWidth - barWidth) / 2;
        return <line key={`c-${i}`} x1={x1} y1={yScale(p.end)} x2={x2} y2={yScale(p.end)} stroke="#D1D5DB" strokeDasharray="3,3" strokeWidth="1" />;
      })}

      {points.map((p, i) => {
        const x = padding.left + (i + 1) * slotWidth + (slotWidth - barWidth) / 2;
        const y1 = yScale(p.start);
        const y2 = yScale(p.end);
        const top = Math.min(y1, y2);
        const barH = Math.max(Math.abs(y2 - y1), 2);
        const isZero = p.delta === 0;
        const barColor = p.delta > 0 ? '#F87171' : p.delta < 0 ? '#34D399' : '#E5E7EB';

        if (isZero) {
          return (
            <g key={i}>
              <line x1={x} y1={y2} x2={x + barWidth} y2={y2} stroke="#111827" strokeWidth="3" strokeLinecap="round" />
              <text x={x + barWidth / 2} y={y2 - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#374151">{p.total}</text>
              <text x={x + barWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize="9" fill="#9CA3AF">{p.date}</text>
            </g>
          );
        }

        return (
          <g key={i}>
            <rect x={x} y={top} width={barWidth} height={barH} fill={barColor} rx={3} />
            <text x={x + barWidth / 2} y={top - 16} textAnchor="middle" fontSize="10" fontWeight="500" fill="#6B7280">{p.total}</text>
            <text x={x + barWidth / 2} y={p.delta > 0 ? top + barH + 14 : top - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill={p.delta > 0 ? '#DC2626' : '#059669'}>
              {p.delta > 0 ? `+${p.delta}` : p.delta}
            </text>
            <text x={x + barWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize="9" fill="#9CA3AF">{p.date}</text>
          </g>
        );
      })}
    </svg>
  );
};

export default function SgpAuditPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('checkpoints');

  // Time Points
  const [allTimePointsData, setAllTimePointsData] = useState([]);
  const [timePointsData, setTimePointsData] = useState([]);
  const [timePointsLoading, setTimePointsLoading] = useState(false);
  const [timePointsError, setTimePointsError] = useState(null);
  const [timePointsPage, setTimePointsPage] = useState(0);
  const timePointsPageSize = 50;
  const [tpFilters, setTpFilters] = useState({});
  const [tpVinSearch, setTpVinSearch] = useState('');
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, left: 0 });

  // Checkpoints
  const [selectedCp, setSelectedCp] = useState('Key_Uloc_Type_TRIMIN');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  const [cpModel, setCpModel] = useState('ALL');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState(null);
  const [cpData, setCpData] = useState([]);
  const [cpLocations, setCpLocations] = useState({});
  const [cpPage, setCpPage] = useState(0);
  const rowsPerPage = 100;
  const [vinSearch, setVinSearch] = useState('');
  const [isVinMode, setIsVinMode] = useState(false);

  // Neighbors
  const [neighborVin, setNeighborVin] = useState('');
  const [neighborCheckpoint, setNeighborCheckpoint] = useState('TRIMIN');
  const [neighborLimitBefore, setNeighborLimitBefore] = useState(100);
  const [neighborLimitAfter, setNeighborLimitAfter] = useState(100);
  const [neighborLoading, setNeighborLoading] = useState(false);
  const [neighborError, setNeighborError] = useState(null);
  const [neighborData, setNeighborData] = useState([]);
  const [neighborTargetTime, setNeighborTargetTime] = useState(null);
  const [neighborLocations, setNeighborLocations] = useState({});
  const [neighborModelComplect, setNeighborModelComplect] = useState({});
  const [neighborFilters, setNeighborFilters] = useState({});
  const [activeNeighborFilterColumn, setActiveNeighborFilterColumn] = useState(null);
  const [neighborFilterDropdownPos, setNeighborFilterDropdownPos] = useState({ top: 0, left: 0 });

  // Buffer
  const [bufferData, setBufferData] = useState([]);
  const [bufferLoading, setBufferLoading] = useState(false);
  const [bufferError, setBufferError] = useState(null);
  const [bufferChartPeriod, setBufferChartPeriod] = useState('all');
  const [bufferChartModel, setBufferChartModel] = useState('ALL');
  const [bufferCriterionFilter, setBufferCriterionFilter] = useState('ALL');
  const [bufferBlockFilter, setBufferBlockFilter] = useState('ALL');
  const [bufferModelFilter, setBufferModelFilter] = useState('ALL');
  const [bufferSort, setBufferSort] = useState({ column: 'cp8_time', direction: 'desc' });
  const [bufferTimeFilters, setBufferTimeFilters] = useState({});
  const [bufferPage, setBufferPage] = useState(0);
  const bufferPageSize = 50;
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReasonsData, setBlockReasonsData] = useState({ active: [], cleared: [] });
  const [blockReasonsLoading, setBlockReasonsLoading] = useState(false);
  const [selectedBlockVin, setSelectedBlockVin] = useState('');

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportReasons, setExportReasons] = useState([]);
  const [exportSearch, setExportSearch] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [exportReasonLoading, setExportReasonLoading] = useState(false);

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

  const bufferAvailableModels = useMemo(() => {
    const models = [...new Set(bufferData.map(d => d.model))].filter(m => m && m !== '—');
    return ['ALL', ...models.sort()];
  }, [bufferData]);

  useEffect(() => {
    if (showBlockModal || showExportModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [showBlockModal, showExportModal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeFilterColumn && !event.target.closest('.filter-dropdown') && !event.target.closest('th')) setActiveFilterColumn(null);
      if (activeNeighborFilterColumn && !event.target.closest('.filter-dropdown') && !event.target.closest('th')) setActiveNeighborFilterColumn(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeFilterColumn, activeNeighborFilterColumn]);

  useEffect(() => {
    const handleScroll = (event) => {
      if (event.target.closest && event.target.closest('.filter-dropdown')) return;
      setActiveFilterColumn(null);
      setActiveNeighborFilterColumn(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setShowExportModal(false);
        setSelectedReason('');
        setCustomReason('');
        setExportSearch('');
        setShowBlockModal(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => { setBufferPage(0); }, [bufferCriterionFilter, bufferBlockFilter, bufferModelFilter, bufferTimeFilters]);

  const formatDateTime = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
  };

  const formatShortDateTime = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${min}`;
  };

  const formatTimeDiff = (time1, time2) => {
    if (!time1 || !time2) return '—';
    const diffMs = parseDbDate(time1) - parseDbDate(time2);
    if (diffMs < 0) return '0 ч';
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    if (h > 24) { const d = Math.floor(h / 24); return `${d} д ${h % 24} ч`; }
    return `${h} ч ${m} мин`;
  };

  const loadTimePoints = async () => {
    setTimePointsLoading(true);
    setTimePointsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/time-points`);
      if (!res.ok) throw new Error(`Ошибка загрузки данных (${res.status})`);
      const json = await res.json();
      const filtered = Array.isArray(json) ? json.filter(d => !EXCLUDED_VINS.has(d.vin)) : [];
      setAllTimePointsData(filtered);
      setTimePointsData(filtered);
      setTimePointsPage(0);
    } catch (err) {
      setTimePointsError(err.message);
      setAllTimePointsData([]);
      setTimePointsData([]);
    } finally { setTimePointsLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'timepoints') loadTimePoints();
    if (activeTab === 'buffer') {
      setBufferLoading(true); setBufferError(null);
      fetch(`${API_BASE}/api/buffer-status-data`)
        .then(res => res.json())
        .then(json => { setBufferData(Array.isArray(json) ? json.filter(d => !EXCLUDED_VINS.has(d.vin)) : []); setBufferLoading(false); })
        .catch(err => { setBufferError(err.message); setBufferLoading(false); });
    }
  }, [activeTab]);

  const getUniqueValues = (column) => [...new Set(allTimePointsData.map(d => d[column]).filter(v => v !== null && v !== undefined && v !== ''))].sort();

  const handleFilterHeaderClick = (column, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setFilterDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setActiveFilterColumn(activeFilterColumn === column ? null : column);
  };

  const handleFilterToggle = (column, value) => {
    setTpFilters(prev => {
      const currentValues = prev[column] || [];
      const newValues = currentValues.includes(value) ? currentValues.filter(v => v !== value) : [...currentValues, value];
      const newFilters = { ...prev };
      if (newValues.length > 0) newFilters[column] = newValues; else delete newFilters[column];
      return newFilters;
    });
  };

  const handleFilterClear = (column) => {
    setTpFilters(prev => { const p = { ...prev }; delete p[column]; return p; });
    setActiveFilterColumn(null);
  };

  const filteredTimePointsData = useMemo(() => {
    let result = allTimePointsData;
    if (tpVinSearch.trim()) {
      const tokens = parseVinList(tpVinSearch);
      if (tokens.length > 0) {
        result = result.filter(d => {
          if (!d.vin) return false;
          const upperVin = d.vin.toUpperCase();
          return tokens.some(token => {
            const u = token.toUpperCase();
            return u.length === 6 ? upperVin.endsWith(u) : upperVin.includes(u);
          });
        });
      }
    }
    if (Array.isArray(tpFilters.vin) && tpFilters.vin.length > 0) result = result.filter(d => tpFilters.vin.includes(d.vin));
    ['material_code','sequence_number','batch_num','kd_material_no','model','material_desc','storage_location','colour','location'].forEach(field => {
      const s = tpFilters[field];
      if (s && s.length > 0) result = result.filter(d => s.includes(d[field]));
    });
    const timeFields = [
      { key: 'CP5', from: 'cp5From', to: 'cp5To' },{ key: 'CP6', from: 'cp6From', to: 'cp6To' },
      { key: 'TRIMIN', from: 'trimInFrom', to: 'trimInTo' },{ key: 'CP7', from: 'cp7From', to: 'cp7To' },
      { key: 'CP72', from: 'cp72From', to: 'cp72To' },{ key: 'TLWA', from: 'tlwaFrom', to: 'tlwaTo' },
      { key: 'TLRT', from: 'tlrtFrom', to: 'tlrtTo' },{ key: 'TLADAS', from: 'tladasFrom', to: 'tladasTo' },
      { key: 'TLTT', from: 'tlttFrom', to: 'tlttTo' },{ key: 'CPFINAL', from: 'cpFinalFrom', to: 'cpFinalTo' },
      { key: 'CP8', from: 'cp8From', to: 'cp8To' },{ key: 'in_storage_time', from: 'inboundFrom', to: 'inboundTo' },
      { key: 'out_storage_time', from: 'outboundFrom', to: 'outboundTo' },
    ];
    timeFields.forEach(({ key, from, to }) => {
      if (tpFilters[from]) result = result.filter(d => d[key] && new Date(d[key]) >= new Date(tpFilters[from]));
      if (tpFilters[to]) result = result.filter(d => d[key] && new Date(d[key]) <= new Date(tpFilters[to]));
    });
    return result;
  }, [allTimePointsData, tpFilters, tpVinSearch]);

  useEffect(() => { setTimePointsData(filteredTimePointsData); setTimePointsPage(0); }, [filteredTimePointsData]);

  const handleTpClear = () => { setTpFilters({}); setTpVinSearch(''); setTimePointsData(allTimePointsData); setTimePointsPage(0); };

  // ===== BUFFER table =====
  const filteredBufferData = useMemo(() => {
    let result = bufferData;
    if (bufferCriterionFilter !== 'ALL') result = result.filter(d => d.criterion === bufferCriterionFilter);
    if (bufferBlockFilter === 'Блок') result = result.filter(d => d.block_status.startsWith('Блок'));
    else if (bufferBlockFilter === 'Не блок') result = result.filter(d => d.block_status === 'Не блок');
    if (bufferModelFilter !== 'ALL') result = result.filter(d => d.model === bufferModelFilter);

    // ADAS удалён
    const timeFields = [
      { key: 'cp72_time', from: 'cp72From', to: 'cp72To' },
      { key: 'tltt_time', from: 'tlttFrom', to: 'tlttTo' },
      { key: 'cp8_time', from: 'cp8From', to: 'cp8To' },
      { key: 'in_storage_time', from: 'inboundFrom', to: 'inboundTo' },
    ];
    timeFields.forEach(({ key, from, to }) => {
      if (bufferTimeFilters[from]) { const t = new Date(bufferTimeFilters[from]).getTime(); result = result.filter(d => d[key] && parseDbDate(d[key]) >= t); }
      if (bufferTimeFilters[to]) { const t = new Date(bufferTimeFilters[to]).getTime(); result = result.filter(d => d[key] && parseDbDate(d[key]) <= t); }
    });

    result.sort((a, b) => {
      let valA, valB;
      const dir = bufferSort.direction === 'asc' ? 1 : -1;
      if (bufferSort.column === 'diff_cp8_sgp') {
        valA = parseDbDate(a.in_storage_time) - parseDbDate(a.cp8_time);
        valB = parseDbDate(b.in_storage_time) - parseDbDate(b.cp8_time);
      } else if (bufferSort.column === 'diff_cp8_cp72') {
        valA = parseDbDate(a.cp8_time) - parseDbDate(a.cp72_time);
        valB = parseDbDate(b.cp8_time) - parseDbDate(b.cp72_time);
      } else if (bufferSort.column.endsWith('_time')) {
        valA = parseDbDate(a[bufferSort.column]); valB = parseDbDate(b[bufferSort.column]);
      } else {
        valA = a[bufferSort.column] || ''; valB = b[bufferSort.column] || '';
      }
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
    return result;
  }, [bufferData, bufferCriterionFilter, bufferBlockFilter, bufferModelFilter, bufferSort, bufferTimeFilters]);

  // ===== BUFFER charts =====
  const bufferChartsData = useMemo(() => {
    let chartCars = bufferData;
    if (bufferChartModel !== 'ALL') chartCars = chartCars.filter(d => d.model === bufferChartModel);

    const timeFields = [
      { key: 'cp72_time', from: 'cp72From', to: 'cp72To' },
      { key: 'tltt_time', from: 'tlttFrom', to: 'tlttTo' },
      { key: 'cp8_time', from: 'cp8From', to: 'cp8To' },
      { key: 'in_storage_time', from: 'inboundFrom', to: 'inboundTo' },
    ];
    timeFields.forEach(({ key, from, to }) => {
      if (bufferTimeFilters[from]) { const t = new Date(bufferTimeFilters[from]).getTime(); chartCars = chartCars.filter(d => d[key] && parseDbDate(d[key]) >= t); }
      if (bufferTimeFilters[to]) { const t = new Date(bufferTimeFilters[to]).getTime(); chartCars = chartCars.filter(d => d[key] && parseDbDate(d[key]) <= t); }
    });

    // ПОТОК
    const flowCars = chartCars.filter(d => d.criterion === 'Не принято' && d.cp8_time).sort((a, b) => parseDbDate(a.cp8_time) - parseDbDate(b.cp8_time));
    const fMonthsMap = new Map(), fWeeksMap = new Map(), fDaysMap = new Map();
    flowCars.forEach(item => {
      const d = new Date(item.cp8_time);
      fMonthsMap.set(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, (fMonthsMap.get(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) || 0) + 1);
      const tmp = new Date(d); const dayNum = tmp.getDay() || 7; tmp.setDate(tmp.getDate() + 4 - dayNum);
      const yearStart = new Date(tmp.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
      fWeeksMap.set(`W${String(weekNo).padStart(2,'0')}`, (fWeeksMap.get(`W${String(weekNo).padStart(2,'0')}`) || 0) + 1);
      const dKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      fDaysMap.set(dKey, (fDaysMap.get(dKey) || 0) + 1);
    });
    const flowMonths = Array.from(fMonthsMap.entries()).map(([name, count]) => ({ name, count })).slice(-3);
    const flowWeeks = Array.from(fWeeksMap.entries()).map(([name, count]) => ({ name, count })).slice(-4);
    const flowDays = Array.from(fDaysMap.entries()).map(([name, count]) => ({ name: formatShortDate(name), count })).slice(-14);

    // ОСТАТОК
    const stockCars = chartCars.filter(d => d.cp8_time);
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
    const calculateStockAt = (endTs) => {
      let count = 0;
      stockCars.forEach(car => {
        const cp8Ms = parseDbDate(car.cp8_time);
        const storageMs = car.in_storage_time ? parseDbDate(car.in_storage_time) : Infinity;
        if (cp8Ms <= endTs && storageMs > endTs) count++;
      });
      return count;
    };

    const stockDays = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59);
      stockDays.push({ name: formatShortDate(d), count: calculateStockAt(d.getTime()) });
    }

    const stockWeeks = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() || 7) + 1 - i * 7, 23, 59, 59);
      const sunday = new Date(d); sunday.setDate(d.getDate() + 6);
      const target = sunday.getTime() > now.getTime() ? endOfToday : sunday.getTime();
      const weekNum = Math.ceil((((target - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
      stockWeeks.push({ name: `W${String(weekNum).padStart(2,'0')}`, count: calculateStockAt(target) });
    }

    const stockMonths = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const target = d.getTime() > now.getTime() ? endOfToday : d.getTime();
      // Формат YYYY-MM вместо MMM YYYY
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      stockMonths.push({ name: `${yyyy}-${mm}`, count: calculateStockAt(target) });
    }

    return { flowMonths, flowWeeks, flowDays, stockMonths, stockWeeks, stockDays };
  }, [bufferData, bufferChartModel, bufferTimeFilters]);

  // ===== CANDLE CHART (независимый от фильтров) =====
  const candleChartData = useMemo(() => {
    const stockCars = bufferData.filter(d => d.cp8_time);
    const now = new Date();
    const calculateStockAt = (endTs) => {
      let count = 0;
      stockCars.forEach(car => {
        const cp8Ms = parseDbDate(car.cp8_time);
        const storageMs = car.in_storage_time ? parseDbDate(car.in_storage_time) : Infinity;
        if (cp8Ms <= endTs && storageMs > endTs) count++;
      });
      return count;
    };

    const stockDaysAll = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59);
      stockDaysAll.push({ name: formatShortDate(d), count: calculateStockAt(d.getTime()) });
    }
    return stockDaysAll;
  }, [bufferData]);

  const handleBufferSort = (column) => setBufferSort(prev => ({ column, direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const clearBufferFilters = () => {
    setBufferCriterionFilter('ALL'); setBufferBlockFilter('ALL'); setBufferModelFilter('ALL');
    setBufferTimeFilters({}); setBufferChartModel('ALL');
  };

  const exportBufferToExcel = () => {
    if (!filteredBufferData.length) return;
    const exportData = filteredBufferData.map(item => ({
      'VIN': item.vin,
      'Модель': item.model,
      'Расположение на складе': item.storage_location || '-', // <-- ДОБАВЛЕНО
      'CP72': formatDateTime(item.cp72_time),
      'TLTT': formatDateTime(item.tltt_time),
      'CP8': formatDateTime(item.cp8_time),
      'Время CP8 → CP72': formatTimeDiff(item.cp8_time, item.cp72_time),
      'Постановка на СГП': formatDateTime(item.in_storage_time),
      'Критерий потеряшки': item.criterion,
      'Время CP8 → СГП': formatTimeDiff(item.in_storage_time, item.cp8_time),
      'Статус блокировки': item.block_status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buffer Status');
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `Buffer_Status_${dateStr}.xlsx`);
  };

  const openBlockReasons = async (vin) => {
    setSelectedBlockVin(vin); setShowBlockModal(true); setBlockReasonsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/buffer-status-block-reasons?vin=${vin}`);
      if (res.ok) setBlockReasonsData(await res.json());
      else setBlockReasonsData({ active: [], cleared: [] });
    } catch { setBlockReasonsData({ active: [], cleared: [] }); }
    finally { setBlockReasonsLoading(false); }
  };

  const renderBufferTrendChart = (title, data, color, threshold = null) => (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12, textAlign: 'center' }}>{title}</h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 20, right: 40, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={28} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            {threshold !== null && (
              <ReferenceLine
                y={threshold}
                stroke="#DC2626"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: threshold, position: 'right', fontSize: 11, fill: '#DC2626', fontWeight: 700 }}
              />
            )}
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} barSize={20}>
              <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#374151' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>Нет данных</div>
      )}
    </div>
  );

  const fetchCurrentLocations = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A' && !EXCLUDED_VINS.has(v)))];
      if (!uniqueVins.length) return {};
      const batches = []; for (let i = 0; i < uniqueVins.length; i += 200) batches.push(uniqueVins.slice(i, i + 200));
      const all = await Promise.all(batches.map(async b => {
        const r = await fetch(`${API_BASE}/api/vehicles-current-location?vins=${b.join(',')}`);
        if (!r.ok) throw new Error('loc');
        return r.json();
      }));
      const map = {}; all.forEach(arr => arr.forEach(x => { map[x.vin] = x; })); return map;
    } catch { return {}; }
  };
  const fetchStorageLocations = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A' && !EXCLUDED_VINS.has(v)))];
      if (!uniqueVins.length) return {};
      const batches = []; for (let i = 0; i < uniqueVins.length; i += 200) batches.push(uniqueVins.slice(i, i + 200));
      const all = await Promise.all(batches.map(async b => {
        const r = await fetch(`${API_BASE}/api/sgp-audit-storage?vins=${b.join(',')}`);
        if (!r.ok) throw new Error('st');
        return r.json();
      }));
      const map = {}; all.forEach(rows => rows.forEach(row => { if (row.VIN) map[row.VIN] = { Модель: row['Модель'] || '-', Склад: row['Склад'] || '-', Локация: row['Локация'] || '-', Ячейка: row['Ячейка'] || '-' }; })); return map;
    } catch { return {}; }
  };
  const fetchModels = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A' && !EXCLUDED_VINS.has(v)))];
      if (!uniqueVins.length) return {};
      const batches = []; for (let i = 0; i < uniqueVins.length; i += 200) batches.push(uniqueVins.slice(i, i + 200));
      const all = await Promise.all(batches.map(async b => {
        const r = await fetch(`${API_BASE}/api/vehicles-models?vins=${b.join(',')}`);
        if (!r.ok) throw new Error('m');
        return r.json();
      }));
      const map = {}; all.forEach(mm => Object.keys(mm).forEach(v => { map[v] = mm[v]; })); return map;
    } catch { return {}; }
  };
  const fetchModelComplect = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A' && !EXCLUDED_VINS.has(v)))];
      if (!uniqueVins.length) return {};
      const batches = []; for (let i = 0; i < uniqueVins.length; i += 200) batches.push(uniqueVins.slice(i, i + 200));
      const all = await Promise.all(batches.map(async b => {
        const r = await fetch(`${API_BASE}/api/vehicles-model-complect?vins=${b.join(',')}`);
        if (!r.ok) throw new Error('mc');
        return r.json();
      }));
      const map = {}; all.forEach(mm => Object.keys(mm).forEach(v => { map[v] = mm[v]; })); return map;
    } catch { return {}; }
  };

  const loadNeighbors = async () => {
    if (!neighborVin.trim()) return;
    setNeighborLoading(true); setNeighborError(null); setNeighborData([]); setNeighborTargetTime(null);
    setNeighborLocations({}); setNeighborModelComplect({}); setNeighborFilters({}); setActiveNeighborFilterColumn(null);
    try {
      const params = new URLSearchParams({ checkpoint: neighborCheckpoint, vin: neighborVin.trim(), limitBefore: neighborLimitBefore, limitAfter: neighborLimitAfter });
      const res = await fetch(`${API_BASE}/api/time-point-neighbors?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки соседей');
      const json = await res.json();
      const raw = (json.data || []).filter(item => !EXCLUDED_VINS.has(item.vin));
      setNeighborData(raw);
      setNeighborTargetTime(json.targetTime || null);
      if (raw.length > 0) {
        const vins = raw.map(i => i.vin);
        setNeighborLocations(await fetchCurrentLocations(vins));
        setNeighborModelComplect(await fetchModelComplect(vins));
      }
    } catch (err) { setNeighborError(err.message); setNeighborData([]); }
    finally { setNeighborLoading(false); }
  };

  const enrichedNeighborData = useMemo(() => neighborData.map(item => {
    const loc = neighborLocations[item.vin];
    const details = neighborModelComplect[item.vin] || {};
    let currentZone = '-';
    if (loc) {
      if (loc.isInStorage) currentZone = loc.storageString;
      else if (loc.isSold) currentZone = 'Продан';
      else currentZone = loc.checkpoint || '-';
    }
    return { ...item, current_zone: currentZone, model: details.model || '-', material_desc: details.material_desc || '-' };
  }), [neighborData, neighborLocations, neighborModelComplect]);

  const getNeighborUniqueValues = (column) => [...new Set(enrichedNeighborData.map(d => d[column]).filter(v => v !== null && v !== undefined && v !== ''))].sort();

  const handleNeighborFilterHeaderClick = (column, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setNeighborFilterDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setActiveNeighborFilterColumn(activeNeighborFilterColumn === column ? null : column);
  };
  const handleNeighborFilterToggle = (column, value) => {
    setNeighborFilters(prev => {
      const cur = prev[column] || [];
      const nv = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      const f = { ...prev };
      if (nv.length > 0) f[column] = nv; else delete f[column];
      return f;
    });
  };
  const handleNeighborFilterClear = (column) => { setNeighborFilters(prev => { const p = { ...prev }; delete p[column]; return p; }); setActiveNeighborFilterColumn(null); };

  const filteredNeighborData = useMemo(() => {
    let r = enrichedNeighborData;
    if (Object.keys(neighborFilters).length === 0) return r;
    return r.filter(row => {
      for (const [c, vals] of Object.entries(neighborFilters)) if (vals.length > 0 && !vals.includes(row[c])) return false;
      return true;
    });
  }, [enrichedNeighborData, neighborFilters]);

  const exportNeighborsToExcel = () => {
    if (!filteredNeighborData.length) return;
    const exportData = filteredNeighborData.map(i => ({
      'VIN': i.vin,
      [`Время ${neighborCheckpoint}`]: formatDateTime(i.point_time || i.trim_in || i.creation_time || i.in_storage_time || i.out_storage_time),
      'Текущее расположение': i.current_zone,
      'Модель': i.model,
      'Комплектация': i.material_desc,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Соседи');
    const n = new Date(); const ds = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `Соседи_${neighborCheckpoint}_${ds}.xlsx`);
  };

  const exportNeighborsToHolds = () => {
    if (!filteredNeighborData.length) return;
    const after = [], before = [];
    filteredNeighborData.forEach(i => {
      const loc = i.current_zone;
      const row = { 'VIN': i.vin, 'Текущее расположение': loc, 'Модель': i.model, 'Комплектация': i.material_desc };
      if (loc === 'CP8' || loc === 'Продан' || loc.includes('-')) after.push(row); else before.push(row);
    });
    const n = new Date(); const ds = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    if (after.length) { const ws = XLSX.utils.json_to_sheet(after); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'После CP8'); XLSX.writeFile(wb, `Холды_После_CP8_${ds}.xlsx`); }
    if (before.length) { const ws = XLSX.utils.json_to_sheet(before); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'До CP8'); XLSX.writeFile(wb, `Холды_До_CP8_${ds}.xlsx`); }
  };

  const openExportModal = async () => {
    setShowExportModal(true); setExportReasonLoading(true);
    try { const r = await fetch(`${API_BASE}/api/sgp-management-reasons`); if (r.ok) setExportReasons(await r.json()); }
    catch (e) { console.error(e); }
    finally { setExportReasonLoading(false); }
  };
  const closeExportModal = () => { setShowExportModal(false); setSelectedReason(''); setCustomReason(''); setExportSearch(''); };
  const handleSelectReason = (r) => { setSelectedReason(r); setCustomReason(''); };
  const handleCustomReasonChange = (e) => { const v = e.target.value; setCustomReason(v); if (v) setSelectedReason(''); };
  const filteredReasons = useMemo(() => !exportSearch.trim() ? exportReasons : exportReasons.filter(r => r.toLowerCase().includes(exportSearch.toLowerCase())), [exportReasons, exportSearch]);

  const handleExportToHoldsWithReason = () => {
    const finalReason = selectedReason || customReason;
    if (!finalReason) return;
    const exportData = timePointsData.map(v => ({ 'VIN': v.vin, 'Причина': finalReason, 'FE130': 'FE130' }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Холды');
    const n = new Date(); const ds = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `Холды_${ds}.xlsx`);
    closeExportModal();
  };

  const timePointColumns = [
    { key: 'vin', label: 'VIN', filterable: true },{ key: 'material_code', label: 'Material Code', filterable: true },
    { key: 'sequence_number', label: 'Sequence', filterable: true },{ key: 'batch_num', label: 'Batch Number', filterable: true },
    { key: 'kd_material_no', label: 'KD', filterable: true },{ key: 'model', label: 'Model', filterable: true },
    { key: 'material_desc', label: 'Комплектация', filterable: true },{ key: 'storage_location', label: 'Складская локация', filterable: true },
    { key: 'colour', label: 'Цвет', filterable: true },{ key: 'location', label: 'Расположение', filterable: true },
    { key: 'CP5', label: 'CP5', isTime: true },{ key: 'CP6', label: 'CP6', isTime: true },
    { key: 'TRIMIN', label: 'TRIMIN', isTime: true },{ key: 'CP7', label: 'CP7', isTime: true },
    { key: 'CP72', label: 'CP72', isTime: true },{ key: 'TLWA', label: 'TLWA', isTime: true },
    { key: 'TLRT', label: 'TLRT', isTime: true },{ key: 'TLADAS', label: 'TLADAS', isTime: true },
    { key: 'TLTT', label: 'TLTT', isTime: true },{ key: 'CPFINAL', label: 'CPFINAL', isTime: true },
    { key: 'CP8', label: 'CP8', isTime: true },{ key: 'in_storage_time', label: 'Inbound', isTime: true },
    { key: 'out_storage_time', label: 'Outbound', isTime: true },
  ];

  const leftTimeFilters = [
    { label: 'CP5', fromKey: 'cp5From', toKey: 'cp5To' },{ label: 'CP6', fromKey: 'cp6From', toKey: 'cp6To' },
    { label: 'TRIMIN', fromKey: 'trimInFrom', toKey: 'trimInTo' },{ label: 'CP7', fromKey: 'cp7From', toKey: 'cp7To' },
    { label: 'CP72', fromKey: 'cp72From', toKey: 'cp72To' },{ label: 'TLWA', fromKey: 'tlwaFrom', toKey: 'tlwaTo' },
    { label: 'TLRT', fromKey: 'tlrtFrom', toKey: 'tlrtTo' },
  ];
  const rightTimeFilters = [
    { label: 'TLADAS', fromKey: 'tladasFrom', toKey: 'tladasTo' },{ label: 'TLTT', fromKey: 'tlttFrom', toKey: 'tlttTo' },
    { label: 'CPFINAL', fromKey: 'cpFinalFrom', toKey: 'cpFinalTo' },{ label: 'CP8', fromKey: 'cp8From', toKey: 'cp8To' },
    { label: 'Inbound', fromKey: 'inboundFrom', toKey: 'inboundTo' },{ label: 'Outbound', fromKey: 'outboundFrom', toKey: 'outboundTo' },
  ];
  // ADAS убран
  const leftBufferTimeFilters = [
    { label: 'CP72', fromKey: 'cp72From', toKey: 'cp72To' },
    { label: 'TLTT', fromKey: 'tlttFrom', toKey: 'tlttTo' },
  ];
  const rightBufferTimeFilters = [
    { label: 'CP8', fromKey: 'cp8From', toKey: 'cp8To' },
    { label: 'Inbound', fromKey: 'inboundFrom', toKey: 'inboundTo' },
  ];

  const renderTimeFilter = ({ label, fromKey, toKey }, filtersState, setFiltersState) => (
    <div style={timeFilterBlockStyle}>
      <span style={timeFilterLabelStyle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>От</span>
        <input type="datetime-local" value={filtersState[fromKey] || ''} onChange={(e) => setFiltersState(prev => ({ ...prev, [fromKey]: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '4px 6px', width: '100%' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>По</span>
        <input type="datetime-local" value={filtersState[toKey] || ''} onChange={(e) => setFiltersState(prev => ({ ...prev, [toKey]: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: '4px 6px', width: '100%' }} />
      </div>
    </div>
  );

  const handleVinSearch = () => {
    const tokens = parseVinList(vinSearch).filter(v => !EXCLUDED_VINS.has(v));
    if (tokens.length === 0) { setIsVinMode(false); return; }
    setIsVinMode(true); setStartDate(''); setEndDate(''); setCpModel('ALL');
    loadStorageByVin(tokens);
  };
  const handleVinReset = () => { setVinSearch(''); setIsVinMode(false); setCpData([]); setCpLocations({}); };
  const isFilterDisabled = isVinMode;

  const loadStorageByVin = async (tokens) => {
    setCpLoading(true); setCpError(null);
    try {
      const storageMap = await fetchStorageLocations(tokens);
      const modelsMap = await fetchModels(tokens);
      const locMap = await fetchCurrentLocations(tokens);
      const rowData = tokens.map(token => {
        let fullVin = token;
        const findFullVin = (map) => Object.keys(map).find(k => k === token || (token.length === 6 && k.endsWith(token)));
        const locKey = findFullVin(locMap), storageKey = findFullVin(storageMap), modelKey = findFullVin(modelsMap);
        if (locKey) fullVin = locKey; else if (storageKey) fullVin = storageKey; else if (modelKey) fullVin = modelKey;
        const s = storageKey ? storageMap[storageKey] : {};
        const mFrom = modelKey ? modelsMap[modelKey] : null;
        const mFromS = s.Модель && s.Модель !== '-' ? s.Модель : '-';
        let disp = '-';
        const loc = locKey ? locMap[locKey] : null;
        if (loc) { if (loc.isInStorage) disp = 'На складе'; else if (loc.isSold) disp = 'Продан'; else disp = loc.checkpoint || '-'; }
        return { VIN: fullVin, Модель: mFrom || mFromS, Склад: s.Склад || '-', Локация: s.Локация || '-', Ячейка: s.Ячейка || '-', 'Результат проверки': '', 'Текущее расположение': disp };
      });
      const cleaned = rowData.filter(r => !EXCLUDED_VINS.has(r.VIN)).map(row => {
        const nr = { ...row };
        Object.keys(nr).forEach(k => { if (nr[k] === 'N/A') nr[k] = '-'; });
        return nr;
      });
      setCpData(cleaned); setCpLocations(locMap);
    } catch (err) { setCpError(err.message); }
    finally { setCpLoading(false); }
  };

  const runAudit = async () => {
    if (isVinMode) return;
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) return;
    setCpLoading(true); setCpError(null); setCpPage(0);
    const sd = `${startDate} ${startTime || '00:00'}:00`;
    const ed = `${endDate} ${endTime || '23:59'}:59`;
    try {
      const p = new URLSearchParams({ checkpoint: selectedCp, dateFrom: sd, dateTo: ed });
      if (cpModel !== 'ALL') p.append('model', cpModel);
      const r = await fetch(`${API_BASE}/api/sgp-audit-vins?${p.toString()}`);
      if (!r.ok) throw new Error(`Ошибка VIN: ${r.status}`);
      let vins = await r.json();
      vins = vins.filter(v => !EXCLUDED_VINS.has(v));
      if (!vins.length) { setCpData([]); setCpLocations({}); return; }
      const storageMap = await fetchStorageLocations(vins);
      const modelsMap = await fetchModels(vins);
      const tableData = vins.map(vin => {
        const s = storageMap[vin] || {};
        const mFrom = modelsMap[vin];
        const mFromS = s.Модель && s.Модель !== '-' ? s.Модель : '-';
        return { VIN: vin, Модель: mFrom || mFromS, Склад: s.Склад || '-', Локация: s.Локация || '-', Ячейка: s.Ячейка || '-', 'Результат проверки': '' };
      });
      setCpData(tableData.map(row => { const nr = { ...row }; Object.keys(nr).forEach(k => { if (nr[k] === 'N/A') nr[k] = '-'; }); return nr; }));
      const validVins = vins.filter(v => v && v !== 'N/A' && !EXCLUDED_VINS.has(v));
      setCpLocations(await fetchCurrentLocations(validVins));
    } catch (err) { setCpError(err.message); }
    finally { setCpLoading(false); }
  };

  const exportExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
  };

  const exportTimePointsToExcel = () => {
    if (!filteredTimePointsData.length) return;
    const headers = timePointColumns.flatMap(col => col.isTime ? [`${col.label} Дата`, `${col.label} Время`] : [col.label]);
    const aoa = [headers];
    filteredTimePointsData.forEach(row => {
      const line = [];
      timePointColumns.forEach(col => {
        if (col.isTime) {
          const raw = row[col.key];
          const dt = raw ? new Date(raw) : null;
          const valid = dt && !isNaN(dt.getTime());
          line.push(valid ? { v: dt, t: 'd', z: 'dd.mm.yyyy' } : { v: '', t: 's' });
          line.push(valid ? { v: dt, t: 'd', z: 'hh:mm' } : { v: '', t: 's' });
        } else line.push(row[col.key] != null ? row[col.key] : '');
      });
      aoa.push(line);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(12, String(h).length + 2) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Time Points');
    const n = new Date(); const ds = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `time_points_${ds}.xlsx`);
  };

  const exportWord = (data, filename) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${tableToHtml(data)}</body></html>`;
    saveAs(new Blob([html], { type: 'application/msword' }), `${filename}.doc`);
  };

  const renderCpSelector = (selected, setSelected) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
      {cpNames.map((cp, idx) => {
        const isActive = selected === cp.value;
        return (
          <React.Fragment key={cp.value}>
            <button onClick={() => setSelected(cp.value)} disabled={isFilterDisabled} style={{ flex: '1 1 0', maxWidth: 140, padding: '12px 0', borderRadius: 12, border: isActive ? '2px solid #2563EB' : '1px solid #E5E7EB', background: isActive ? '#2563EB' : '#FFFFFF', color: isActive ? '#FFFFFF' : '#374151', fontWeight: 600, fontSize: 14, cursor: isFilterDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: isActive ? '0 4px 10px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.04)', opacity: isFilterDisabled ? 0.6 : 1 }}>{cp.label}</button>
            {idx < cpNames.length - 1 && <div style={{ height: 2, width: 20, backgroundColor: '#CBD5E1', margin: '0 4px', borderRadius: 1 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );

  const thStyle = { padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', whiteSpace: 'nowrap', position: 'sticky', top: 0 };
  const tdStyle = { padding: '10px 14px', borderBottom: '1px solid #F0F0F5', color: '#1F2937', whiteSpace: 'nowrap' };

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ color: '#1F2937', fontSize: 28, fontWeight: 700, marginBottom: 35, letterSpacing: '-0.5px' }}>Управление холдами</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
        <button onClick={() => setActiveTab('checkpoints')} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', transition: 'all 0.2s' }}>До СР8</button>
        <button onClick={() => navigate('/sgp-management')} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', transition: 'all 0.2s' }}>После СР8</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 30, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('checkpoints')} style={tabStyle(activeTab === 'checkpoints')}>Аудит авто Цеха Сборки</button>
        <button onClick={() => setActiveTab('timepoints')} style={tabStyle(activeTab === 'timepoints')}>Время прохождения точек</button>
        <button onClick={() => setActiveTab('neighbors')} style={tabStyle(activeTab === 'neighbors')}>Соседи по точке</button>
        <button onClick={() => setActiveTab('buffer')} style={tabStyle(activeTab === 'buffer')}>Buffer Status Report</button>
      </div>

      {activeTab === 'timepoints' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>⏱️ Время прохождения точек</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={{ ...buttonStyle, background: '#059669' }} onClick={exportTimePointsToExcel}>📊 Excel</button>
              <button style={{ ...buttonStyle, background: '#F59E0B' }} onClick={openExportModal}>📥 Экспорт на холды</button>
              <button style={{ ...buttonStyle, background: '#9CA3AF' }} onClick={handleTpClear}>✕ Очистить фильтры</button>
            </div>
          </div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ ...labelStyle, alignItems: 'flex-start', paddingTop: 10 }}>🔍 VIN:
              <textarea value={tpVinSearch} onChange={(e) => setTpVinSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); loadTimePoints(); } }} placeholder="Вставьте VIN..." style={{ ...textareaStyle, width: 350 }} />
            </label>
            <button style={{ ...buttonStyle, marginTop: 10 }} onClick={loadTimePoints}>Найти</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{leftTimeFilters.map(f => <React.Fragment key={f.label}>{renderTimeFilter(f, tpFilters, setTpFilters)}</React.Fragment>)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{rightTimeFilters.map(f => <React.Fragment key={f.label}>{renderTimeFilter(f, tpFilters, setTpFilters)}</React.Fragment>)}</div>
          </div>
          {timePointsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}><style>{loadingAnimation}</style><div className="loading-dots" style={{ display: 'inline-block' }}><span>Загрузка данных</span><span>.</span><span>.</span><span>.</span></div></div>
          ) : timePointsError ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#DC2626' }}>❌ {timePointsError}</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 550px)', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 2800 }}>
                  <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                    {timePointColumns.map(col => (
                      <th key={col.key} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: tpFilters[col.key]?.length > 0 ? '#DBEAFE' : '#F9FAFB', zIndex: 10, fontSize: 11, cursor: col.filterable ? 'pointer' : 'default' }} onClick={col.filterable ? (e) => handleFilterHeaderClick(col.key, e) : undefined}>
                        {col.label}{tpFilters[col.key]?.length > 0 && ` (${tpFilters[col.key].length})`}{col.filterable && ' ▼'}
                      </th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {timePointsData.length > 0 ? timePointsData.slice(timePointsPage * timePointsPageSize, (timePointsPage + 1) * timePointsPageSize).map((v, idx) => (
                      <tr key={v.vin} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        {timePointColumns.map(col => <td key={col.key} style={{ padding: '8px', borderBottom: '1px solid #F0F0F5', fontSize: 10, whiteSpace: 'nowrap' }}>{col.isTime ? formatShortDateTime(v[col.key]) : (v[col.key] || '-')}</td>)}
                      </tr>
                    )) : <tr><td colSpan={timePointColumns.length} style={{ textAlign: 'center', padding: 30, color: '#6B7280', fontSize: 14 }}>Нет данных</td></tr>}
                  </tbody>
                </table>
              </div>
              {timePointsData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 14, color: '#6B7280' }}>Всего: {timePointsData.length}</span>
                  {Math.ceil(timePointsData.length / timePointsPageSize) > 1 && (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <button onClick={() => setTimePointsPage(p => Math.max(0, p - 1))} disabled={timePointsPage === 0} style={{ ...buttonStyle, background: '#9CA3AF' }}>← Назад</button>
                      <span style={{ fontWeight: 500 }}>{timePointsPage + 1} / {Math.ceil(timePointsData.length / timePointsPageSize)}</span>
                      <button onClick={() => setTimePointsPage(p => Math.min(Math.ceil(timePointsData.length / timePointsPageSize) - 1, p + 1))} disabled={timePointsPage === Math.ceil(timePointsData.length / timePointsPageSize) - 1} style={{ ...buttonStyle, background: '#9CA3AF' }}>Вперёд →</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {activeFilterColumn && allTimePointsData.length > 0 && (
            <div className="filter-dropdown" style={{ ...filterDropdownStyle, top: filterDropdownPos.top, left: filterDropdownPos.left }}>
              <div style={{ ...filterOptionStyle, fontWeight: 700, borderBottom: '1px solid #E5E7EB', marginBottom: 4 }} onClick={() => handleFilterClear(activeFilterColumn)}>✕ Очистить фильтр</div>
              {getUniqueValues(activeFilterColumn).map(val => {
                const checked = tpFilters[activeFilterColumn]?.includes(val);
                return <div key={val} style={{ ...filterOptionStyle, background: checked ? '#EFF6FF' : 'transparent' }} onClick={() => handleFilterToggle(activeFilterColumn, val)}><input type="checkbox" checked={checked} readOnly />{val}</div>;
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'neighbors' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>🚗 Соседи по точке</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={{ ...buttonStyle, background: '#F59E0B' }} onClick={exportNeighborsToHolds}>📥 Экспорт на холд</button>
              <button style={{ ...buttonStyle, background: '#059669' }} onClick={exportNeighborsToExcel}>📊 Экспорт Excel</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, alignItems: 'center' }}>
            <label style={labelStyle}>Точка: <select value={neighborCheckpoint} onChange={(e) => setNeighborCheckpoint(e.target.value)} style={{ ...inputStyle, minWidth: 120 }}>{neighborPointOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
            <label style={{ ...labelStyle, minWidth: 200 }}>VIN: <input type="text" value={neighborVin} onChange={(e) => setNeighborVin(e.target.value)} placeholder="Введите VIN..." style={{ ...inputStyle, flex: 1 }} /></label>
            <label style={labelStyle}>До: <input type="number" min="0" value={neighborLimitBefore} onChange={(e) => setNeighborLimitBefore(parseInt(e.target.value, 10) || 0)} style={{ ...inputStyle, width: 80 }} /></label>
            <label style={labelStyle}>После: <input type="number" min="0" value={neighborLimitAfter} onChange={(e) => setNeighborLimitAfter(parseInt(e.target.value, 10) || 0)} style={{ ...inputStyle, width: 80 }} /></label>
            <button style={buttonStyle} onClick={loadNeighbors} disabled={!neighborVin.trim() || neighborLoading}>{neighborLoading ? '⏳ Загрузка...' : '🔍 Найти'}</button>
          </div>
          {neighborError && <p style={{ color: '#DC2626', marginBottom: 16 }}>❌ {neighborError}</p>}
          {neighborTargetTime && <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 16 }}>Время {neighborCheckpoint}: <strong>{formatDateTime(neighborTargetTime)}</strong></p>}
          {neighborLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><style>{loadingAnimation}</style><div className="loading-dots"><span>Загрузка</span><span>.</span><span>.</span><span>.</span></div></div>
          ) : filteredNeighborData.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', maxHeight: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                  <th style={{ ...thStyle, position: 'sticky', top: 0 }}>VIN</th>
                  <th style={{ ...thStyle, position: 'sticky', top: 0 }}>Время {neighborCheckpoint}</th>
                  <th style={{ ...thStyle, position: 'sticky', top: 0, cursor: 'pointer', background: neighborFilters.current_zone?.length > 0 ? '#DBEAFE' : '#F9FAFB' }} onClick={(e) => handleNeighborFilterHeaderClick('current_zone', e)}>Текущее расположение {neighborFilters.current_zone?.length > 0 && `(${neighborFilters.current_zone.length})`} ▼</th>
                  <th style={{ ...thStyle, position: 'sticky', top: 0, cursor: 'pointer', background: neighborFilters.model?.length > 0 ? '#DBEAFE' : '#F9FAFB' }} onClick={(e) => handleNeighborFilterHeaderClick('model', e)}>Модель {neighborFilters.model?.length > 0 && `(${neighborFilters.model.length})`} ▼</th>
                  <th style={{ ...thStyle, position: 'sticky', top: 0, cursor: 'pointer', background: neighborFilters.material_desc?.length > 0 ? '#DBEAFE' : '#F9FAFB' }} onClick={(e) => handleNeighborFilterHeaderClick('material_desc', e)}>Комплектация {neighborFilters.material_desc?.length > 0 && `(${neighborFilters.material_desc.length})`} ▼</th>
                </tr></thead>
                <tbody>
                  {filteredNeighborData.map((i, idx) => {
                    const isTarget = i.vin === neighborVin;
                    return (
                      <tr key={idx} style={{ backgroundColor: isTarget ? '#DCFCE7' : (idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB') }}>
                        <td style={tdStyle}>{i.vin}</td>
                        <td style={tdStyle}>{formatDateTime(i.point_time || i.trim_in || i.creation_time || i.in_storage_time || i.out_storage_time)}</td>
                        <td style={tdStyle}>{i.current_zone}</td>
                        <td style={tdStyle}>{i.model}</td>
                        <td style={tdStyle}>{i.material_desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (!neighborLoading && !neighborError && <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Введите VIN, выберите точку и нажмите «Найти»</div>)}
          {activeNeighborFilterColumn && enrichedNeighborData.length > 0 && (
            <div className="filter-dropdown" style={{ ...filterDropdownStyle, top: neighborFilterDropdownPos.top, left: neighborFilterDropdownPos.left }}>
              <div style={{ ...filterOptionStyle, fontWeight: 700, borderBottom: '1px solid #E5E7EB', marginBottom: 4 }} onClick={() => handleNeighborFilterClear(activeNeighborFilterColumn)}>✕ Очистить фильтр</div>
              {getNeighborUniqueValues(activeNeighborFilterColumn).map(val => {
                const checked = neighborFilters[activeNeighborFilterColumn]?.includes(val);
                return <div key={val} style={{ ...filterOptionStyle, background: checked ? '#EFF6FF' : 'transparent' }} onClick={() => handleNeighborFilterToggle(activeNeighborFilterColumn, val)}><input type="checkbox" checked={checked} readOnly />{val}</div>;
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'buffer' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>🚗 Buffer Status Report</h2>
            <button style={{ ...buttonStyle, background: '#059669' }} onClick={exportBufferToExcel}>📊 Экспорт Excel</button>
          </div>

          {bufferLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><style>{loadingAnimation}</style><div className="loading-dots"><span>Загрузка</span><span>.</span><span>.</span><span>.</span></div></div>
          ) : bufferError ? (
            <div style={{ color: '#DC2626', textAlign: 'center', padding: 40 }}>❌ {bufferError}</div>
          ) : (
            <>
              {/* Верхние фильтры */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>Период:</span>
                    <button onClick={() => setBufferChartPeriod('all')} style={tabStyle(bufferChartPeriod === 'all')}>Все</button>
                    <button onClick={() => setBufferChartPeriod('year')} style={tabStyle(bufferChartPeriod === 'year')}>Год</button>
                    <button onClick={() => setBufferChartPeriod('month')} style={tabStyle(bufferChartPeriod === 'month')}>Месяц</button>
                    <button onClick={() => setBufferChartPeriod('week')} style={tabStyle(bufferChartPeriod === 'week')}>Неделя</button>
                    <button onClick={() => setBufferChartPeriod('day')} style={tabStyle(bufferChartPeriod === 'day')}>День</button>
                  </div>
                  <label style={{ fontSize: 14, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>Модель:
                    <select value={bufferChartModel} onChange={e => setBufferChartModel(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB' }}>
                      {bufferAvailableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {/* ПОТОК */}
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>Поток: График новых непринятых автомобилей (по дате CP8)</div>
              {bufferChartPeriod === 'all' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, marginBottom: 40, alignItems: 'start' }}>
                  {renderBufferTrendChart('📅 Не принято (3 месяца)', bufferChartsData.flowMonths, '#60A5FA')}
                  {renderBufferTrendChart('📆 Не принято (4 недели)', bufferChartsData.flowWeeks, '#34D399')}
                  {renderBufferTrendChart('📊 Не принято (14 дней)', bufferChartsData.flowDays, '#FBBF24')}
                </div>
              ) : (
                <div style={{ marginBottom: 40 }}>{renderBufferTrendChart(`📊 Поток (${bufferChartPeriod === 'year' ? 'Год' : bufferChartPeriod === 'month' ? 'Месяц' : bufferChartPeriod === 'week' ? 'Неделя' : 'День'})`, bufferChartsData.flowDays, '#FBBF24')}</div>
              )}

              {/* ОСТАТОК — здесь по одной пунктирной линии (y=5) на каждом графике */}
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>Остаток: Общее количество автомобилей в буфере на конец периода</div>
              {bufferChartPeriod === 'all' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, marginBottom: 20, alignItems: 'start' }}>
                  {renderBufferTrendChart('📅 Остаток (3 месяца)', bufferChartsData.stockMonths, '#A78BFA', STOCK_THRESHOLD)}
                  {renderBufferTrendChart('📆 Остаток (4 недели)', bufferChartsData.stockWeeks, '#F472B6', STOCK_THRESHOLD)}
                  {renderBufferTrendChart('📊 Остаток (14 дней)', bufferChartsData.stockDays, '#FB923C', STOCK_THRESHOLD)}
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>{renderBufferTrendChart(`📊 Остаток (${bufferChartPeriod === 'year' ? 'Год' : bufferChartPeriod === 'month' ? 'Месяц' : bufferChartPeriod === 'week' ? 'Неделя' : 'День'})`, bufferChartsData.stockDays, '#FB923C', STOCK_THRESHOLD)}</div>
              )}

              {/* СВЕЧНОЙ (waterfall) ГРАФИК — динамика остатка по 14 дням (НЕЗАВИСИМЫЙ ОТ ФИЛЬТРОВ) */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', marginBottom: 30 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12, textAlign: 'center' }}>
                  📈 Динамика остатка по 14 дням (изменение день-к-дню, линия — накопленный остаток)
                </h3>
                <StockCandleChart data={candleChartData} color="#A78BFA" />
              </div>

              {/* Фильтры времени (без ADAS) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{leftBufferTimeFilters.map(f => <React.Fragment key={f.label}>{renderTimeFilter(f, bufferTimeFilters, setBufferTimeFilters)}</React.Fragment>)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{rightBufferTimeFilters.map(f => <React.Fragment key={f.label}>{renderTimeFilter(f, bufferTimeFilters, setBufferTimeFilters)}</React.Fragment>)}</div>
              </div>

              {/* Активные фильтры */}
              {(bufferCriterionFilter !== 'ALL' || bufferBlockFilter !== 'ALL' || bufferModelFilter !== 'ALL' || Object.keys(bufferTimeFilters).length > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>Активные фильтры:</span>
                  {bufferCriterionFilter !== 'ALL' && <span style={{ padding: '4px 10px', background: '#FEF3C7', color: '#92400E', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Критерий: {bufferCriterionFilter}</span>}
                  {bufferBlockFilter !== 'ALL' && <span style={{ padding: '4px 10px', background: '#FEE2E2', color: '#991B1B', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Статус: {bufferBlockFilter}</span>}
                  {bufferModelFilter !== 'ALL' && <span style={{ padding: '4px 10px', background: '#E0F2FE', color: '#0369A1', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Модель: {bufferModelFilter}</span>}
                  {Object.keys(bufferTimeFilters).length > 0 && <span style={{ padding: '4px 10px', background: '#EFF6FF', color: '#1E40AF', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Есть фильтры по времени</span>}
                  <button onClick={clearBufferFilters} style={{ background: 'none', border: 'none', color: '#DC2626', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Сбросить все</button>
                </div>
              )}

              {/* Фильтры таблицы */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                <label style={labelStyle}>Критерий:
                  <select value={bufferCriterionFilter} onChange={e => setBufferCriterionFilter(e.target.value)} style={inputStyle}>
                    <option value="ALL">Все</option><option value="Принято">Принято</option><option value="Не принято">Не принято</option><option value="Ожидает CP8">Ожидает CP8</option>
                  </select>
                </label>
                <label style={labelStyle}>Статус:
                  <select value={bufferBlockFilter} onChange={e => setBufferBlockFilter(e.target.value)} style={inputStyle}>
                    <option value="ALL">Все</option><option value="Блок">Блок</option><option value="Не блок">Не блок</option>
                  </select>
                </label>
                <label style={labelStyle}>Модель авто:
                  <select value={bufferModelFilter} onChange={e => setBufferModelFilter(e.target.value)} style={inputStyle}>
                    {bufferAvailableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                  </select>
                </label>
              </div>

              {/* ТАБЛИЦА (Расположение на складе в конце) */}
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', maxHeight: 'calc(100vh - 400px)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1200 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={thStyle}>VIN</th>
                      <th style={thStyle}>Модель</th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('cp72_time')}>Дата CP72 <span style={{ marginLeft: 4, color: bufferSort.column === 'cp72_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>{bufferSort.column === 'cp72_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}</span></th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('tltt_time')}>Дата TLTT <span style={{ marginLeft: 4, color: bufferSort.column === 'tltt_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>{bufferSort.column === 'tltt_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}</span></th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('cp8_time')}>Дата CP8 <span style={{ marginLeft: 4, color: bufferSort.column === 'cp8_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>{bufferSort.column === 'cp8_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}</span></th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('diff_cp8_cp72')}>Время CP8 → CP72 <span style={{ marginLeft: 4, color: bufferSort.column === 'diff_cp8_cp72' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>{bufferSort.column === 'diff_cp8_cp72' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}</span></th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('in_storage_time')}>Постановка на СГП <span style={{ marginLeft: 4, color: bufferSort.column === 'in_storage_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>{bufferSort.column === 'in_storage_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}</span></th>
                      <th style={thStyle}>Критерий потеряшки</th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('diff_cp8_sgp')}>Время CP8 → СГП <span style={{ marginLeft: 4, color: bufferSort.column === 'diff_cp8_sgp' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>{bufferSort.column === 'diff_cp8_sgp' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}</span></th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('block_status')}>Статус блокировки <span style={{ marginLeft: 4, color: bufferSort.column === 'block_status' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>{bufferSort.column === 'block_status' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}</span></th>
                      <th style={thStyle}>Расположение на складе</th> {/* ПЕРЕМЕЩЕНО В КОНЕЦ */}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBufferData.length > 0 ? filteredBufferData.slice(bufferPage * bufferPageSize, (bufferPage + 1) * bufferPageSize).map((item, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        <td style={tdStyle}>{item.vin}</td>
                        <td style={tdStyle}>{item.model}</td>
                        <td style={tdStyle}>{formatDateTime(item.cp72_time)}</td>
                        <td style={tdStyle}>{formatDateTime(item.tltt_time)}</td>
                        <td style={tdStyle}>{formatDateTime(item.cp8_time)}</td>
                        <td style={tdStyle}>{formatTimeDiff(item.cp8_time, item.cp72_time)}</td>
                        <td style={tdStyle}>{formatDateTime(item.in_storage_time)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: item.criterion === 'Не принято' ? '#DC2626' : (item.criterion === 'Принято' ? '#059669' : '#9CA3AF') }}>{item.criterion}</td>
                        <td style={tdStyle}>{formatTimeDiff(item.in_storage_time, item.cp8_time)}</td>
                        <td style={{ ...tdStyle, color: item.block_status.startsWith('Блок') ? '#DC2626' : '#1F2937', cursor: item.block_status.startsWith('Блок') ? 'pointer' : 'default', textDecoration: item.block_status.startsWith('Блок') ? 'underline' : 'none', fontWeight: item.block_status.startsWith('Блок') ? 700 : 400 }} onClick={() => item.block_status.startsWith('Блок') && openBlockReasons(item.vin)} title={item.block_status.startsWith('Блок') ? 'Причины' : ''}>{item.block_status}</td>
                        <td style={tdStyle}>{item.storage_location || '-'}</td> {/* ПЕРЕМЕЩЕНО В КОНЕЦ */}
                      </tr>
                    )) : <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: 30 }}>Нет данных</td></tr>}
                  </tbody>
                </table>
              </div>

              {filteredBufferData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 14, color: '#6B7280' }}>Всего: {filteredBufferData.length}</span>
                  {Math.ceil(filteredBufferData.length / bufferPageSize) > 1 && (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <button onClick={() => setBufferPage(p => Math.max(0, p - 1))} disabled={bufferPage === 0} style={{ ...buttonStyle, background: '#9CA3AF' }}>← Назад</button>
                      <span style={{ fontWeight: 500 }}>{bufferPage + 1} / {Math.ceil(filteredBufferData.length / bufferPageSize)}</span>
                      <button onClick={() => setBufferPage(p => Math.min(Math.ceil(filteredBufferData.length / bufferPageSize) - 1, p + 1))} disabled={bufferPage === Math.ceil(filteredBufferData.length / bufferPageSize) - 1} style={{ ...buttonStyle, background: '#9CA3AF' }}>Вперёд →</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'checkpoints' && (
        <>
          <div style={{ marginBottom: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <label style={{ ...labelStyle, alignItems: 'flex-start', paddingTop: 10 }}>🔍 VIN:
                <textarea value={vinSearch} onChange={(e) => setVinSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleVinSearch(); } }} placeholder="Вставьте VIN..." style={{ ...textareaStyle, width: 350 }} disabled={isVinMode && !vinSearch} />
              </label>
              <button onClick={handleVinSearch} disabled={!vinSearch.trim()} style={{ ...buttonStyle, marginTop: 10, opacity: vinSearch.trim() ? 1 : 0.6, pointerEvents: vinSearch.trim() ? 'auto' : 'none' }}>Найти</button>
              {isVinMode && <button onClick={handleVinReset} style={{ ...buttonStyle, background: '#9CA3AF', marginTop: 10 }}>✕ Сбросить</button>}
            </div>
          </div>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#EEF2FF', padding: '4px 12px', borderRadius: 6, color: '#2563EB', fontSize: 16 }}>📦</span>Аудит авто Цеха Сборки
            </h2>
            {renderCpSelector(selectedCp, setSelectedCp)}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <label style={labelStyle}><span style={{ whiteSpace: 'nowrap' }}>Начало:</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} disabled={isFilterDisabled} />
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...inputStyle, width: '90px' }} disabled={isFilterDisabled} />
              </label>
              <label style={labelStyle}><span style={{ whiteSpace: 'nowrap' }}>Конец:</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} disabled={isFilterDisabled} />
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...inputStyle, width: '90px' }} disabled={isFilterDisabled} />
              </label>
              <label style={labelStyle}>Модель
                <select value={cpModel} onChange={e => setCpModel(e.target.value)} style={inputStyle} disabled={isFilterDisabled}>
                  {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                </select>
              </label>
              <button onClick={runAudit} disabled={isFilterDisabled || !startDate || !endDate || cpLoading} style={{ ...buttonStyle, opacity: !isFilterDisabled && startDate && endDate && !cpLoading ? 1 : 0.6, pointerEvents: !isFilterDisabled && startDate && endDate && !cpLoading ? 'auto' : 'none', background: !isFilterDisabled && startDate && endDate && !cpLoading ? '#2563EB' : '#9CA3AF' }}>
                {cpLoading ? '⏳ Загрузка...' : '▶ Загрузить'}
              </button>
            </div>
            {endDate && new Date(endDate) < new Date(startDate) && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>Конечная дата не может быть раньше начальной</p>}
            {cpError && <p style={{ color: '#DC2626', marginTop: 18 }}>❌ {cpError}</p>}
            {cpData.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>Найдено: {cpData.length}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => exportExcel(cpData, 'аудит_хранение')} style={{ ...buttonStyle, background: '#059669' }}>📊 Excel</button>
                    <button onClick={() => exportWord(cpData, 'аудит_хранение')} style={{ ...buttonStyle, background: '#7C3AED' }}>📄 Word</button>
                  </div>
                </div>
                <div style={{ borderRadius: 10, overflowX: 'auto', border: '1px solid #E5E7EB' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ backgroundColor: '#F9FAFB' }}>
                      {Object.keys(cpData[0]).filter(k => k !== 'Текущее расположение').map(h => <th key={h} style={thStyle}>{h}</th>)}
                      <th style={thStyle}>Текущее расположение</th>
                    </tr></thead>
                    <tbody>
                      {cpData.slice(cpPage * rowsPerPage, (cpPage + 1) * rowsPerPage).map((row, i) => {
                        const loc = cpLocations[row.VIN];
                        let disp = '-';
                        if (loc) { if (loc.isInStorage) disp = 'На складе'; else if (loc.isSold) disp = 'Продан'; else disp = loc.checkpoint || '-'; }
                        return (
                          <tr key={i} style={{ backgroundColor: i % 2 ? '#F9FAFB' : '#FFFFFF' }}>
                            {Object.keys(cpData[0]).filter(k => k !== 'Текущее расположение').map(key => <td key={key} style={tdStyle}>{row[key] === 'N/A' ? '-' : (row[key] ?? '')}</td>)}
                            <td style={tdStyle}>{disp}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {Math.ceil(cpData.length / rowsPerPage) > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 18 }}>
                    <button onClick={() => setCpPage(p => Math.max(0, p - 1))} disabled={cpPage === 0} style={{ ...buttonStyle, background: '#9CA3AF' }}>← Назад</button>
                    <span style={{ alignSelf: 'center', fontWeight: 500 }}>{cpPage + 1} / {Math.ceil(cpData.length / rowsPerPage)}</span>
                    <button onClick={() => setCpPage(p => Math.min(Math.ceil(cpData.length / rowsPerPage) - 1, p + 1))} disabled={cpPage === Math.ceil(cpData.length / rowsPerPage) - 1} style={{ ...buttonStyle, background: '#9CA3AF' }}>Вперёд →</button>
                  </div>
                )}
              </div>
            )}
            {!cpLoading && cpData.length === 0 && startDate && endDate && <p style={{ color: '#6B7280', textAlign: 'center', marginTop: 30 }}>Нет данных</p>}
          </div>
        </>
      )}

      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '90%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1F2937' }}>Экспорт на холды</h3>
              <button onClick={closeExportModal} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#DC2626', fontWeight: 700 }}>×</button>
            </div>
            <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 16 }}>Выберите причину или введите свою</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Поиск:
                <input type="text" value={exportSearch} onChange={(e) => setExportSearch(e.target.value)} placeholder="..." style={{ ...inputStyle, flex: 1 }} disabled={!!customReason} />
              </label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                {exportReasonLoading ? <div style={{ padding: 20, textAlign: 'center' }}>Загрузка...</div> :
                  filteredReasons.length > 0 ? filteredReasons.map(r => (
                    <div key={r} onClick={() => handleSelectReason(r)} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: selectedReason === r ? '#EFF6FF' : 'transparent', borderBottom: '1px solid #F0F0F5', fontSize: 14 }}>{r}</div>
                  )) : <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF' }}>Нет</div>}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Своя:
                <input type="text" value={customReason} onChange={handleCustomReasonChange} placeholder="..." style={{ ...inputStyle, flex: 1 }} disabled={!!selectedReason} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button style={{ ...buttonStyle, background: '#9CA3AF' }} onClick={closeExportModal}>Отмена</button>
              <button style={{ ...buttonStyle, background: '#F59E0B', opacity: (selectedReason || customReason) ? 1 : 0.6 }} onClick={handleExportToHoldsWithReason} disabled={!selectedReason && !customReason}>📥 Экспорт</button>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowBlockModal(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '90%', maxWidth: 800, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1F2937' }}>Причины блокировки: <span style={{ color: '#DC2626' }}>{selectedBlockVin}</span></h3>
              <button onClick={() => setShowBlockModal(false)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280' }}>×</button>
            </div>
            {blockReasonsLoading ? <div style={{ textAlign: 'center', padding: 40 }}>Загрузка...</div> : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 12, borderBottom: '1px solid #FCA5A5', paddingBottom: 4 }}>Активные ({blockReasonsData.active.length})</h4>
                {blockReasonsData.active.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
                    <thead><tr style={{ backgroundColor: '#FEF2F2' }}><th style={{ ...thStyle, color: '#991B1B' }}>Причина</th><th style={{ ...thStyle, color: '#991B1B', width: 160 }}>Дата</th></tr></thead>
                    <tbody>{blockReasonsData.active.map((r, i) => <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FEF2F2' }}><td style={{ ...tdStyle, fontWeight: 600 }}>{r.reason}</td><td style={tdStyle}>{formatDateTime(r.block_date)}</td></tr>)}</tbody>
                  </table>
                ) : <p style={{ color: '#059669', fontSize: 14, marginBottom: 24 }}>Нет активных</p>}
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#059669', marginBottom: 12, borderBottom: '1px solid #A7F3D0', paddingBottom: 4 }}>Разблокированные ({blockReasonsData.cleared.length})</h4>
                {blockReasonsData.cleared.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ backgroundColor: '#ECFDF5' }}><th style={{ ...thStyle, color: '#065F46' }}>Причина</th><th style={{ ...thStyle, color: '#065F46', width: 160 }}>Блок</th><th style={{ ...thStyle, color: '#065F46', width: 160 }}>Разблок</th></tr></thead>
                    <tbody>{blockReasonsData.cleared.map((r, i) => <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#ECFDF5' }}><td style={{ ...tdStyle, color: '#4B5563' }}>{r.reason}</td><td style={{ ...tdStyle, color: '#4B5563' }}>{formatDateTime(r.block_date)}</td><td style={{ ...tdStyle, color: '#059669', fontWeight: 600 }}>{formatDateTime(r.unblock_date)}</td></tr>)}</tbody>
                  </table>
                ) : <p style={{ color: '#9CA3AF', fontSize: 14 }}>Нет разблокированных</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}