import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = '';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ===================== СТИЛИ ===================== */
const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 28,
  marginBottom: 24,
  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
  border: '1px solid #F0F0F5',
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

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
};

const filterDropdownStyle = {
  position: 'fixed',
  zIndex: 1000,
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  maxHeight: 300,
  overflowY: 'auto',
  minWidth: 220,
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

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(15,23,42,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: 20,
};

const modalStyle = {
  backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24,
  width: '100%', maxWidth: 800, maxHeight: '85vh',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
};

const loadingAnimation = `
  @keyframes blink {
    0% { opacity: 0.2; }
    20% { opacity: 1; }
    100% { opacity: 0.2; }
  }
  .loading-dots span { animation: blink 1.4s infinite both; }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
`;

/* ===================== КОМПОНЕНТ ===================== */
export default function VoltageSpcPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  const [filters, setFilters] = useState({});
  const [vinSearch, setVinSearch] = useState('');
  
  const [dateFrom, setDateFrom] = useState(getTodayStr());
  const [dateTo, setDateTo]     = useState(getTodayStr());
  const [cp8DateFrom, setCp8DateFrom] = useState('');
  const [cp8DateTo, setCp8DateTo]     = useState('');

  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, left: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalVin, setModalVin] = useState('');
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Сгруппированные колонки
  const columns = [
    // Группа 1: Автомобиль
    { key: 'VIN',             label: 'VIN c NG',               filterable: true,  width: 180, mono: true },
    { key: 'MODEL',           label: 'Модель',            filterable: true,  width: 110 },
    
    // Группа 2: Текущий NOK (подсветка красным)
    { key: 'VOLTAGE',         label: 'Voltage (>= 13)',   filterable: false, width: 110, groupColor: '#FEF2F2' },
    { key: 'MEASURE_DATE',    label: 'Дата замера',       filterable: false, isTime: true, width: 140, groupColor: '#FEF2F2' },
    
    // Группа 3: Последний OK (подсветка зеленым)
    { key: 'LAST_OK_VOLTAGE', label: 'Volt посл. OK',     filterable: false, width: 110, groupColor: '#F0FDF4' },
    { key: 'LAST_OK_DATE',    label: 'Дата посл. OK',     filterable: false, isTime: true, width: 140, groupColor: '#F0FDF4' },
    
    // Группа 4: События
    { key: 'TEN_MIN_NG',      label: '10 min NG',         filterable: true,  width: 90, align: 'center' },
    { key: 'CP8_DATE',        label: 'Дата CP8',          filterable: false, isTime: true, width: 140 },
  ];

  // Блокировка фона при открытой модалке
  useEffect(() => {
    if (modalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modalOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeFilterColumn && !event.target.closest('.filter-dropdown') && !event.target.closest('th')) {
        setActiveFilterColumn(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeFilterColumn]);

  useEffect(() => {
    const handleScroll = (event) => {
      if (event.target.closest && event.target.closest('.filter-dropdown')) return;
      setActiveFilterColumn(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (vinSearch.trim()) params.append('vin', vinSearch.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo)   params.append('dateTo',   dateTo);

      const res = await fetch(`${API_BASE}/api/voltage-spc?${params.toString()}`);
      if (!res.ok) throw new Error(`Ошибка загрузки (${res.status})`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      setPage(0);
    } catch (err) {
      console.error('Ошибка Voltage SPC:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dateFrom, dateTo]);

  const openVinHistory = async (vin) => {
    setModalVin(vin);
    setModalOpen(true);
    setModalLoading(true);
    setModalData([]);
    try {
      const res = await fetch(`${API_BASE}/api/voltage-spc-vin-history?vin=${encodeURIComponent(vin)}`);
      if (!res.ok) throw new Error('Ошибка загрузки истории');
      const json = await res.json();
      setModalData(json || []);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return String(dt);
    return d.toLocaleString('ru-RU');
  };

  const getUniqueValues = (column) => {
    const values = [...new Set(data.map(d => d[column]).filter(v => v !== null && v !== undefined && v !== ''))];
    return values.map(String).sort();
  };

  const handleFilterHeaderClick = (column, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setFilterDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setActiveFilterColumn(activeFilterColumn === column ? null : column);
  };

  const handleFilterToggle = (column, value) => {
    setFilters(prev => {
      const current = prev[column] || [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      const newFilters = { ...prev };
      if (next.length > 0) newFilters[column] = next;
      else delete newFilters[column];
      return newFilters;
    });
  };

  const handleFilterClear = (column) => {
    setFilters(prev => {
      const copy = { ...prev };
      delete copy[column];
      return copy;
    });
    setActiveFilterColumn(null);
  };

  const clearAll = () => {
    setFilters({});
    setVinSearch('');
    setDateFrom(getTodayStr());
    setDateTo(getTodayStr());
    setCp8DateFrom('');
    setCp8DateTo('');
    setActiveFilterColumn(null);
    setTimeout(loadData, 0);
  };

  const filtered = useMemo(() => {
    let result = data;

    if (vinSearch.trim()) {
      const q = vinSearch.trim().toLowerCase();
      result = result.filter(d => d.VIN && String(d.VIN).toLowerCase().includes(q));
    }

    if (cp8DateFrom) {
      const from = new Date(`${cp8DateFrom}T00:00:00`);
      result = result.filter(d => d.CP8_DATE && new Date(d.CP8_DATE) >= from);
    }
    if (cp8DateTo) {
      const to = new Date(`${cp8DateTo}T23:59:59`);
      result = result.filter(d => d.CP8_DATE && new Date(d.CP8_DATE) <= to);
    }

    if (Object.keys(filters).length > 0) {
      result = result.filter(row => {
        for (const [col, values] of Object.entries(filters)) {
          if (values.length > 0 && !values.includes(String(row[col] ?? ''))) return false;
        }
        return true;
      });
    }
    
    return result;
  }, [data, filters, vinSearch, cp8DateFrom, cp8DateTo]);

  useEffect(() => { setPage(0); }, [filters, vinSearch, cp8DateFrom, cp8DateTo]);

  const exportExcel = () => {
    if (!filtered.length) return;
    const rows = filtered.map(d => ({
      'VIN': d.VIN,
      'Модель': d.MODEL || '—',
      'Voltage': d.VOLTAGE,
      'Дата замера': formatDateTime(d.MEASURE_DATE),
      'Volt посл. OK': d.LAST_OK_VOLTAGE || '—',
      'Дата посл. OK': formatDateTime(d.LAST_OK_DATE),
      '10 min NG': d.TEN_MIN_NG,
      'Дата CP8': formatDateTime(d.CP8_DATE),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voltage');
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }
    ];
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Voltage_Report_${dateStr}.xlsx`);
  };

  const thStyle = {
    padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#374151',
    borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap',
    fontSize: 12, position: 'sticky', top: 0, zIndex: 10,
  };
  const tdStyle = {
    padding: '10px 14px', borderBottom: '1px solid #F0F0F5', color: '#1F2937',
    fontSize: 13, verticalAlign: 'top',
  };

  // Ключи, после которых нужно нарисовать толстую границу (конец группы)
  const groupEndKeys = ['MODEL', 'MEASURE_DATE', 'LAST_OK_DATE'];

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1600, margin: '0 auto' }}>
      <h1 style={{ color: '#1F2937', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
        ⚡ Voltage SPC Report
      </h1>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: 0 }}>
            Замеры напряжения (&ge; 13 V)
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...buttonStyle, background: '#059669' }} onClick={exportExcel}>📊 Excel</button>
            <button style={{ ...buttonStyle, background: '#9CA3AF' }} onClick={clearAll}>✕ Сбросить</button>
          </div>
        </div>

        {/* БЛОК ФИЛЬТРОВ */}
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', padding: '6px 12px', borderRadius: 8, border: '1px solid #DCFCE7' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#166534', width: 115, display: 'inline-block' }}>
                📅 Дата замера:
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4B5563' }}>
                <span>С</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 125, padding: '6px 8px' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4B5563' }}>
                <span>По</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, width: 125, padding: '6px 8px' }} />
              </label>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500 }}>
              🔍 VIN: <input type="text" value={vinSearch} onChange={(e) => setVinSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadData()} placeholder="Введите VIN..." style={{ ...inputStyle, width: 200, padding: '6px 12px' }} />
            </label>
            
            <button style={buttonStyle} onClick={loadData}>Применить</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', padding: '6px 12px', borderRadius: 8, border: '1px solid #DBEAFE' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF', width: 115, display: 'inline-block' }}>
                🏁 Дата CP8:
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4B5563' }}>
                <span>С</span>
                <input type="date" value={cp8DateFrom} onChange={(e) => setCp8DateFrom(e.target.value)} style={{ ...inputStyle, width: 125, padding: '6px 8px' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4B5563' }}>
                <span>По</span>
                <input type="date" value={cp8DateTo} onChange={(e) => setCp8DateTo(e.target.value)} style={{ ...inputStyle, width: 125, padding: '6px 8px' }} />
              </label>
              {(cp8DateFrom || cp8DateTo) && (
                <button
                  onClick={() => { setCp8DateFrom(''); setCp8DateTo(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>
                  Сбросить
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
            <style>{loadingAnimation}</style>
            <div className="loading-dots"><span>Загрузка данных</span><span>.</span><span>.</span><span>.</span></div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#DC2626' }}>❌ {error}</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 400px)', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1100 }}>
                <thead>
                  <tr>
                    {columns.map(col => {
                      const hasFilter = col.filterable && filters[col.key]?.length > 0;
                      const isGroupEnd = groupEndKeys.includes(col.key);
                      return (
                        <th key={col.key} 
                            style={{ 
                              ...thStyle, 
                              width: col.width, 
                              textAlign: col.align || 'left', 
                              background: hasFilter ? '#DBEAFE' : (col.groupColor || '#F9FAFB'), 
                              cursor: col.filterable ? 'pointer' : 'default',
                              borderRight: isGroupEnd ? '3px solid #E5E7EB' : '1px solid #F3F4F6'
                            }}
                            onClick={col.filterable ? (e) => handleFilterHeaderClick(col.key, e) : undefined}>
                          {col.label}{hasFilter && ` (${filters[col.key].length})`}{col.filterable && ' ▼'}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.slice(page * pageSize, (page + 1) * pageSize).map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEF2FF'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}>
                      
                      {/* Блок 1: Идентификация */}
                      <td style={{...tdStyle, fontFamily: 'monospace', fontWeight: 600}}>
                        <span style={{ color: '#2563EB', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => openVinHistory(row.VIN)}>
                          {row.VIN}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, borderRight: '3px solid #E5E7EB' }}>{row.MODEL || '—'}</td>

                      {/* Блок 2: Текущий NOK замер */}
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#DC2626', background: 'rgba(254, 242, 242, 0.4)' }}>
                        {row.VOLTAGE}
                      </td>
                      <td style={{ ...tdStyle, background: 'rgba(254, 242, 242, 0.4)', borderRight: '3px solid #E5E7EB' }}>
                        {formatDateTime(row.MEASURE_DATE)}
                      </td>

                      {/* Блок 3: Последний OK замер */}
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#059669', background: 'rgba(240, 253, 244, 0.4)' }}>
                        {row.LAST_OK_VOLTAGE || '—'}
                      </td>
                      <td style={{ ...tdStyle, background: 'rgba(240, 253, 244, 0.4)', borderRight: '3px solid #E5E7EB' }}>
                        {formatDateTime(row.LAST_OK_DATE)}
                      </td>

                      {/* Блок 4: События */}
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, fontSize: 16, color: row.TEN_MIN_NG === '+' ? '#059669' : '#DC2626' }}>
                        {row.TEN_MIN_NG}
                      </td>
                      <td style={tdStyle}>{formatDateTime(row.CP8_DATE)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 30, color: '#6B7280' }}>Нет данных за выбранный период</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 14, color: '#6B7280' }}>Всего: {filtered.length}</span>
                {Math.ceil(filtered.length / pageSize) > 1 && (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...buttonStyle, background: page === 0 ? '#CBD5E1' : '#9CA3AF' }}>← Назад</button>
                    <span style={{ fontWeight: 500 }}>{page + 1} / {Math.ceil(filtered.length / pageSize)}</span>
                    <button onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize) - 1, p + 1))} disabled={page === Math.ceil(filtered.length / pageSize) - 1} style={{ ...buttonStyle, background: page === Math.ceil(filtered.length / pageSize) - 1 ? '#CBD5E1' : '#9CA3AF' }}>Вперёд →</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Dropdown фильтра */}
        {activeFilterColumn && (
          <div className="filter-dropdown" style={{ ...filterDropdownStyle, top: filterDropdownPos.top, left: filterDropdownPos.left }}>
            <div style={{ ...filterOptionStyle, fontWeight: 700, borderBottom: '1px solid #E5E7EB', marginBottom: 4 }}
                 onClick={() => handleFilterClear(activeFilterColumn)}
                 onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              ✕ Очистить фильтр
            </div>
            {getUniqueValues(activeFilterColumn).map(val => {
              const isChecked = filters[activeFilterColumn]?.includes(val);
              return (
                <div key={val} style={{ ...filterOptionStyle, background: isChecked ? '#EFF6FF' : 'transparent' }}
                     onClick={() => handleFilterToggle(activeFilterColumn, val)}
                     onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                     onMouseLeave={(e) => e.currentTarget.style.background = isChecked ? '#EFF6FF' : 'transparent'}>
                  <input type="checkbox" checked={!!isChecked} readOnly /> {val}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= МОДАЛКА ИСТОРИИ ЗАМЕРОВ ================= */}
      {modalOpen && (
        <div style={modalOverlayStyle} onClick={() => setModalOpen(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, color: '#1F2937', fontWeight: 700 }}>
                Все замеры Voltage
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#6B7280' }}>
              VIN: <strong style={{ fontFamily: 'monospace', color: '#111827' }}>{modalVin}</strong>
            </p>
            
            {modalLoading ? (
              <p style={{ textAlign: 'center', padding: 20 }}>Загрузка...</p>
            ) : modalData.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>Нет замеров</p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #E5E7EB', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Время замера</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Вольтаж</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Тип проверки</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Результат (расчет)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((m, i) => {
                      // Расчет результата: OK если > 12.6 и < 13
                      const isOk = m.VOLTAGE > 12.6 && m.VOLTAGE < 13;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F0F0F5', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                          <td style={{ padding: '10px 14px' }}>{formatDateTime(m.CREATION_TIME)}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 'bold', color: isOk ? '#059669' : '#DC2626' }}>
                            {m.VOLTAGE} V
                          </td>
                          <td style={{ padding: '10px 14px' }}>{m.TYPE || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                              background: isOk ? '#DCFCE7' : '#FEE2E2',
                              color: isOk ? '#166534' : '#991B1B'
                            }}>
                              {isOk ? 'OK' : 'NOK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}