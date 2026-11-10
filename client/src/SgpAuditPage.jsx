import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList
} from 'recharts';

const API_BASE = '';

const tableToHtml = (rows) => {
  if (!rows.length) return '<p>Нет данных</p>';
  const headers = Object.keys(rows[0]);
  let html = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%">';
  html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  rows.forEach(row => {
    html += '<tr>' + headers.map(h => `<td>${row[h] != null ? row[h] : ''}</td>`).join('') + '</tr>';
  });
  html += '</table>';
  return html;
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 28,
  marginBottom: 24,
  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
  border: '1px solid #F0F0F5',
};

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  color: '#4B5563',
  fontWeight: 500,
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
};

const textareaStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
  minHeight: '44px',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: '1.4',
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
  transition: 'background 0.2s, transform 0.1s',
  boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
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

const cpNames = [
  { value: 'Key_Uloc_Type_TRIMIN', label: 'TRIMIN' },
  { value: 'Key_Uloc_Type_CP7', label: 'CP7' },
  { value: 'Key_Uloc_Type_CP72', label: 'CP72' },
  { value: 'Key_Uloc_Type_CPFINAL', label: 'CPFINAL' },
  { value: 'Key_Uloc_Type_CP8', label: 'CP8' },
];

const filterDropdownStyle = {
  position: 'fixed',
  zIndex: 1000,
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  maxHeight: 300,
  overflowY: 'auto',
  minWidth: 200,
  padding: 8,
};

const filterOptionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  cursor: 'pointer',
  borderRadius: 4,
  fontSize: 13,
  transition: 'background 0.15s',
};

const timeFilterBlockStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 14px',
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const timeFilterLabelStyle = {
  fontWeight: 700,
  fontSize: 12,
  color: '#2563EB',
  whiteSpace: 'nowrap',
  minWidth: 40,
  textAlign: 'center',
  background: '#EFF6FF',
  padding: '4px 8px',
  borderRadius: 6,
};

const neighborPointOptions = [
  'CP5', 'CP6', 'TRIMIN', 'CP7', 'CP72',
  'TLWA', 'TLRT', 'TLADAS', 'TLTT',
  'CPFINAL', 'CP8', 'Inbound', 'Outbound'
];

const loadingAnimation = `
  @keyframes blink {
    0% { opacity: 0.2; }
    20% { opacity: 1; }
    100% { opacity: 0.2; }
  }
  .loading-dots span {
    animation: blink 1.4s infinite both;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
`;

const parseVinList = (input) => {
  if (!input) return [];
  return input
    .split(/[\s,;\n\r]+/)
    .map(v => v.trim())
    .filter(v => v.length > 0);
};

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

  // VIN search (checkpoints)
  const [vinSearch, setVinSearch] = useState('');
  const [isVinMode, setIsVinMode] = useState(false);

  // Соседи по точке
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

  // ====== BUFFER STATUS REPORT ======
  const [bufferData, setBufferData] = useState([]);
  const [bufferLoading, setBufferLoading] = useState(false);
  const [bufferError, setBufferError] = useState(null);
  
  // Фильтры (Скриншот)
  const [bufferChartPeriod, setBufferChartPeriod] = useState('all');
  const [bufferChartModel, setBufferChartModel] = useState('ALL');
  
  // Фильтры таблицы
  const [bufferCriterionFilter, setBufferCriterionFilter] = useState('ALL');
  const [bufferBlockFilter, setBufferBlockFilter] = useState('ALL');
  const [bufferModelFilter, setBufferModelFilter] = useState('ALL');
  
  // По умолчанию сортируем по CP8 (самые свежие в буфере сверху)
  const [bufferSort, setBufferSort] = useState({ column: 'cp8_time', direction: 'desc' });
  
  // Фильтры времени Buffer
  const [bufferTimeFilters, setBufferTimeFilters] = useState({});

  // Пагинация таблицы
  const [bufferPage, setBufferPage] = useState(0);
  const bufferPageSize = 50;

  // Модалка причин блокировки
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReasonsData, setBlockReasonsData] = useState({ active: [], cleared: [] });
  const [blockReasonsLoading, setBlockReasonsLoading] = useState(false);
  const [selectedBlockVin, setSelectedBlockVin] = useState('');

  // Analytics (скрыта)
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditModel, setAuditModel] = useState('ALL');
  const [auditResultFilter, setAuditResultFilter] = useState('ALL');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditAnalytics, setAuditAnalytics] = useState(null);
  const [auditDailyData, setAuditDailyData] = useState([]);

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportReasons, setExportReasons] = useState([]);
  const [exportSearch, setExportSearch] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [exportReasonLoading, setExportReasonLoading] = useState(false);

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

  // Извлекаем уникальные модели из данных Buffer для фильтра
  const bufferAvailableModels = useMemo(() => {
    const models = [...new Set(bufferData.map(d => d.model))].filter(m => m && m !== '—');
    return ['ALL', ...models.sort()];
  }, [bufferData]);

  // Блокировка скролла при открытых модалках
  useEffect(() => {
    if (showBlockModal || showExportModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showBlockModal, showExportModal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeFilterColumn && !event.target.closest('.filter-dropdown') && !event.target.closest('th')) {
        setActiveFilterColumn(null);
      }
      if (activeNeighborFilterColumn && !event.target.closest('.filter-dropdown') && !event.target.closest('th')) {
        setActiveNeighborFilterColumn(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeFilterColumn, activeNeighborFilterColumn]);

  useEffect(() => {
    const handleScroll = (event) => {
      if (event.target.closest && event.target.closest('.filter-dropdown')) {
        return;
      }
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

  // Сброс страницы при изменении фильтров таблицы Buffer
  useEffect(() => {
    setBufferPage(0);
  }, [bufferCriterionFilter, bufferBlockFilter, bufferModelFilter, bufferTimeFilters]);

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
    if (h > 24) {
      const d = Math.floor(h / 24);
      return `${d} д ${h % 24} ч`;
    }
    return `${h} ч ${m} мин`;
  };

  const loadTimePoints = async () => {
    setTimePointsLoading(true);
    setTimePointsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/time-points`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error:', errorText);
        throw new Error(`Ошибка загрузки данных (${res.status})`);
      }
      const json = await res.json();
      setAllTimePointsData(json);
      setTimePointsData(json);
      setTimePointsPage(0);
    } catch (err) {
      console.error('Ошибка Time Points:', err);
      setTimePointsError(err.message);
      setAllTimePointsData([]);
      setTimePointsData([]);
    } finally {
      setTimePointsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'timepoints') {
      loadTimePoints();
    }
    if (activeTab === 'buffer') {
      setBufferLoading(true);
      setBufferError(null);
      fetch(`${API_BASE}/api/buffer-status-data`)
        .then(res => res.json())
        .then(json => {
          setBufferData(Array.isArray(json) ? json : []);
          setBufferLoading(false);
        })
        .catch(err => {
          setBufferError(err.message);
          setBufferLoading(false);
        });
    }
  }, [activeTab]);

  const hasAnyFilter = useMemo(() => {
    return !!tpVinSearch.trim() ||
      (Array.isArray(tpFilters.vin) && tpFilters.vin.length > 0) ||
      ['material_code', 'sequence_number', 'batch_num', 'kd_material_no', 'model', 'material_desc', 'storage_location', 'colour', 'location'].some(f => tpFilters[f] && tpFilters[f].length > 0) ||
      Object.keys(tpFilters).some(key => key.match(/^(cp5|cp6|trimIn|cp7|cp72|tlwa|tlrt|tladas|tltt|cpFinal|cp8|inbound|outbound)(From|To)$/));
  }, [tpFilters, tpVinSearch]);

  const getUniqueValues = (column) => {
    const values = [...new Set(allTimePointsData.map(d => d[column]).filter(v => v !== null && v !== undefined && v !== ''))];
    return values.sort();
  };

  const handleFilterHeaderClick = (column, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setFilterDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setActiveFilterColumn(activeFilterColumn === column ? null : column);
  };

  const handleFilterToggle = (column, value) => {
    setTpFilters(prev => {
      const currentValues = prev[column] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];

      const newFilters = { ...prev };
      if (newValues.length > 0) {
        newFilters[column] = newValues;
      } else {
        delete newFilters[column];
      }
      return newFilters;
    });
  };

  const handleFilterClear = (column) => {
    setTpFilters(prev => {
      const newPrev = { ...prev };
      delete newPrev[column];
      return newPrev;
    });
    setActiveFilterColumn(null);
  };

  const filteredTimePointsData = useMemo(() => {
    let result = allTimePointsData;

    if (tpVinSearch.trim()) {
      const searchTokens = parseVinList(tpVinSearch);
      if (searchTokens.length > 0) {
        result = result.filter(d => {
          if (!d.vin) return false;
          const upperVin = d.vin.toUpperCase();
          return searchTokens.some(token => {
            const upperToken = token.toUpperCase();
            if (upperToken.length === 6) {
              return upperVin.endsWith(upperToken);
            }
            return upperVin.includes(upperToken);
          });
        });
      }
    }

    if (Array.isArray(tpFilters.vin) && tpFilters.vin.length > 0) {
      result = result.filter(d => tpFilters.vin.includes(d.vin));
    }

    ['material_code', 'sequence_number', 'batch_num', 'kd_material_no', 'model', 'material_desc', 'storage_location', 'colour', 'location'].forEach(field => {
      const selected = tpFilters[field];
      if (selected && selected.length > 0) {
        result = result.filter(d => selected.includes(d[field]));
      }
    });

    const timeFields = [
      { key: 'CP5', from: 'cp5From', to: 'cp5To' },
      { key: 'CP6', from: 'cp6From', to: 'cp6To' },
      { key: 'TRIMIN', from: 'trimInFrom', to: 'trimInTo' },
      { key: 'CP7', from: 'cp7From', to: 'cp7To' },
      { key: 'CP72', from: 'cp72From', to: 'cp72To' },
      { key: 'TLWA', from: 'tlwaFrom', to: 'tlwaTo' },
      { key: 'TLRT', from: 'tlrtFrom', to: 'tlrtTo' },
      { key: 'TLADAS', from: 'tladasFrom', to: 'tladasTo' },
      { key: 'TLTT', from: 'tlttFrom', to: 'tlttTo' },
      { key: 'CPFINAL', from: 'cpFinalFrom', to: 'cpFinalTo' },
      { key: 'CP8', from: 'cp8From', to: 'cp8To' },
      { key: 'in_storage_time', from: 'inboundFrom', to: 'inboundTo' },
      { key: 'out_storage_time', from: 'outboundFrom', to: 'outboundTo' },
    ];

    timeFields.forEach(({ key, from, to }) => {
      const fromVal = tpFilters[from];
      const toVal = tpFilters[to];
      if (fromVal) {
        result = result.filter(d => d[key] && new Date(d[key]) >= new Date(fromVal));
      }
      if (toVal) {
        result = result.filter(d => d[key] && new Date(d[key]) <= new Date(toVal));
      }
    });

    return result;
  }, [allTimePointsData, tpFilters, tpVinSearch]);

  useEffect(() => {
    setTimePointsData(filteredTimePointsData);
    setTimePointsPage(0);
  }, [filteredTimePointsData]);

  const handleTpClear = () => {
    setTpFilters({});
    setTpVinSearch('');
    setTimePointsData(allTimePointsData);
    setTimePointsPage(0);
  };

  // ====== Логика Buffer Status Report (ТАБЛИЦА) ======
  const filteredBufferData = useMemo(() => {
    let result = bufferData;
    
    // Фильтры таблицы
    if (bufferCriterionFilter !== 'ALL') {
      result = result.filter(d => d.criterion === bufferCriterionFilter);
    }
    
    if (bufferBlockFilter === 'Блок') {
      result = result.filter(d => d.block_status.startsWith('Блок'));
    } else if (bufferBlockFilter === 'Не блок') {
      result = result.filter(d => d.block_status === 'Не блок');
    }

    if (bufferModelFilter !== 'ALL') {
      result = result.filter(d => d.model === bufferModelFilter);
    }

    // Фильтры времени Buffer
    const timeFields = [
      { key: 'cp72_time', from: 'cp72From', to: 'cp72To' },
      { key: 'adas_time', from: 'tladasFrom', to: 'tladasTo' },
      { key: 'tltt_time', from: 'tlttFrom', to: 'tlttTo' },
      { key: 'cp8_time', from: 'cp8From', to: 'cp8To' },
      { key: 'in_storage_time', from: 'inboundFrom', to: 'inboundTo' },
    ];

    timeFields.forEach(({ key, from, to }) => {
      const fromVal = bufferTimeFilters[from];
      const toVal = bufferTimeFilters[to];
      
      if (fromVal) {
        const fromTime = new Date(fromVal).getTime();
        result = result.filter(d => d[key] && parseDbDate(d[key]) >= fromTime);
      }
      if (toVal) {
        const toTime = new Date(toVal).getTime();
        result = result.filter(d => d[key] && parseDbDate(d[key]) <= toTime);
      }
    });

    // Умная сортировка
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
         valA = parseDbDate(a[bufferSort.column]);
         valB = parseDbDate(b[bufferSort.column]);
      } else {
         valA = a[bufferSort.column] || '';
         valB = b[bufferSort.column] || '';
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    return result;
  }, [bufferData, bufferCriterionFilter, bufferBlockFilter, bufferModelFilter, bufferSort, bufferTimeFilters]);

  // ====== Логика Buffer Status Report (ГРАФИКИ - НЕЗАВИСИМО ОТ ТАБЛИЦЫ) ======
  const bufferChartsData = useMemo(() => {
    // Базовые данные для графиков (берем все машины)
    let chartCars = bufferData;

    // Применяем фильтр по модели (верхний)
    if (bufferChartModel !== 'ALL') {
      chartCars = chartCars.filter(d => d.model === bufferChartModel);
    }

    // Применяем фильтры по времени (если вы их задали, графики тоже должны их учитывать)
    const timeFields = [
      { key: 'cp72_time', from: 'cp72From', to: 'cp72To' },
      { key: 'adas_time', from: 'tladasFrom', to: 'tladasTo' },
      { key: 'tltt_time', from: 'tlttFrom', to: 'tlttTo' },
      { key: 'cp8_time', from: 'cp8From', to: 'cp8To' },
      { key: 'in_storage_time', from: 'inboundFrom', to: 'inboundTo' },
    ];

    timeFields.forEach(({ key, from, to }) => {
      const fromVal = bufferTimeFilters[from];
      const toVal = bufferTimeFilters[to];
      if (fromVal) {
        const fromTime = new Date(fromVal).getTime();
        chartCars = chartCars.filter(d => d[key] && parseDbDate(d[key]) >= fromTime);
      }
      if (toVal) {
        const toTime = new Date(toVal).getTime();
        chartCars = chartCars.filter(d => d[key] && parseDbDate(d[key]) <= toTime);
      }
    });


    // ========== 1. ДАННЫЕ ДЛЯ ПОТОКА (График новых непринятых) ==========
    const flowCars = chartCars
      .filter(d => d.criterion === 'Не принято' && d.cp8_time)
      .sort((a, b) => parseDbDate(a.cp8_time) - parseDbDate(b.cp8_time));

    const fMonthsMap = new Map();
    const fWeeksMap = new Map();
    const fDaysMap = new Map();

    flowCars.forEach(item => {
      const d = new Date(item.cp8_time);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      fMonthsMap.set(mKey, (fMonthsMap.get(mKey) || 0) + 1);

      const tmp = new Date(d);
      const dayNum = tmp.getDay() || 7;
      tmp.setDate(tmp.getDate() + 4 - dayNum);
      const yearStart = new Date(tmp.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
      const wKey = `W${String(weekNo).padStart(2, '0')}`;
      fWeeksMap.set(wKey, (fWeeksMap.get(wKey) || 0) + 1);

      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      fDaysMap.set(dKey, (fDaysMap.get(dKey) || 0) + 1);
    });

    const flowMonths = Array.from(fMonthsMap.entries()).map(([name, count]) => ({ name, count })).slice(-3);
    const flowWeeks = Array.from(fWeeksMap.entries()).map(([name, count]) => ({ name, count })).slice(-4);
    const flowDays = Array.from(fDaysMap.entries()).map(([name, count]) => ({ name: formatShortDate(name), count })).slice(-14);


    // ========== 2. ДАННЫЕ ДЛЯ ОСТАТКА (Накопительный итог) ==========
    const stockCars = chartCars.filter(d => d.cp8_time);

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
    
    const calculateStockAt = (endOfPeriodTimestamp) => {
      let count = 0;
      stockCars.forEach(car => {
        const cp8Ms = parseDbDate(car.cp8_time);
        const storageMs = car.in_storage_time ? parseDbDate(car.in_storage_time) : Infinity;
        if (cp8Ms <= endOfPeriodTimestamp && storageMs > endOfPeriodTimestamp) {
          count++;
        }
      });
      return count;
    };

    const stockMonths = [];
    const stockWeeks = [];
    const stockDays = [];

    // Дни
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59);
      stockDays.push({ name: formatShortDate(d), count: calculateStockAt(d.getTime()) });
    }

    // Недели
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() || 7) + 1 - i * 7, 23, 59, 59);
      const sunday = new Date(d);
      sunday.setDate(d.getDate() + 6);
      const targetTime = sunday.getTime() > now.getTime() ? endOfToday : sunday.getTime();
      const weekNum = Math.ceil((((targetTime - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
      stockWeeks.push({ name: `W${String(weekNum).padStart(2, '0')}`, count: calculateStockAt(targetTime) });
    }

    // Месяцы
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const targetTime = d.getTime() > now.getTime() ? endOfToday : d.getTime();
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      stockMonths.push({ name: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, count: calculateStockAt(targetTime) });
    }

    return { 
      flowMonths, flowWeeks, flowDays,
      stockMonths, stockWeeks, stockDays 
    };
  }, [bufferData, bufferChartModel, bufferTimeFilters]);

  const handleBufferSort = (column) => {
    setBufferSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearBufferFilters = () => {
    setBufferCriterionFilter('ALL');
    setBufferBlockFilter('ALL');
    setBufferModelFilter('ALL');
    setBufferTimeFilters({});
    setBufferChartModel('ALL');
  };

  const exportBufferToExcel = () => {
    if (!filteredBufferData.length) return;
    const exportData = filteredBufferData.map(item => ({
      'VIN': item.vin,
      'Модель': item.model,
      'CP72': formatDateTime(item.cp72_time),
      'ADAS': formatDateTime(item.adas_time),
      'TLTT': formatDateTime(item.tltt_time),
      'CP8': formatDateTime(item.cp8_time),
      'Постановка на СГП': formatDateTime(item.in_storage_time),
      'Критерий потеряшки': item.criterion,
      'Время CP8 → СГП': formatTimeDiff(item.in_storage_time, item.cp8_time),
      'Время CP8 → CP72': formatTimeDiff(item.cp8_time, item.cp72_time),
      'Статус блокировки': item.block_status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buffer Status');
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Buffer_Status_${dateStr}.xlsx`);
  };

  // ====== Загрузка причин блокировки ======
  const openBlockReasons = async (vin) => {
    setSelectedBlockVin(vin);
    setShowBlockModal(true);
    setBlockReasonsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/buffer-status-block-reasons?vin=${vin}`);
      if (res.ok) {
        const json = await res.json();
        setBlockReasonsData(json);
      } else {
        setBlockReasonsData({ active: [], cleared: [] });
      }
    } catch (err) {
      console.error(err);
      setBlockReasonsData({ active: [], cleared: [] });
    } finally {
      setBlockReasonsLoading(false);
    }
  };

  const renderBufferTrendChart = (title, data, color) => (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12, textAlign: 'center' }}>{title}</h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={28} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
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

  // ====== Получение текущего расположения (батчевое) ======
  const fetchCurrentLocations = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A'))];
      if (uniqueVins.length === 0) return {};

      const batchSize = 200;
      const batches = [];
      for (let i = 0; i < uniqueVins.length; i += batchSize) {
        batches.push(uniqueVins.slice(i, i + batchSize));
      }

      const allResponses = await Promise.all(
        batches.map(async (batch) => {
          const res = await fetch(`${API_BASE}/api/vehicles-current-location?vins=${batch.join(',')}`);
          if (!res.ok) throw new Error('Ошибка загрузки локаций');
          return res.json();
        })
      );

      const map = {};
      allResponses.forEach((locationsArray) => {
        locationsArray.forEach(item => { map[item.vin] = item; });
      });

      return map;
    } catch (err) {
      console.error('Ошибка получения current locations:', err);
      return {};
    }
  };

  // ====== Получение данных склада (батчевое) ======
  const fetchStorageLocations = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A'))];
      if (uniqueVins.length === 0) return {};

      const batchSize = 200;
      const batches = [];
      for (let i = 0; i < uniqueVins.length; i += batchSize) {
        batches.push(uniqueVins.slice(i, i + batchSize));
      }

      const allResponses = await Promise.all(
        batches.map(async (batch) => {
          const res = await fetch(`${API_BASE}/api/sgp-audit-storage?vins=${batch.join(',')}`);
          if (!res.ok) throw new Error('Ошибка загрузки storage');
          return res.json();
        })
      );

      const map = {};
      allResponses.forEach((storageRows) => {
        storageRows.forEach(row => {
          if (row.VIN) {
            map[row.VIN] = {
              Модель: row['Модель'] || '-',
              Склад: row['Склад'] || '-',
              Локация: row['Локация'] || '-',
              Ячейка: row['Ячейка'] || '-',
            };
          }
        });
      });

      return map;
    } catch (err) {
      console.error('Ошибка получения storage locations:', err);
      return {};
    }
  };

  // ====== Получение моделей из MES ======
  const fetchModels = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A'))];
      if (uniqueVins.length === 0) return {};

      const batchSize = 200;
      const batches = [];
      for (let i = 0; i < uniqueVins.length; i += batchSize) {
        batches.push(uniqueVins.slice(i, i + batchSize));
      }

      const allResponses = await Promise.all(
        batches.map(async (batch) => {
          const res = await fetch(`${API_BASE}/api/vehicles-models?vins=${batch.join(',')}`);
          if (!res.ok) throw new Error('Ошибка загрузки моделей');
          return res.json();
        })
      );

      const map = {};
      allResponses.forEach(modelsMap => {
        Object.keys(modelsMap).forEach(vin => { map[vin] = modelsMap[vin]; });
      });

      return map;
    } catch (err) {
      console.error('Ошибка получения моделей:', err);
      return {};
    }
  };

  // ====== Получение модели и комплектации (новый метод) ======
  const fetchModelComplect = async (vinList) => {
    if (!vinList || vinList.length === 0) return {};
    try {
      const uniqueVins = [...new Set(vinList.filter(v => v && v !== 'N/A'))];
      if (uniqueVins.length === 0) return {};

      const batchSize = 200;
      const batches = [];
      for (let i = 0; i < uniqueVins.length; i += batchSize) {
        batches.push(uniqueVins.slice(i, i + batchSize));
      }

      const allResponses = await Promise.all(
        batches.map(async (batch) => {
          const res = await fetch(`${API_BASE}/api/vehicles-model-complect?vins=${batch.join(',')}`);
          if (!res.ok) throw new Error('Ошибка загрузки модели/комплектации');
          return res.json();
        })
      );

      const map = {};
      allResponses.forEach(modelsMap => {
        Object.keys(modelsMap).forEach(vin => { map[vin] = modelsMap[vin]; });
      });

      return map;
    } catch (err) {
      console.error('Ошибка получения моделей и комплектаций:', err);
      return {};
    }
  };

  // ====== Загрузка соседей по точке ======
  const loadNeighbors = async () => {
    if (!neighborVin.trim()) return;
    setNeighborLoading(true);
    setNeighborError(null);
    setNeighborData([]);
    setNeighborTargetTime(null);
    setNeighborLocations({});
    setNeighborModelComplect({});
    setNeighborFilters({});
    setActiveNeighborFilterColumn(null);
    try {
      const params = new URLSearchParams({
        checkpoint: neighborCheckpoint,
        vin: neighborVin.trim(),
        limitBefore: neighborLimitBefore,
        limitAfter: neighborLimitAfter,
      });
      const res = await fetch(`${API_BASE}/api/time-point-neighbors?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки соседей');
      const json = await res.json();
      setNeighborData(json.data || []);
      setNeighborTargetTime(json.targetTime || null);

      if (json.data && json.data.length > 0) {
        const vins = json.data.map(item => item.vin);
        const locInfo = await fetchCurrentLocations(vins);
        setNeighborLocations(locInfo);

        const modelComplectInfo = await fetchModelComplect(vins);
        setNeighborModelComplect(modelComplectInfo);
      } else {
        setNeighborLocations({});
        setNeighborModelComplect({});
      }
    } catch (err) {
      console.error('Ошибка neighbors:', err);
      setNeighborError(err.message);
      setNeighborData([]);
    } finally {
      setNeighborLoading(false);
    }
  };

  // Обогащённые данные соседей (с моделью, комплектацией и текущим расположением)
  const enrichedNeighborData = useMemo(() => {
    return neighborData.map(item => {
      const loc = neighborLocations[item.vin];
      const details = neighborModelComplect[item.vin] || {};
      let currentZone = '-';
      if (loc) {
        if (loc.isInStorage) currentZone = loc.storageString;
        else if (loc.isSold) currentZone = 'Продан';
        else currentZone = loc.checkpoint || '-';
      }
      return {
        ...item,
        current_zone: currentZone,
        model: details.model || '-',
        material_desc: details.material_desc || '-',
      };
    });
  }, [neighborData, neighborLocations, neighborModelComplect]);

  // Уникальные значения для фильтров соседей
  const getNeighborUniqueValues = (column) => {
    const values = [...new Set(enrichedNeighborData.map(d => d[column]).filter(v => v !== null && v !== undefined && v !== ''))];
    return values.sort();
  };

  // Обработчики фильтров соседей
  const handleNeighborFilterHeaderClick = (column, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setNeighborFilterDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setActiveNeighborFilterColumn(activeNeighborFilterColumn === column ? null : column);
  };

  const handleNeighborFilterToggle = (column, value) => {
    setNeighborFilters(prev => {
      const currentValues = prev[column] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      const newFilters = { ...prev };
      if (newValues.length > 0) newFilters[column] = newValues;
      else delete newFilters[column];
      return newFilters;
    });
  };

  const handleNeighborFilterClear = (column) => {
    setNeighborFilters(prev => {
      const newPrev = { ...prev };
      delete newPrev[column];
      return newPrev;
    });
    setActiveNeighborFilterColumn(null);
  };

  // Отфильтрованные данные соседей
  const filteredNeighborData = useMemo(() => {
    let result = enrichedNeighborData;
    if (Object.keys(neighborFilters).length === 0) return result;
    return result.filter(row => {
      for (const [column, selectedValues] of Object.entries(neighborFilters)) {
        if (selectedValues.length > 0 && !selectedValues.includes(row[column])) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedNeighborData, neighborFilters]);

  const exportNeighborsToExcel = () => {
    if (!filteredNeighborData.length) return;
    const exportData = filteredNeighborData.map(item => ({
      'VIN': item.vin,
      [`Время ${neighborCheckpoint}`]: formatDateTime(item.point_time || item.trim_in || item.creation_time || item.in_storage_time || item.out_storage_time),
      'Текущее расположение': item.current_zone,
      'Модель': item.model,
      'Комплектация': item.material_desc,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Соседи');
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }];
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Соседи_${neighborCheckpoint}_${dateStr}.xlsx`);
  };

  const exportNeighborsToHolds = () => {
    if (!filteredNeighborData.length) return;

    const afterCP8 = [];
    const beforeCP8 = [];

    filteredNeighborData.forEach(item => {
      const locationStr = item.current_zone;
      const rowData = {
        'VIN': item.vin,
        'Текущее расположение': locationStr,
        'Модель': item.model,
        'Комплектация': item.material_desc,
      };

      const isAfter = locationStr === 'CP8' || locationStr === 'Продан' || locationStr.includes('-'); // склад
      if (isAfter) {
        afterCP8.push(rowData);
      } else {
        beforeCP8.push(rowData);
      }
    });

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (afterCP8.length > 0) {
      const ws = XLSX.utils.json_to_sheet(afterCP8);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'После CP8');
      XLSX.writeFile(wb, `Холды_После_CP8_${dateStr}.xlsx`);
    }

    if (beforeCP8.length > 0) {
      const ws = XLSX.utils.json_to_sheet(beforeCP8);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'До CP8');
      XLSX.writeFile(wb, `Холды_До_CP8_${dateStr}.xlsx`);
    }
  };

  const openExportModal = async () => {
    setShowExportModal(true);
    setExportReasonLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sgp-management-reasons`);
      if (res.ok) {
        const reasons = await res.json();
        setExportReasons(reasons);
      }
    } catch (err) {
      console.error('Ошибка загрузки причин:', err);
    } finally {
      setExportReasonLoading(false);
    }
  };

  const closeExportModal = () => {
    setShowExportModal(false);
    setSelectedReason('');
    setCustomReason('');
    setExportSearch('');
  };

  const handleSelectReason = (reason) => {
    setSelectedReason(reason);
    setCustomReason('');
  };

  const handleCustomReasonChange = (e) => {
    const val = e.target.value;
    setCustomReason(val);
    if (val) setSelectedReason('');
  };

  const filteredReasons = useMemo(() => {
    if (!exportSearch.trim()) return exportReasons;
    return exportReasons.filter(r => r.toLowerCase().includes(exportSearch.toLowerCase()));
  }, [exportReasons, exportSearch]);

  const handleExportToHoldsWithReason = () => {
    const finalReason = selectedReason || customReason;
    if (!finalReason) return;

    const exportData = timePointsData.map(v => ({
      'VIN': v.vin,
      'Причина': finalReason,
      'FE130': 'FE130',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Холды');
    ws['!cols'] = [
      { wch: 20 },
      { wch: 60 },
      { wch: 15 },
    ];

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Холды_${dateStr}.xlsx`);
    closeExportModal();
  };

  const timePointColumns = [
    { key: 'vin', label: 'VIN', filterable: true },
    { key: 'material_code', label: 'Material Code', filterable: true },
    { key: 'sequence_number', label: 'Sequence', filterable: true },
    { key: 'batch_num', label: 'Batch Number', filterable: true },
    { key: 'kd_material_no', label: 'KD', filterable: true },
    { key: 'model', label: 'Model', filterable: true },
    { key: 'material_desc', label: 'Комплектация', filterable: true },
    { key: 'storage_location', label: 'Складская локация', filterable: true },
    { key: 'colour', label: 'Цвет', filterable: true },
    { key: 'location', label: 'Расположение', filterable: true },
    { key: 'CP5', label: 'CP5', isTime: true },
    { key: 'CP6', label: 'CP6', isTime: true },
    { key: 'TRIMIN', label: 'TRIMIN', isTime: true },
    { key: 'CP7', label: 'CP7', isTime: true },
    { key: 'CP72', label: 'CP72', isTime: true },
    { key: 'TLWA', label: 'TLWA', isTime: true },
    { key: 'TLRT', label: 'TLRT', isTime: true },
    { key: 'TLADAS', label: 'TLADAS', isTime: true },
    { key: 'TLTT', label: 'TLTT', isTime: true },
    { key: 'CPFINAL', label: 'CPFINAL', isTime: true },
    { key: 'CP8', label: 'CP8', isTime: true },
    { key: 'in_storage_time', label: 'Inbound', isTime: true },
    { key: 'out_storage_time', label: 'Outbound', isTime: true },
  ];

  const leftTimeFilters = [
    { label: 'CP5', fromKey: 'cp5From', toKey: 'cp5To' },
    { label: 'CP6', fromKey: 'cp6From', toKey: 'cp6To' },
    { label: 'TRIMIN', fromKey: 'trimInFrom', toKey: 'trimInTo' },
    { label: 'CP7', fromKey: 'cp7From', toKey: 'cp7To' },
    { label: 'CP72', fromKey: 'cp72From', toKey: 'cp72To' },
    { label: 'TLWA', fromKey: 'tlwaFrom', toKey: 'tlwaTo' },
    { label: 'TLRT', fromKey: 'tlrtFrom', toKey: 'tlrtTo' },
  ];

  const rightTimeFilters = [
    { label: 'TLADAS', fromKey: 'tladasFrom', toKey: 'tladasTo' },
    { label: 'TLTT', fromKey: 'tlttFrom', toKey: 'tlttTo' },
    { label: 'CPFINAL', fromKey: 'cpFinalFrom', toKey: 'cpFinalTo' },
    { label: 'CP8', fromKey: 'cp8From', toKey: 'cp8To' },
    { label: 'Inbound', fromKey: 'inboundFrom', toKey: 'inboundTo' },
    { label: 'Outbound', fromKey: 'outboundFrom', toKey: 'outboundTo' },
  ];

  const leftBufferTimeFilters = [
    { label: 'CP72', fromKey: 'cp72From', toKey: 'cp72To' },
    { label: 'ADAS', fromKey: 'tladasFrom', toKey: 'tladasTo' },
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
        <input
          type="datetime-local"
          value={filtersState[fromKey] || ''}
          onChange={(e) => setFiltersState(prev => ({ ...prev, [fromKey]: e.target.value }))}
          style={{ ...inputStyle, fontSize: 10, padding: '4px 6px', width: '100%' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>По</span>
        <input
          type="datetime-local"
          value={filtersState[toKey] || ''}
          onChange={(e) => setFiltersState(prev => ({ ...prev, [toKey]: e.target.value }))}
          style={{ ...inputStyle, fontSize: 10, padding: '4px 6px', width: '100%' }}
        />
      </div>
    </div>
  );

  const handleVinSearch = () => {
    const tokens = parseVinList(vinSearch);
    if (tokens.length === 0) {
      setIsVinMode(false);
      return;
    }
    setIsVinMode(true);
    setStartDate(''); setEndDate('');
    setCpModel('ALL');
    loadStorageByVin(tokens);
  };

  const handleVinReset = () => {
    setVinSearch('');
    setIsVinMode(false);
    setCpData([]);
    setCpLocations({});
  };

  const isFilterDisabled = isVinMode;

  const loadStorageByVin = async (tokens) => {
    setCpLoading(true);
    setCpError(null);
    try {
      const storageMap = await fetchStorageLocations(tokens);
      const modelsMap = await fetchModels(tokens);
      const locMap = await fetchCurrentLocations(tokens);

      const rowData = tokens.map(token => {
        let fullVin = token;
        
        const findFullVin = (map) => Object.keys(map).find(k => k === token || (token.length === 6 && k.endsWith(token)));
        
        const locKey = findFullVin(locMap);
        const storageKey = findFullVin(storageMap);
        const modelKey = findFullVin(modelsMap);

        if (locKey) fullVin = locKey;
        else if (storageKey) fullVin = storageKey;
        else if (modelKey) fullVin = modelKey;

        const s = storageKey ? storageMap[storageKey] : {};
        const modelFromMap = modelKey ? modelsMap[modelKey] : null;
        const modelFromStorage = s.Модель && s.Модель !== '-' ? s.Модель : '-';
        
        let displayLocation = '-';
        const loc = locKey ? locMap[locKey] : null;
        if (loc) {
          if (loc.isInStorage) displayLocation = 'На складе';
          else if (loc.isSold) displayLocation = 'Продан';
          else displayLocation = loc.checkpoint || '-';
        }

        return {
          VIN: fullVin,
          Модель: modelFromMap || modelFromStorage,
          Склад: s.Склад || '-',
          Локация: s.Локация || '-',
          Ячейка: s.Ячейка || '-',
          'Результат проверки': '',
          'Текущее расположение': displayLocation
        };
      });

      const cleanedData = rowData.map(row => {
        const newRow = { ...row };
        Object.keys(newRow).forEach(key => {
          if (newRow[key] === 'N/A') newRow[key] = '-';
        });
        return newRow;
      });

      setCpData(cleanedData);
      setCpLocations(locMap);
    } catch (err) {
      setCpError(err.message);
    } finally {
      setCpLoading(false);
    }
  };

  const runAudit = async () => {
    if (isVinMode) return;
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) return;
    setCpLoading(true);
    setCpError(null);
    setCpPage(0);
    const startDateTime = `${startDate} ${startTime || '00:00'}:00`;
    const endDateTime = `${endDate} ${endTime || '23:59'}:59`;
    try {
      const vinsParams = new URLSearchParams({
        checkpoint: selectedCp,
        dateFrom: startDateTime,
        dateTo: endDateTime,
      });
      if (cpModel !== 'ALL') vinsParams.append('model', cpModel);
      const vinsRes = await fetch(`${API_BASE}/api/sgp-audit-vins?${vinsParams.toString()}`);
      if (!vinsRes.ok) throw new Error(`Ошибка получения VIN: ${vinsRes.status}`);
      const vins = await vinsRes.json();
      if (!vins.length) { setCpData([]); setCpLocations({}); return; }

      const storageMap = await fetchStorageLocations(vins);
      const modelsMap = await fetchModels(vins);

      const tableData = vins.map(vin => {
        const s = storageMap[vin] || {};
        const modelFromMap = modelsMap[vin];
        const modelFromStorage = s.Модель && s.Модель !== '-' ? s.Модель : '-';
        return {
          VIN: vin,
          Модель: modelFromMap || modelFromStorage,
          Склад: s.Склад || '-',
          Локация: s.Локация || '-',
          Ячейка: s.Ячейка || '-',
          'Результат проверки': '',
        };
      });

      const cleanedData = tableData.map(row => {
        const newRow = { ...row };
        Object.keys(newRow).forEach(key => {
          if (newRow[key] === 'N/A') newRow[key] = '-';
        });
        return newRow;
      });

      setCpData(cleanedData);

      const validVins = vins.filter(v => v && v !== 'N/A');
      const locInfo = await fetchCurrentLocations(validVins);
      setCpLocations(locInfo);
    } catch (err) { setCpError(err.message); } finally { setCpLoading(false); }
  };

  const handleFileUpload = async (e) => {
  };

  const loadAnalytics = async () => {
  };

  useEffect(() => {
    if (activeTab === 'analytics' && auditStartDate && auditEndDate) { loadAnalytics(); }
  }, [auditStartDate, auditEndDate, auditModel, auditResultFilter, activeTab]);

  const exportExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
  };

  const exportTimePointsToExcel = () => {
    if (!filteredTimePointsData.length) return;

    const headers = timePointColumns.flatMap(col =>
      col.isTime ? [`${col.label} Дата`, `${col.label} Время`] : [col.label]
    );

    const aoa = [headers];

    filteredTimePointsData.forEach(row => {
      const line = [];
      timePointColumns.forEach(col => {
        if (col.isTime) {
          const raw = row[col.key];
          const dt = raw ? new Date(raw) : null;
          const valid = dt && !isNaN(dt.getTime());

          line.push(valid
            ? { v: dt, t: 'd', z: 'dd.mm.yyyy' }
            : { v: '', t: 's' });

          line.push(valid
            ? { v: dt, t: 'd', z: 'hh:mm' }
            : { v: '', t: 's' });
        } else {
          line.push(row[col.key] != null ? row[col.key] : '');
        }
      });
      aoa.push(line);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(12, String(h).length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Points');

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `time_points_${dateStr}.xlsx`);
  };

  const exportWord = (data, filename) => {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${tableToHtml(data)}</body></html>`;
    saveAs(new Blob([htmlContent], { type: 'application/msword' }), `${filename}.doc`);
  };

  const renderCpSelector = (selected, setSelected) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
      {cpNames.map((cp, idx) => {
        const isActive = selected === cp.value;
        return (
          <React.Fragment key={cp.value}>
            <button
              onClick={() => setSelected(cp.value)}
              disabled={isFilterDisabled}
              style={{
                flex: '1 1 0',
                maxWidth: 140,
                padding: '12px 0',
                borderRadius: 12,
                border: isActive ? '2px solid #2563EB' : '1px solid #E5E7EB',
                background: isActive ? '#2563EB' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#374151',
                fontWeight: 600,
                fontSize: 14,
                cursor: isFilterDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 10px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                opacity: isFilterDisabled ? 0.6 : 1,
              }}
            >
              {cp.label}
            </button>
            {idx < cpNames.length - 1 && (
              <div style={{ height: 2, width: 20, backgroundColor: '#CBD5E1', margin: '0 4px', borderRadius: 1 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const thStyle = {
    padding: '12px 14px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '2px solid #E5E7EB',
    background: '#F9FAFB',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
  };

  const tdStyle = {
    padding: '10px 14px',
    borderBottom: '1px solid #F0F0F5',
    color: '#1F2937',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ color: '#1F2937', fontSize: 28, fontWeight: 700, marginBottom: 35, letterSpacing: '-0.5px' }}>
        Управление холдами
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
        <button 
          onClick={() => setActiveTab('checkpoints')} 
          style={{
            padding: '10px 28px',
            borderRadius: 10,
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            background: '#2563EB',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            transition: 'all 0.2s',
          }}
        >
          До СР8
        </button>
        <button 
          onClick={() => navigate('/sgp-management')} 
          style={{
            padding: '10px 28px',
            borderRadius: 10,
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            background: '#F3F4F6',
            color: '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          После СР8
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 30, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('checkpoints')} style={tabStyle(activeTab === 'checkpoints')}>
          Аудит авто Цеха Сборки
        </button>
        <button onClick={() => setActiveTab('timepoints')} style={tabStyle(activeTab === 'timepoints')}>
          Время прохождения точек
        </button>
        <button onClick={() => setActiveTab('neighbors')} style={tabStyle(activeTab === 'neighbors')}>
          Соседи по точке
        </button>
        <button onClick={() => setActiveTab('buffer')} style={tabStyle(activeTab === 'buffer')}>
          Buffer Status Report
        </button>
      </div>

      {activeTab === 'timepoints' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>
              ⏱️ Время прохождения точек
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={{ ...buttonStyle, background: '#059669' }} onClick={exportTimePointsToExcel}>
                📊 Excel
              </button>
              <button style={{ ...buttonStyle, background: '#F59E0B' }} onClick={openExportModal}>
                📥 Экспорт на холды
              </button>
              <button style={{ ...buttonStyle, background: '#9CA3AF' }} onClick={handleTpClear}>
                ✕ Очистить фильтры
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ ...labelStyle, alignItems: 'flex-start', paddingTop: 10 }}>
              🔍 VIN:
              <textarea
                value={tpVinSearch}
                onChange={(e) => setTpVinSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); loadTimePoints(); } }}
                placeholder="Вставьте VIN (через запятую, пробел или с новой строки)..."
                style={{ ...textareaStyle, width: 350 }}
              />
            </label>
            <button style={{ ...buttonStyle, marginTop: 10 }} onClick={loadTimePoints}>
              Найти
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 10, 
            marginBottom: 20,
            padding: 16,
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {leftTimeFilters.map(filter => (
                <React.Fragment key={filter.label}>
                  {renderTimeFilter(filter, tpFilters, setTpFilters)}
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rightTimeFilters.map(filter => (
                <React.Fragment key={filter.label}>
                  {renderTimeFilter(filter, tpFilters, setTpFilters)}
                </React.Fragment>
              ))}
            </div>
          </div>

          {timePointsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              <style>{loadingAnimation}</style>
              <div className="loading-dots" style={{ display: 'inline-block' }}>
                <span>Загрузка данных</span>
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          ) : timePointsError ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#DC2626' }}>❌ {timePointsError}</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 550px)', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 2800 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      {timePointColumns.map(col => (
                        <th 
                          key={col.key} 
                          style={{ 
                            padding: '10px 8px', 
                            textAlign: 'left', 
                            fontWeight: 700, 
                            color: '#374151', 
                            borderBottom: '2px solid #E5E7EB',
                            whiteSpace: 'nowrap',
                            position: 'sticky',
                            top: 0,
                            background: tpFilters[col.key]?.length > 0 ? '#DBEAFE' : '#F9FAFB',
                            zIndex: 10,
                            fontSize: 11,
                            cursor: col.filterable ? 'pointer' : 'default',
                          }}
                          onClick={col.filterable ? (e) => handleFilterHeaderClick(col.key, e) : undefined}
                        >
                          {col.label}
                          {tpFilters[col.key]?.length > 0 && ` (${tpFilters[col.key].length})`}
                          {col.filterable && ' ▼'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timePointsData.length > 0 ? (
                      timePointsData.slice(timePointsPage * timePointsPageSize, (timePointsPage + 1) * timePointsPageSize).map((vehicle, idx) => (
                        <tr 
                          key={vehicle.vin}
                          style={{ 
                            backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEF2FF'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}
                        >
                          {timePointColumns.map(col => (
                            <td key={col.key} style={{ padding: '8px', borderBottom: '1px solid #F0F0F5', fontSize: 10, whiteSpace: 'nowrap' }}>
                              {col.isTime ? formatShortDateTime(vehicle[col.key]) : (vehicle[col.key] || '-')}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={timePointColumns.length} style={{ textAlign: 'center', padding: 30, color: '#6B7280', fontSize: 14 }}>
                          Нет данных по выбранным фильтрам
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {timePointsData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 14, color: '#6B7280' }}>Всего записей: {timePointsData.length}</span>
                  {Math.ceil(timePointsData.length / timePointsPageSize) > 1 && (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <button 
                        onClick={() => setTimePointsPage(p => Math.max(0, p - 1))} 
                        disabled={timePointsPage === 0} 
                        style={{ ...buttonStyle, background: '#9CA3AF' }}
                      >
                        ← Назад
                      </button>
                      <span style={{ fontWeight: 500 }}>{timePointsPage + 1} / {Math.ceil(timePointsData.length / timePointsPageSize)}</span>
                      <button 
                        onClick={() => setTimePointsPage(p => Math.min(Math.ceil(timePointsData.length / timePointsPageSize) - 1, p + 1))} 
                        disabled={timePointsPage === Math.ceil(timePointsData.length / timePointsPageSize) - 1} 
                        style={{ ...buttonStyle, background: '#9CA3AF' }}
                      >
                        Вперёд →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeFilterColumn && allTimePointsData.length > 0 && (
            <div 
              className="filter-dropdown"
              style={{
                ...filterDropdownStyle,
                top: filterDropdownPos.top,
                left: filterDropdownPos.left,
              }}
            >
              <div 
                style={{ ...filterOptionStyle, fontWeight: 700, borderBottom: '1px solid #E5E7EB', marginBottom: 4 }}
                onClick={() => handleFilterClear(activeFilterColumn)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ✕ Очистить фильтр
              </div>
              {getUniqueValues(activeFilterColumn).map(val => {
                const isChecked = tpFilters[activeFilterColumn]?.includes(val);
                return (
                  <div 
                    key={val}
                    style={{
                      ...filterOptionStyle,
                      background: isChecked ? '#EFF6FF' : 'transparent',
                    }}
                    onClick={() => handleFilterToggle(activeFilterColumn, val)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isChecked ? '#EFF6FF' : 'transparent'}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      readOnly
                    />
                    {val}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'neighbors' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>
              🚗 Соседи по точке
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button 
                style={{ ...buttonStyle, background: '#F59E0B' }} 
                onClick={exportNeighborsToHolds}
              >
                📥 Экспорт на холд
              </button>
              <button style={{ ...buttonStyle, background: '#059669' }} onClick={exportNeighborsToExcel}>
                📊 Экспорт Excel
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, alignItems: 'center' }}>
            <label style={labelStyle}>
              Точка:
              <select
                value={neighborCheckpoint}
                onChange={(e) => setNeighborCheckpoint(e.target.value)}
                style={{ ...inputStyle, minWidth: 120 }}
              >
                {neighborPointOptions.map(point => (
                  <option key={point} value={point}>{point}</option>
                ))}
              </select>
            </label>
            <label style={{ ...labelStyle, minWidth: 200 }}>
              VIN:
              <input
                type="text"
                value={neighborVin}
                onChange={(e) => setNeighborVin(e.target.value)}
                placeholder="Введите VIN..."
                style={{ ...inputStyle, flex: 1 }}
              />
            </label>
            <label style={labelStyle}>
              До (кол-во):
              <input
                type="number"
                min="0"
                value={neighborLimitBefore}
                onChange={(e) => setNeighborLimitBefore(parseInt(e.target.value, 10) || 0)}
                style={{ ...inputStyle, width: 80 }}
              />
            </label>
            <label style={labelStyle}>
              После (кол-во):
              <input
                type="number"
                min="0"
                value={neighborLimitAfter}
                onChange={(e) => setNeighborLimitAfter(parseInt(e.target.value, 10) || 0)}
                style={{ ...inputStyle, width: 80 }}
              />
            </label>
            <button style={buttonStyle} onClick={loadNeighbors} disabled={!neighborVin.trim() || neighborLoading}>
              {neighborLoading ? '⏳ Загрузка...' : '🔍 Найти соседей'}
            </button>
          </div>

          {neighborError && <p style={{ color: '#DC2626', marginBottom: 16 }}>❌ {neighborError}</p>}
          {neighborTargetTime && (
            <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 16 }}>
              Время {neighborCheckpoint} для заданного VIN: <strong>{formatDateTime(neighborTargetTime)}</strong>
            </p>
          )}

          {neighborLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              <style>{loadingAnimation}</style>
              <div className="loading-dots" style={{ display: 'inline-block' }}>
                <span>Загрузка данных</span>
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          ) : filteredNeighborData.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', maxHeight: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={{ ...thStyle, position: 'sticky', top: 0 }}>VIN</th>
                    <th style={{ ...thStyle, position: 'sticky', top: 0 }}>Время {neighborCheckpoint}</th>
                    <th 
                      style={{ ...thStyle, position: 'sticky', top: 0, cursor: 'pointer', background: neighborFilters.current_zone?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                      onClick={(e) => handleNeighborFilterHeaderClick('current_zone', e)}
                    >
                      Текущее расположение {neighborFilters.current_zone?.length > 0 && `(${neighborFilters.current_zone.length})`} ▼
                    </th>
                    <th 
                      style={{ ...thStyle, position: 'sticky', top: 0, cursor: 'pointer', background: neighborFilters.model?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                      onClick={(e) => handleNeighborFilterHeaderClick('model', e)}
                    >
                      Модель {neighborFilters.model?.length > 0 && `(${neighborFilters.model.length})`} ▼
                    </th>
                    <th 
                      style={{ ...thStyle, position: 'sticky', top: 0, cursor: 'pointer', background: neighborFilters.material_desc?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                      onClick={(e) => handleNeighborFilterHeaderClick('material_desc', e)}
                    >
                      Комплектация {neighborFilters.material_desc?.length > 0 && `(${neighborFilters.material_desc.length})`} ▼
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNeighborData.map((item, idx) => {
                    const isTarget = item.vin === neighborVin;
                    return (
                      <tr 
                        key={idx} 
                        style={{ 
                          backgroundColor: isTarget ? '#DCFCE7' : (idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'),
                        }}
                      >
                        <td style={tdStyle}>{item.vin}</td>
                        <td style={tdStyle}>
                          {formatDateTime(item.point_time || item.trim_in || item.creation_time || item.in_storage_time || item.out_storage_time)}
                        </td>
                        <td style={tdStyle}>{item.current_zone}</td>
                        <td style={tdStyle}>{item.model}</td>
                        <td style={tdStyle}>{item.material_desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            !neighborLoading && !neighborError && (
              <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
                Введите VIN, выберите точку и нажмите «Найти соседей»
              </div>
            )
          )}

          {activeNeighborFilterColumn && enrichedNeighborData.length > 0 && (
            <div 
              className="filter-dropdown"
              style={{
                ...filterDropdownStyle,
                top: neighborFilterDropdownPos.top,
                left: neighborFilterDropdownPos.left,
              }}
            >
              <div 
                style={{ ...filterOptionStyle, fontWeight: 700, borderBottom: '1px solid #E5E7EB', marginBottom: 4 }}
                onClick={() => handleNeighborFilterClear(activeNeighborFilterColumn)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ✕ Очистить фильтр
              </div>
              {getNeighborUniqueValues(activeNeighborFilterColumn).map(val => {
                const isChecked = neighborFilters[activeNeighborFilterColumn]?.includes(val);
                return (
                  <div 
                    key={val}
                    style={{
                      ...filterOptionStyle,
                      background: isChecked ? '#EFF6FF' : 'transparent',
                    }}
                    onClick={() => handleNeighborFilterToggle(activeNeighborFilterColumn, val)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isChecked ? '#EFF6FF' : 'transparent'}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      readOnly
                    />
                    {val}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'buffer' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>
              🚗 Buffer Status Report
            </h2>
            <button style={{ ...buttonStyle, background: '#059669' }} onClick={exportBufferToExcel}>
              📊 Экспорт Excel
            </button>
          </div>

          {bufferLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              <style>{loadingAnimation}</style>
              <div className="loading-dots" style={{ display: 'inline-block' }}>
                <span>Загрузка данных</span>
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          ) : bufferError ? (
            <div style={{ color: '#DC2626', textAlign: 'center', padding: 40 }}>❌ {bufferError}</div>
          ) : (
            <>
              {/* ФИЛЬТРЫ ВЕРХНИЕ */}
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

                  <label style={{ fontSize: 14, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    Модель:
                    <select value={bufferChartModel} onChange={e => setBufferChartModel(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB' }}>
                      {bufferAvailableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {/* ЗАГОЛОВОК ГРАФИКОВ ПОТОКА */}
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                Поток: График новых непринятых автомобилей (по дате CP8)
              </div>

              {/* ГРАФИКИ ПОТОКА */}
              {bufferChartPeriod === 'all' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, marginBottom: 40, alignItems: 'start' }}>
                  {renderBufferTrendChart('📅 Не принято (3 месяца)', bufferChartsData.flowMonths, '#60A5FA')}
                  {renderBufferTrendChart('📆 Не принято (4 недели)', bufferChartsData.flowWeeks, '#34D399')}
                  {renderBufferTrendChart('📊 Не принято (14 дней)', bufferChartsData.flowDays, '#FBBF24')}
                </div>
              ) : (
                <div style={{ marginBottom: 40 }}>
                  {renderBufferTrendChart(`📊 Выбранный период (${bufferChartPeriod === 'year' ? 'Год' : bufferChartPeriod === 'month' ? 'Месяц' : bufferChartPeriod === 'week' ? 'Неделя' : 'День'})`, bufferChartsData.flowDays, '#FBBF24')}
                </div>
              )}

              {/* ЗАГОЛОВОК ГРАФИКОВ ОСТАТКА */}
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                Остаток: Общее количество автомобилей в буфере на конец периода
              </div>

              {/* ГРАФИКИ ОСТАТКА */}
              {bufferChartPeriod === 'all' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, marginBottom: 30, alignItems: 'start' }}>
                  {renderBufferTrendChart('📅 Остаток (3 месяца)', bufferChartsData.stockMonths, '#A78BFA')}
                  {renderBufferTrendChart('📆 Остаток (4 недели)', bufferChartsData.stockWeeks, '#F472B6')}
                  {renderBufferTrendChart('📊 Остаток (14 дней)', bufferChartsData.stockDays, '#FB923C')}
                </div>
              ) : (
                <div style={{ marginBottom: 30 }}>
                  {renderBufferTrendChart(`📊 Остаток за период (${bufferChartPeriod === 'year' ? 'Год' : bufferChartPeriod === 'month' ? 'Месяц' : bufferChartPeriod === 'week' ? 'Неделя' : 'День'})`, bufferChartsData.stockDays, '#FB923C')}
                </div>
              )}

              {/* ФИЛЬТРЫ ВРЕМЕНИ */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 10, 
                marginBottom: 20,
                padding: 16,
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leftBufferTimeFilters.map(filter => (
                    <React.Fragment key={filter.label}>
                      {renderTimeFilter(filter, bufferTimeFilters, setBufferTimeFilters)}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rightBufferTimeFilters.map(filter => (
                    <React.Fragment key={filter.label}>
                      {renderTimeFilter(filter, bufferTimeFilters, setBufferTimeFilters)}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* ИНДИКАТОР АКТИВНЫХ ФИЛЬТРОВ */}
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

              {/* ФИЛЬТРЫ ТАБЛИЦЫ */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                <label style={labelStyle}>
                  Критерий потеряшки:
                  <select value={bufferCriterionFilter} onChange={e => setBufferCriterionFilter(e.target.value)} style={inputStyle}>
                    <option value="ALL">Все</option>
                    <option value="Принято">Принято</option>
                    <option value="Не принято">Не принято</option>
                    <option value="Ожидает CP8">Ожидает CP8</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Статус блокировки:
                  <select value={bufferBlockFilter} onChange={e => setBufferBlockFilter(e.target.value)} style={inputStyle}>
                    <option value="ALL">Все</option>
                    <option value="Блок">Блок</option>
                    <option value="Не блок">Не блок</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Модель авто:
                  <select value={bufferModelFilter} onChange={e => setBufferModelFilter(e.target.value)} style={inputStyle}>
                    {bufferAvailableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                  </select>
                </label>
              </div>

              {/* ТАБЛИЦА */}
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', maxHeight: 'calc(100vh - 400px)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1300 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      {/* VIN - БЕЗ ТРЕУГОЛЬНИКА */}
                      <th style={thStyle}>VIN</th>
                      
                      {/* Модель - БЕЗ ТРЕУГОЛЬНИКА */}
                      <th style={thStyle}>Модель</th>

                      {/* Остальные - С ТРЕУГОЛЬНИКАМИ */}
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('cp72_time')}>
                        Дата CP72
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'cp72_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'cp72_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('adas_time')}>
                        Дата ADAS
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'adas_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'adas_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('tltt_time')}>
                        Дата TLTT
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'tltt_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'tltt_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('cp8_time')}>
                        Дата CP8
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'cp8_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'cp8_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('in_storage_time')}>
                        Постановка на СГП
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'in_storage_time' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'in_storage_time' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>

                      {/* Критерий - БЕЗ ТРЕУГОЛЬНИКА */}
                      <th style={thStyle}>Критерий потеряшки</th>

                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('diff_cp8_sgp')}>
                        Время CP8 → СГП
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'diff_cp8_sgp' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'diff_cp8_sgp' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('diff_cp8_cp72')}>
                        Время CP8 → CP72
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'diff_cp8_cp72' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'diff_cp8_cp72' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>
                      <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleBufferSort('block_status')}>
                        Статус блокировки
                        <span style={{ marginLeft: 4, color: bufferSort.column === 'block_status' ? '#2563EB' : '#D1D5DB', fontSize: 10 }}>
                          {bufferSort.column === 'block_status' ? (bufferSort.direction === 'asc' ? '▲' : '▼') : '▼'}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBufferData.length > 0 ? (
                      filteredBufferData.slice(bufferPage * bufferPageSize, (bufferPage + 1) * bufferPageSize).map((item, idx) => (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                          <td style={tdStyle}>{item.vin}</td>
                          <td style={tdStyle}>{item.model}</td>
                          <td style={tdStyle}>{formatDateTime(item.cp72_time)}</td>
                          <td style={tdStyle}>{formatDateTime(item.adas_time)}</td>
                          <td style={tdStyle}>{formatDateTime(item.tltt_time)}</td>
                          <td style={tdStyle}>{formatDateTime(item.cp8_time)}</td>
                          <td style={tdStyle}>{formatDateTime(item.in_storage_time)}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: item.criterion === 'Не принято' ? '#DC2626' : (item.criterion === 'Принято' ? '#059669' : '#9CA3AF') }}>
                            {item.criterion}
                          </td>
                          <td style={tdStyle}>{formatTimeDiff(item.in_storage_time, item.cp8_time)}</td>
                          <td style={tdStyle}>{formatTimeDiff(item.cp8_time, item.cp72_time)}</td>
                          <td 
                            style={{ 
                              ...tdStyle, 
                              color: item.block_status.startsWith('Блок') ? '#DC2626' : '#1F2937', 
                              cursor: item.block_status.startsWith('Блок') ? 'pointer' : 'default', 
                              textDecoration: item.block_status.startsWith('Блок') ? 'underline' : 'none',
                              fontWeight: item.block_status.startsWith('Блок') ? 700 : 400
                            }}
                            onClick={() => item.block_status.startsWith('Блок') && openBlockReasons(item.vin)}
                            title={item.block_status.startsWith('Блок') ? 'Нажмите, чтобы посмотреть причины' : ''}
                          >
                            {item.block_status}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: 30 }}>
                          Нет данных по выбранным фильтрам
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ПАГИНАЦИЯ */}
              {filteredBufferData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 14, color: '#6B7280' }}>Всего записей: {filteredBufferData.length}</span>
                  {Math.ceil(filteredBufferData.length / bufferPageSize) > 1 && (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <button 
                        onClick={() => setBufferPage(p => Math.max(0, p - 1))} 
                        disabled={bufferPage === 0} 
                        style={{ ...buttonStyle, background: '#9CA3AF' }}
                      >
                        ← Назад
                      </button>
                      <span style={{ fontWeight: 500 }}>{bufferPage + 1} / {Math.ceil(filteredBufferData.length / bufferPageSize)}</span>
                      <button 
                        onClick={() => setBufferPage(p => Math.min(Math.ceil(filteredBufferData.length / bufferPageSize) - 1, p + 1))} 
                        disabled={bufferPage === Math.ceil(filteredBufferData.length / bufferPageSize) - 1} 
                        style={{ ...buttonStyle, background: '#9CA3AF' }}
                      >
                        Вперёд →
                      </button>
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
              <label style={{ ...labelStyle, alignItems: 'flex-start', paddingTop: 10 }}>
                🔍 VIN:
                <textarea
                  value={vinSearch}
                  onChange={(e) => setVinSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleVinSearch(); } }}
                  placeholder="Вставьте VIN (через запятую, пробел или с новой строки)..."
                  style={{ ...textareaStyle, width: 350 }}
                  disabled={isVinMode && !vinSearch}
                />
              </label>
              <button
                onClick={handleVinSearch}
                disabled={!vinSearch.trim()}
                style={{
                  ...buttonStyle,
                  marginTop: 10,
                  opacity: vinSearch.trim() ? 1 : 0.6,
                  pointerEvents: vinSearch.trim() ? 'auto' : 'none',
                }}
              >
                Найти
              </button>
              {isVinMode && (
                <button
                  onClick={handleVinReset}
                  style={{ ...buttonStyle, background: '#9CA3AF', marginTop: 10 }}
                >
                  ✕ Сбросить
                </button>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#EEF2FF', padding: '4px 12px', borderRadius: 6, color: '#2563EB', fontSize: 16 }}>📦</span>
              Аудит авто Цеха Сборки
            </h2>
            {renderCpSelector(selectedCp, setSelectedCp)}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <label style={labelStyle}>
                <span style={{ whiteSpace: 'nowrap' }}>Начало периода</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} disabled={isFilterDisabled} />
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...inputStyle, width: '90px' }} disabled={isFilterDisabled} />
              </label>
              <label style={labelStyle}>
                <span style={{ whiteSpace: 'nowrap' }}>Конец периода</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} disabled={isFilterDisabled} />
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...inputStyle, width: '90px' }} disabled={isFilterDisabled} />
              </label>
              <label style={labelStyle}>
                Модель
                <select value={cpModel} onChange={e => setCpModel(e.target.value)} style={inputStyle} disabled={isFilterDisabled}>
                  {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                </select>
              </label>
              <button
                onClick={runAudit}
                disabled={isFilterDisabled || !startDate || !endDate || cpLoading}
                style={{
                  ...buttonStyle,
                  opacity: !isFilterDisabled && startDate && endDate && !cpLoading ? 1 : 0.6,
                  pointerEvents: !isFilterDisabled && startDate && endDate && !cpLoading ? 'auto' : 'none',
                  background: !isFilterDisabled && startDate && endDate && !cpLoading ? '#2563EB' : '#9CA3AF',
                }}
              >
                {cpLoading ? '⏳ Загрузка...' : '▶ Загрузить аудит'}
              </button>
            </div>
            {endDate && new Date(endDate) < new Date(startDate) && (
              <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>Конечная дата не может быть раньше начальной</p>
            )}
            {cpError && <p style={{ color: '#DC2626', marginTop: 18 }}>❌ Ошибка: {cpError}</p>}
            {cpData.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>Найдено записей: {cpData.length}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => exportExcel(cpData, 'аудит_хранение')} style={{ ...buttonStyle, background: '#059669' }}>📊 Excel</button>
                    <button onClick={() => exportWord(cpData, 'аудит_хранение')} style={{ ...buttonStyle, background: '#7C3AED' }}>📄 Word</button>
                  </div>
                </div>
                <div style={{ borderRadius: 10, overflowX: 'auto', border: '1px solid #E5E7EB' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        {Object.keys(cpData[0]).filter(k => k !== 'Текущее расположение').map(h => <th key={h} style={thStyle}>{h}</th>)}
                        <th style={thStyle}>Текущее расположение</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cpData.slice(cpPage * rowsPerPage, (cpPage + 1) * rowsPerPage).map((row, i) => {
                        const loc = cpLocations[row.VIN];
                        let displayLocation = '-';
                        if (loc) {
                          if (loc.isInStorage) displayLocation = 'На складе';
                          else if (loc.isSold) displayLocation = 'Продан';
                          else displayLocation = loc.checkpoint || '-';
                        }
                        return (
                          <tr key={i} style={{ backgroundColor: i % 2 ? '#F9FAFB' : '#FFFFFF' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEF2FF'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? '#F9FAFB' : '#FFFFFF'}>
                            {Object.keys(cpData[0]).filter(k => k !== 'Текущее расположение').map(key => (
                              <td key={key} style={tdStyle}>
                                {row[key] === 'N/A' ? '-' : (row[key] ?? '')}
                              </td>
                            ))}
                            <td style={tdStyle}>{displayLocation}</td>
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
            {!cpLoading && cpData.length === 0 && startDate && endDate && (
              <p style={{ color: '#6B7280', textAlign: 'center', marginTop: 30 }}>Нет данных за выбранный период</p>
            )}
          </div>
        </>
      )}

      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 600,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1F2937' }}>
                Экспорт на холды
              </h3>
              <button 
                onClick={closeExportModal}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#DC2626',
                  padding: '0 4px',
                  fontWeight: '700',
                }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 16 }}>
              Выберите причину или введите свою
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>
                Поиск причины:
                <input
                  type="text"
                  value={exportSearch}
                  onChange={(e) => setExportSearch(e.target.value)}
                  placeholder="Начните вводить..."
                  style={{ ...inputStyle, flex: 1 }}
                  disabled={!!customReason}
                />
              </label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                {exportReasonLoading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#6B7280' }}>Загрузка...</div>
                ) : filteredReasons.length > 0 ? (
                  filteredReasons.map(reason => (
                    <div 
                      key={reason}
                      onClick={() => handleSelectReason(reason)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: selectedReason === reason ? '#EFF6FF' : 'transparent',
                        borderBottom: '1px solid #F0F0F5',
                        fontSize: 14,
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedReason === reason ? '#EFF6FF' : 'transparent'}
                    >
                      {reason}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF' }}>Нет причин</div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>
                Своя причина:
                <input
                  type="text"
                  value={customReason}
                  onChange={handleCustomReasonChange}
                  placeholder="Введите причину..."
                  style={{ ...inputStyle, flex: 1 }}
                  disabled={!!selectedReason}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button style={{ ...buttonStyle, background: '#9CA3AF' }} onClick={closeExportModal}>
                Отмена
              </button>
              <button 
                style={{ ...buttonStyle, background: '#F59E0B', opacity: (selectedReason || customReason) ? 1 : 0.6, pointerEvents: (selectedReason || customReason) ? 'auto' : 'none' }}
                onClick={handleExportToHoldsWithReason}
                disabled={!selectedReason && !customReason}
              >
                📥 Экспорт
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ПРИЧИН БЛОКИРОВКИ */}
      {showBlockModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000,
        }} onClick={() => setShowBlockModal(false)}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
            width: '90%', maxWidth: 800, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1F2937' }}>
                Причины блокировки: <span style={{ color: '#DC2626' }}>{selectedBlockVin}</span>
              </h3>
              <button onClick={() => setShowBlockModal(false)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280' }}>×</button>
            </div>

            {blockReasonsLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Загрузка...</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 12, borderBottom: '1px solid #FCA5A5', paddingBottom: 4 }}>
                  Активные причины ({blockReasonsData.active.length})
                </h4>
                {blockReasonsData.active.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FEF2F2' }}>
                        <th style={{ ...thStyle, color: '#991B1B' }}>Причина</th>
                        <th style={{ ...thStyle, color: '#991B1B', width: 160 }}>Дата блокировки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockReasonsData.active.map((r, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FEF2F2' }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{r.reason}</td>
                          <td style={tdStyle}>{formatDateTime(r.block_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#059669', fontSize: 14, marginBottom: 24 }}>Нет активных блокировок</p>
                )}

                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#059669', marginBottom: 12, borderBottom: '1px solid #A7F3D0', paddingBottom: 4 }}>
                  Разблокированные ранее ({blockReasonsData.cleared.length})
                </h4>
                {blockReasonsData.cleared.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#ECFDF5' }}>
                        <th style={{ ...thStyle, color: '#065F46' }}>Причина</th>
                        <th style={{ ...thStyle, color: '#065F46', width: 160 }}>Дата блокировки</th>
                        <th style={{ ...thStyle, color: '#065F46', width: 160 }}>Дата разблокировки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockReasonsData.cleared.map((r, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#ECFDF5' }}>
                          <td style={{ ...tdStyle, color: '#4B5563' }}>{r.reason}</td>
                          <td style={{ ...tdStyle, color: '#4B5563' }}>{formatDateTime(r.block_date)}</td>
                          <td style={{ ...tdStyle, color: '#059669', fontWeight: 600 }}>{formatDateTime(r.unblock_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#9CA3AF', fontSize: 14 }}>Нет разблокированных причин</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}