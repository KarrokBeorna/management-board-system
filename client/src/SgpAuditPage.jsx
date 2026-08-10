import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const API_BASE = 'http://localhost:40000';

// ====== Вспомогательные функции ======
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

const timeInputStyle = {
  ...inputStyle,
  width: '90px',
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

const cpNames = [
  { value: 'Key_Uloc_Type_CP7', label: 'CP7' },
  { value: 'Key_Uloc_Type_CP72', label: 'CP72' },
  { value: 'Key_Uloc_Type_CPFINAL', label: 'CPFINAL' },
  { value: 'Key_Uloc_Type_CP8', label: 'CP8' },
];

export default function SgpAuditPage() {
  const [activeTab, setActiveTab] = useState('checkpoints');

  // ====== Общие состояния VIN-поиска ======
  const [vinSearch, setVinSearch] = useState('');
  const [isVinMode, setIsVinMode] = useState(false);

  // ====== Состояние для "Аудит чекпоинтов (хранение)" ======
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

  // ====== Состояние для "Детальный аудит" ======
  const [detailSelectedCp, setDetailSelectedCp] = useState('Key_Uloc_Type_CP7');
  const [detailStartDate, setDetailStartDate] = useState('');
  const [detailStartTime, setDetailStartTime] = useState('00:00');
  const [detailEndDate, setDetailEndDate] = useState('');
  const [detailEndTime, setDetailEndTime] = useState('23:59');
  const [detailModel, setDetailModel] = useState('ALL');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailData, setDetailData] = useState([]);
  const [detailPage, setDetailPage] = useState(0);
  const detailRowsPerPage = 100;

  // ====== Состояние для "Аналитика по аудиту" ======
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditModel, setAuditModel] = useState('ALL');
  const [auditResultFilter, setAuditResultFilter] = useState('ALL');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditAnalytics, setAuditAnalytics] = useState(null);
  const [auditDailyData, setAuditDailyData] = useState([]);

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

  // ====== VIN-поиск ======
  const handleVinSearch = () => {
    if (!vinSearch.trim()) {
      setIsVinMode(false);
      return;
    }
    setIsVinMode(true);
    // Сброс обычных фильтров
    setStartDate(''); setEndDate('');
    setDetailStartDate(''); setDetailEndDate('');
    setCpModel('ALL'); setDetailModel('ALL');
    // Загрузка данных по VIN для активной вкладки
    if (activeTab === 'checkpoints') {
      loadStorageByVin();
    } else if (activeTab === 'detail') {
      loadDetailByVin();
    }
  };

  const handleVinReset = () => {
    setVinSearch('');
    setIsVinMode(false);
    setCpData([]);
    setDetailData([]);
  };

  // Блокировка фильтров при VIN-режиме
  const isFilterDisabled = isVinMode;

  // ====== Загрузка для "Аудит чекпоинтов (хранение)" по VIN ======
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

  // ====== Загрузка для "Детальный аудит" по VIN ======
  const loadDetailByVin = async () => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sgp-audit-vins-detail?vin=${encodeURIComponent(vinSearch.trim())}`);
      if (!res.ok) throw new Error('Ошибка получения данных');
      const json = await res.json();
      setDetailData(Array.isArray(json) ? json : []);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // ====== Обычные загрузки ======
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

  const runDetailAudit = async () => {
    if (isVinMode) return;
    if (!detailStartDate || !detailEndDate || new Date(detailEndDate) < new Date(detailStartDate)) return;
    setDetailLoading(true);
    setDetailError(null);
    setDetailPage(0);
    const startDateTime = `${detailStartDate} ${detailStartTime || '00:00'}:00`;
    const endDateTime = `${detailEndDate} ${detailEndTime || '23:59'}:59`;
    try {
      const params = new URLSearchParams({
        checkpoint: detailSelectedCp,
        dateFrom: startDateTime,
        dateTo: endDateTime,
      });
      if (detailModel !== 'ALL') params.append('model', detailModel);
      const res = await fetch(`${API_BASE}/api/sgp-audit-vins-detail?${params.toString()}`);
      if (!res.ok) throw new Error(`Ошибка получения данных: ${res.status}`);
      const data = await res.json();
      setDetailData(Array.isArray(data) ? data : []);
    } catch (err) { setDetailError(err.message); } finally { setDetailLoading(false); }
  };

  // ====== Аналитика ======
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

  // ====== Экспорт ======
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

  // ====== Компонент выбора чекпоинтов ======
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

  // ====== Рендер ======
  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#1F2937', fontSize: 28, fontWeight: 700, marginBottom: 35, letterSpacing: '-0.5px' }}>
        СГП Аудит
      </h1>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
        <button onClick={() => setActiveTab('checkpoints')} style={{
          padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15,
          background: activeTab === 'checkpoints' ? '#2563EB' : '#F3F4F6',
          color: activeTab === 'checkpoints' ? '#FFFFFF' : '#6B7280', cursor: 'pointer',
          boxShadow: activeTab === 'checkpoints' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
        }}>Аудит чекпоинтов (хранение)</button>

        <button onClick={() => setActiveTab('detail')} style={{
          padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15,
          background: activeTab === 'detail' ? '#2563EB' : '#F3F4F6',
          color: activeTab === 'detail' ? '#FFFFFF' : '#6B7280', cursor: 'pointer',
          boxShadow: activeTab === 'detail' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
        }}>Детальный аудит</button>

        <button onClick={() => setActiveTab('analytics')} style={{
          padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15,
          background: activeTab === 'analytics' ? '#2563EB' : '#F3F4F6',
          color: activeTab === 'analytics' ? '#FFFFFF' : '#6B7280', cursor: 'pointer',
          boxShadow: activeTab === 'analytics' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
        }}>Аналитика по аудиту</button>
      </div>

      {/* Блок VIN-поиска */}
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
              padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white',
              fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
              opacity: vinSearch.trim() ? 1 : 0.6,
              pointerEvents: vinSearch.trim() ? 'auto' : 'none',
            }}
          >
            Найти
          </button>
          {isVinMode && (
            <button
              onClick={handleVinReset}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', background: '#9CA3AF', color: 'white',
                fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 6px rgba(156,163,175,0.3)',
              }}
            >
              ✕ Сбросить
            </button>
          )}
        </div>
      </div>

      {/* ========== Вкладка "Аудит чекпоинтов (хранение)" ========== */}
      {activeTab === 'checkpoints' && (
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
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={timeInputStyle} disabled={isFilterDisabled} />
            </label>
            <label style={labelStyle}>
              <span style={{ whiteSpace: 'nowrap' }}>Конец периода</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} disabled={isFilterDisabled} />
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={timeInputStyle} disabled={isFilterDisabled} />
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
      )}

      {/* ========== Вкладка "Детальный аудит" ========== */}
      {activeTab === 'detail' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: '#EEF2FF', padding: '4px 12px', borderRadius: 6, color: '#2563EB', fontSize: 16 }}>⏱️</span>
            Детальный аудит перемещений
          </h2>
          {renderCpSelector(detailSelectedCp, setDetailSelectedCp)}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <label style={labelStyle}>
              <span style={{ whiteSpace: 'nowrap' }}>Начало периода</span>
              <input type="date" value={detailStartDate} onChange={e => setDetailStartDate(e.target.value)} style={inputStyle} disabled={isFilterDisabled} />
              <input type="time" value={detailStartTime} onChange={e => setDetailStartTime(e.target.value)} style={timeInputStyle} disabled={isFilterDisabled} />
            </label>
            <label style={labelStyle}>
              <span style={{ whiteSpace: 'nowrap' }}>Конец периода</span>
              <input type="date" value={detailEndDate} onChange={e => setDetailEndDate(e.target.value)} style={inputStyle} disabled={isFilterDisabled} />
              <input type="time" value={detailEndTime} onChange={e => setDetailEndTime(e.target.value)} style={timeInputStyle} disabled={isFilterDisabled} />
            </label>
            <label style={labelStyle}>
              Модель
              <select value={detailModel} onChange={e => setDetailModel(e.target.value)} style={inputStyle} disabled={isFilterDisabled}>
                {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
              </select>
            </label>
            <button
              onClick={runDetailAudit}
              disabled={isFilterDisabled || !detailStartDate || !detailEndDate || detailLoading}
              style={{
                ...buttonStyle,
                opacity: !isFilterDisabled && detailStartDate && detailEndDate && !detailLoading ? 1 : 0.6,
                pointerEvents: !isFilterDisabled && detailStartDate && detailEndDate && !detailLoading ? 'auto' : 'none',
                background: !isFilterDisabled && detailStartDate && detailEndDate && !detailLoading ? '#2563EB' : '#9CA3AF',
              }}
            >
              {detailLoading ? '⏳ Загрузка...' : '▶ Загрузить аудит'}
            </button>
          </div>
          {detailEndDate && new Date(detailEndDate) < new Date(detailStartDate) && (
            <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>Конечная дата не может быть раньше начальной</p>
          )}
          {detailError && <p style={{ color: '#DC2626', marginTop: 18 }}>❌ Ошибка: {detailError}</p>}
          {detailData.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontWeight: 600, color: '#1F2937' }}>Найдено записей: {detailData.length}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => exportExcel(detailData, 'аудит_перемещения')} style={{ ...buttonStyle, background: '#059669' }}>📊 Excel</button>
                  <button onClick={() => exportWord(detailData, 'аудит_перемещения')} style={{ ...buttonStyle, background: '#7C3AED' }}>📄 Word</button>
                </div>
              </div>
              <div style={{ borderRadius: 10, overflowX: 'auto', border: '1px solid #E5E7EB' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      {detailData.length > 0 && Object.keys(detailData[0]).map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.slice(detailPage * detailRowsPerPage, (detailPage + 1) * detailRowsPerPage).map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 ? '#F9FAFB' : '#FFFFFF' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEF2FF'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 ? '#F9FAFB' : '#FFFFFF'}>
                        {Object.keys(row).map(key => <td key={key} style={tdStyle}>{row[key] ?? ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {Math.ceil(detailData.length / detailRowsPerPage) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 18 }}>
                  <button onClick={() => setDetailPage(p => Math.max(0, p - 1))} disabled={detailPage === 0} style={{ ...buttonStyle, background: '#9CA3AF' }}>← Назад</button>
                  <span style={{ alignSelf: 'center', fontWeight: 500 }}>{detailPage + 1} / {Math.ceil(detailData.length / detailRowsPerPage)}</span>
                  <button onClick={() => setDetailPage(p => Math.min(Math.ceil(detailData.length / detailRowsPerPage) - 1, p + 1))} disabled={detailPage === Math.ceil(detailData.length / detailRowsPerPage) - 1} style={{ ...buttonStyle, background: '#9CA3AF' }}>Вперёд →</button>
                </div>
              )}
            </div>
          )}
          {!detailLoading && detailData.length === 0 && detailStartDate && detailEndDate && (
            <p style={{ color: '#6B7280', textAlign: 'center', marginTop: 30 }}>Нет данных за выбранный период</p>
          )}
        </div>
      )}

      {/* ========== Вкладка "Аналитика по аудиту" ========== */}
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