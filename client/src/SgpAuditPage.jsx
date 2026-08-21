import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
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

export default function SgpAuditPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('checkpoints');

  // Time Points
  const [timePointsData, setTimePointsData] = useState([]);
  const [timePointsLoading, setTimePointsLoading] = useState(false);
  const [timePointsError, setTimePointsError] = useState(null);
  const [timePointsPage, setTimePointsPage] = useState(0);
  const timePointsPageSize = 50;
  
  const [tpFilters, setTpFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, left: 0 });

  // Checkpoints
  const [selectedCp, setSelectedCp] = useState('Key_Uloc_Type_CP7');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  const [cpModel, setCpModel] = useState('ALL');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState(null);
  const [cpData, setCpData] = useState([]);
  const [cpPage, setCpPage] = useState(0);
  const rowsPerPage = 100;

  // VIN search
  const [vinSearch, setVinSearch] = useState('');
  const [isVinMode, setIsVinMode] = useState(false);

  // Analytics
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditModel, setAuditModel] = useState('ALL');
  const [auditResultFilter, setAuditResultFilter] = useState('ALL');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditAnalytics, setAuditAnalytics] = useState(null);
  const [auditDailyData, setAuditDailyData] = useState([]);

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

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

  const loadTimePoints = async (filters = {}) => {
    setTimePointsLoading(true);
    setTimePointsError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      
      const res = await fetch(`${API_BASE}/api/time-points?${params.toString()}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error:', errorText);
        throw new Error(`Ошибка загрузки данных (${res.status})`);
      }
      const json = await res.json();
      setTimePointsData(Array.isArray(json) ? json : []);
      setTimePointsPage(0);
    } catch (err) {
      console.error('Ошибка Time Points:', err);
      setTimePointsError(err.message);
      setTimePointsData([]);
    } finally {
      setTimePointsLoading(false);
    }
  };

  const getUniqueValues = (column) => {
    const values = [...new Set(timePointsData.map(d => d[column]).filter(v => v !== null && v !== undefined && v !== ''))];
    return values.sort();
  };

  const handleFilterHeaderClick = (column, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setFilterDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
    
    if (activeFilterColumn === column) {
      setActiveFilterColumn(null);
    } else {
      setActiveFilterColumn(column);
    }
  };

  const handleFilterToggle = (column, value) => {
    setTpFilters(prev => {
      const currentValues = prev[column] || [];
      let newValues;
      
      if (currentValues.includes(value)) {
        newValues = currentValues.filter(v => v !== value);
      } else {
        newValues = [...currentValues, value];
      }
      
      const newFilters = { ...prev, [column]: newValues };
      
      if (newValues.length === 0) {
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

  const handleTpSearch = () => {
    loadTimePoints(tpFilters);
  };

  const handleTpClear = () => {
    setTpFilters({});
    setTimePointsData([]);
    setTimePointsPage(0);
  };

  // Экспорт на холды (только VIN и Model)
  const handleExportToHolds = () => {
    const exportData = timePointsData.map(v => ({
      'VIN': v.vin,
      'Модель': v.model || '',
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Холды');
    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
    ];
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Холды_${dateStr}.xlsx`);
  };

  const timePointColumns = [
    { key: 'vin', label: 'VIN', filterable: true },
    { key: 'material_code', label: 'Material Code', filterable: true },
    { key: 'sequence_number', label: 'Sequence', filterable: true },
    { key: 'batch_num', label: 'Batch Number', filterable: true },
    { key: 'kd_material_no', label: 'KD', filterable: true },
    { key: 'model', label: 'Model', filterable: true },
    { key: 'material_desc', label: 'Комплектация', filterable: true },
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

  const renderTimeFilter = ({ label, fromKey, toKey }) => (
    <div style={timeFilterBlockStyle}>
      <span style={timeFilterLabelStyle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>От</span>
        <input
          type="datetime-local"
          value={tpFilters[fromKey] || ''}
          onChange={(e) => setTpFilters(prev => ({ ...prev, [fromKey]: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleTpSearch(); }}
          style={{ ...inputStyle, fontSize: 10, padding: '4px 6px', width: '100%' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>По</span>
        <input
          type="datetime-local"
          value={tpFilters[toKey] || ''}
          onChange={(e) => setTpFilters(prev => ({ ...prev, [toKey]: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleTpSearch(); }}
          style={{ ...inputStyle, fontSize: 10, padding: '4px 6px', width: '100%' }}
        />
      </div>
    </div>
  );

  const handleVinSearch = () => {
    if (!vinSearch.trim()) {
      setIsVinMode(false);
      return;
    }
    setIsVinMode(true);
    setStartDate(''); setEndDate('');
    setCpModel('ALL');
    loadStorageByVin();
  };

  const handleVinReset = () => {
    setVinSearch('');
    setIsVinMode(false);
    setCpData([]);
  };

  const isFilterDisabled = isVinMode;

  const loadStorageByVin = async () => {
    setCpLoading(true);
    setCpError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sgp-audit-storage?vin=${encodeURIComponent(vinSearch.trim())}`);
      if (!res.ok) throw new Error('Ошибка получения данных');
      const json = await res.json();
      setCpData(Array.isArray(json) ? json : []);
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
      if (!vins.length) { setCpData([]); return; }
      const storageRes = await fetch(`${API_BASE}/api/sgp-audit-storage?vins=${vins.join(',')}`);
      if (!storageRes.ok) throw new Error(`Ошибка получения storage: ${storageRes.status}`);
      const storageRows = await storageRes.json();
      const storageMap = new Map(storageRows.map(r => [r.VIN, r]));
      const tableData = vins.map(vin => storageMap.has(vin) ? storageMap.get(vin) : {
        VIN: vin, Модель: 'N/A', Склад: 'N/A', Локация: 'N/A', Ячейка: 'N/A', 'Результат проверки': ''
      });
      setCpData(tableData);
    } catch (err) { setCpError(err.message); } finally { setCpLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (json.length < 2) { alert('Файл должен содержать заголовки VIN и Результат'); return; }
      const rows = json.slice(1).filter(row => row.length >= 2);
      const parsed = rows.map(row => ({
        vin: String(row[0]).trim(),
        result: String(row[1]).trim().toUpperCase() === 'OK' ? 'OK' : 'NG',
        date_uploaded: new Date().toISOString().split('T')[0],
      }));
      try {
        const res = await fetch(`${API_BASE}/api/audit-results/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: parsed }),
        });
        if (!res.ok) throw new Error('Ошибка загрузки');
        alert('Данные загружены!');
        loadAnalytics();
      } catch (err) { alert('Ошибка загрузки: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadAnalytics = async () => {
    if (!auditStartDate || !auditEndDate) { alert('Укажите период прохождения CP8'); return; }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const vinsParams = new URLSearchParams({
        checkpoint: 'Key_Uloc_Type_CP8',
        dateFrom: `${auditStartDate} 00:00:00`,
        dateTo: `${auditEndDate} 23:59:59`,
      });
      if (auditModel !== 'ALL') vinsParams.append('model', auditModel);
      const vinsRes = await fetch(`${API_BASE}/api/sgp-audit-vins?${vinsParams.toString()}`);
      if (!vinsRes.ok) throw new Error('Ошибка получения VIN CP8');
      const cp8Vins = await vinsRes.json();
      if (!cp8Vins.length) { setAuditAnalytics(null); setAuditDailyData([]); return; }

      const storageRes = await fetch(`${API_BASE}/api/sgp-audit-storage?vins=${cp8Vins.join(',')}`);
      if (!storageRes.ok) throw new Error('Ошибка получения склада');
      const storageData = await storageRes.json();
      const storageVins = new Set(storageData.map(item => item.VIN));

      const auditRes = await fetch(`${API_BASE}/api/audit-results?result=${auditResultFilter}`);
      if (!auditRes.ok) throw new Error('Ошибка получения аудитов');
      const auditRows = await auditRes.json();
      const auditMap = new Map(auditRows.map(r => [r.vin, r.result]));

      const auditedVins = cp8Vins.filter(vin => auditMap.has(vin));
      const totalCp8 = cp8Vins.length;
      const onStorage = cp8Vins.filter(vin => storageVins.has(vin)).length;
      const audited = auditedVins.length;
      const notAudited = totalCp8 - audited;
      const okCount = auditedVins.filter(vin => auditMap.get(vin) === 'OK').length;
      const ngCount = audited - okCount;

      setAuditAnalytics({ totalCp8, onStorage, audited, notAudited, ok: okCount, ng: ngCount });

      const dailyMap = {};
      auditRows.forEach(row => {
        const date = row.date_uploaded;
        if (!dailyMap[date]) dailyMap[date] = { date, total: 0, ok: 0, ng: 0 };
        dailyMap[date].total++;
        if (row.result === 'OK') dailyMap[date].ok++;
        else dailyMap[date].ng++;
      });
      setAuditDailyData(Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) { setAuditError(err.message); } finally { setAuditLoading(false); }
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
                maxWidth: 180,
                padding: '12px 0',
                borderRadius: 12,
                border: isActive ? '2px solid #2563EB' : '1px solid #E5E7EB',
                background: isActive ? '#2563EB' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#374151',
                fontWeight: 600,
                fontSize: 16,
                cursor: isFilterDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 10px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                opacity: isFilterDisabled ? 0.6 : 1,
              }}
            >
              {cp.label}
            </button>
            {idx < cpNames.length - 1 && (
              <div style={{ height: 2, width: 28, backgroundColor: '#CBD5E1', margin: '0 6px', borderRadius: 1 }} />
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
  };

  const tdStyle = {
    padding: '10px 14px',
    borderBottom: '1px solid #F0F0F5',
    color: '#1F2937',
  };

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ color: '#1F2937', fontSize: 28, fontWeight: 700, marginBottom: 35, letterSpacing: '-0.5px' }}>
        Управление холдами
      </h1>

      {/* Подкарточки */}
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

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 30, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('checkpoints')} style={tabStyle(activeTab === 'checkpoints')}>
          Аудит чекпоинтов (хранение)
        </button>
        <button onClick={() => setActiveTab('timepoints')} style={tabStyle(activeTab === 'timepoints')}>
          Время прохождения точек
        </button>
        <button onClick={() => setActiveTab('analytics')} style={tabStyle(activeTab === 'analytics')}>
          Аналитика по аудиту
        </button>
      </div>

      {/* ========== Time Points ========== */}
      {activeTab === 'timepoints' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>
              ⏱️ Время прохождения точек
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={{ ...buttonStyle, background: '#059669' }} onClick={() => exportExcel(timePointsData, 'time_points')}>
                📊 Excel
              </button>
              <button style={{ ...buttonStyle, background: '#F59E0B' }} onClick={handleExportToHolds}>
                📥 Экспорт на холды
              </button>
              <button style={buttonStyle} onClick={handleTpSearch}>
                🔍 Поиск
              </button>
              <button style={{ ...buttonStyle, background: '#9CA3AF' }} onClick={handleTpClear}>
                ✕ Очистить
              </button>
            </div>
          </div>

          {/* Фильтры в 2 столбца */}
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
              {leftTimeFilters.map(filter => renderTimeFilter(filter))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rightTimeFilters.map(filter => renderTimeFilter(filter))}
            </div>
          </div>

          {timePointsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Загрузка данных...</div>
          ) : timePointsError ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#DC2626' }}>❌ {timePointsError}</div>
          ) : timePointsData.length > 0 ? (
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
                    {timePointsData.slice(timePointsPage * timePointsPageSize, (timePointsPage + 1) * timePointsPageSize).map((vehicle, idx) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
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
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              Выберите фильтр точки
            </div>
          )}

          {/* Выпадающий фильтр */}
          {activeFilterColumn && timePointsData.length > 0 && (
            <div style={{
              ...filterDropdownStyle,
              top: filterDropdownPos.top,
              left: filterDropdownPos.left,
            }}>
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

      {/* ========== Checkpoints ========== */}
      {activeTab === 'checkpoints' && (
        <>
          <div style={{ marginBottom: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500 }}>
                🔍 VIN:
                <input
                  type="text"
                  value={vinSearch}
                  onChange={(e) => setVinSearch(e.target.value)}
                  placeholder="Введите VIN..."
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB', width: 200 }}
                  disabled={isVinMode && !vinSearch}
                />
              </label>
              <button
                onClick={handleVinSearch}
                disabled={!vinSearch.trim()}
                style={{
                  ...buttonStyle,
                  opacity: vinSearch.trim() ? 1 : 0.6,
                  pointerEvents: vinSearch.trim() ? 'auto' : 'none',
                }}
              >
                Найти
              </button>
              {isVinMode && (
                <button
                  onClick={handleVinReset}
                  style={{ ...buttonStyle, background: '#9CA3AF' }}
                >
                  ✕ Сбросить
                </button>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#EEF2FF', padding: '4px 12px', borderRadius: 6, color: '#2563EB', fontSize: 16 }}>📦</span>
              Аудит чекпоинтов (хранение)
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
                        {Object.keys(cpData[0]).map(h => <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {cpData.slice(cpPage * rowsPerPage, (cpPage + 1) * rowsPerPage).map((row, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 ? '#F9FAFB' : '#FFFFFF' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEF2FF'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? '#F9FAFB' : '#FFFFFF'}>
                          {Object.keys(cpData[0]).map(key => <td key={key} style={tdStyle}>{row[key] ?? ''}</td>)}
                        </tr>
                      ))}
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

      {/* ========== Analytics ========== */}
      {activeTab === 'analytics' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: '#EEF2FF', padding: '4px 12px', borderRadius: 6, color: '#2563EB', fontSize: 16 }}>📈</span>
            Аналитика по аудиту
          </h2>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              <label style={labelStyle}>
                Загрузить Excel:
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ fontSize: 14 }} />
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              <label style={labelStyle}>
                Начало периода (CP8):
                <input type="date" value={auditStartDate} onChange={e => setAuditStartDate(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Конец периода (CP8):
                <input type="date" value={auditEndDate} onChange={e => setAuditEndDate(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Модель:
                <select value={auditModel} onChange={e => setAuditModel(e.target.value)} style={inputStyle}>
                  {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Результат аудита:
                <select value={auditResultFilter} onChange={e => setAuditResultFilter(e.target.value)} style={inputStyle}>
                  <option value="ALL">Все</option>
                  <option value="OK">OK</option>
                  <option value="NG">NG</option>
                </select>
              </label>
            </div>
          </div>

          {auditError && <p style={{ color: '#DC2626' }}>❌ {auditError}</p>}
          {auditLoading && <p>Загрузка аналитики...</p>}

          {auditAnalytics && (
            <>
              <h3 style={{ marginTop: 30, marginBottom: 16 }}>Общая сводка</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={[
                    { name: 'Всего CP8', count: auditAnalytics.totalCp8 },
                    { name: 'На складе', count: auditAnalytics.onStorage },
                    { name: 'Не пройдено аудита', count: auditAnalytics.notAudited },
                    { name: 'Прошли аудит', count: auditAnalytics.audited },
                    { name: 'OK', count: auditAnalytics.ok },
                    { name: 'NG', count: auditAnalytics.ng },
                  ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#2563EB" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {auditDailyData.length > 0 && (
                <>
                  <h3 style={{ marginTop: 40, marginBottom: 16 }}>Динамика по дням аудита</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={auditDailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#2563EB" name="Всего" strokeWidth={2} />
                        <Line type="monotone" dataKey="ok" stroke="#059669" name="ОК" strokeWidth={2} />
                        <Line type="monotone" dataKey="ng" stroke="#DC2626" name="NG" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}