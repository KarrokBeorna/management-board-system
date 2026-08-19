import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = '';

// ====== СТИЛИ ======
const containerStyle = {
  padding: 30,
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  maxWidth: 1400,
  margin: '0 auto',
  background: '#FFFFFF',
  minHeight: 'calc(100vh - 60px)',
  boxSizing: 'border-box',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
  flexWrap: 'wrap',
  gap: 12,
};

const titleStyle = {
  fontSize: 26,
  fontWeight: 800,
  color: '#111827',
  margin: 0,
};

const headerButtonsStyle = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
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
  boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
  transition: 'background 0.2s, transform 0.1s',
};

const refreshButtonStyle = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#10B981',
  color: 'white',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
  transition: 'background 0.2s, transform 0.1s',
};

const exportButtonStyle = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#8B5CF6',
  color: 'white',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 2px 6px rgba(139,92,246,0.3)',
  transition: 'background 0.2s, transform 0.1s',
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

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
  marginBottom: 20,
  overflow: 'hidden',
};

const filterContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginBottom: 20,
  padding: 16,
  backgroundColor: '#F9FAFB',
  borderRadius: 12,
  border: '1px solid #E5E7EB',
};

const filterCheckboxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  cursor: 'pointer',
  padding: '4px 12px',
  borderRadius: 6,
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  transition: 'all 0.2s',
};

const tableContainerStyle = {
  maxHeight: 'calc(100vh - 250px)',
  overflowY: 'auto',
  borderRadius: 8,
};

const thStyle = {
  padding: '10px 10px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  fontSize: 12,
};

const tdStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  borderBottom: '1px solid #F3F4F6',
  color: '#1F2937',
  fontSize: 13,
};

const statusBadgeStyle = {
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  display: 'inline-block',
  backgroundColor: '#FEF3C7',
  color: '#92400E',
  whiteSpace: 'nowrap',
};

const totalRowStyle = {
  backgroundColor: '#F9FAFB',
  fontWeight: 800,
  borderTop: '2px solid #E5E7EB',
};

const loadingStyle = {
  textAlign: 'center',
  color: '#6B7280',
  fontSize: 16,
  padding: 40,
};

const lastUpdateStyle = {
  fontSize: 12,
  color: '#6B7280',
  fontWeight: 500,
};

// ====== ФУНКЦИИ ======
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
};

export default function HoldsSgpPage() {
  const [activeTab, setActiveTab] = useState('report');

  // Отчет
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModelFilter, setShowModelFilter] = useState(false);
  const [selectedModels, setSelectedModels] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Аналитика
  const [retroData, setRetroData] = useState([]);
  const [retroLoading, setRetroLoading] = useState(false);
  const [showRetroModelFilter, setShowRetroModelFilter] = useState(false);
  const [selectedRetroModels, setSelectedRetroModels] = useState([]);
  const [retroDates, setRetroDates] = useState([]);

  const allModels = useMemo(() => {
    const models = [...new Set(rawData.map(d => d.model))].filter(Boolean);
    return models.sort();
  }, [rawData]);

  useEffect(() => {
    if (allModels.length > 0 && selectedModels.length === 0) {
      setSelectedModels(allModels);
    }
    if (allModels.length > 0 && selectedRetroModels.length === 0) {
      setSelectedRetroModels(allModels);
    }
  }, [allModels]);

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/holds-sgp`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setRawData(json);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Ошибка Holds SGP:', err);
      setError('Нет данных');
    } finally {
      setLoading(false);
    }
  };

  const loadRetrospective = async () => {
    setRetroLoading(true);
    try {
      const dates = generateDates();
      setRetroDates(dates);
      
      const params = new URLSearchParams();
      if (selectedRetroModels.length > 0 && selectedRetroModels.length < allModels.length) {
        params.append('models', selectedRetroModels.join(','));
      }
      
      const res = await fetch(`${API_BASE}/api/holds-sgp-retrospective?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();
      
      // Сортировка: по последнему дню (текущему) от большего к меньшему
      const lastDate = dates[dates.length - 1];
      const sorted = json.sort((a, b) => (b[lastDate] || 0) - (a[lastDate] || 0));
      
      setRetroData(sorted);
    } catch (err) {
      console.error('Ошибка ретроспективы:', err);
      setRetroData([]);
    } finally {
      setRetroLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadRetrospective();
    }
  }, [activeTab]);

  // Отчет: сортировка от большего к меньшему по количеству
  const filteredData = useMemo(() => {
    const filtered = selectedModels.length === 0 
      ? rawData 
      : rawData.filter(d => selectedModels.includes(d.model));
    return filtered.sort((a, b) => b.quantity - a.quantity);
  }, [rawData, selectedModels]);

  const handleModelToggle = (model) => {
    setSelectedModels(prev => 
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    );
  };

  const handleSelectAll = () => {
    if (selectedModels.length === allModels.length) {
      setSelectedModels([]);
    } else {
      setSelectedModels(allModels);
    }
  };

  const handleRetroModelToggle = (model) => {
    setSelectedRetroModels(prev => 
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    );
  };

  const handleExport = () => {
    const exportData = filteredData.map(d => ({
      'Модель': d.model,
      'Описание': d.issue_desc,
      'Количество': d.quantity,
      'Дата постановки на Холд': formatDate(d.hold_date),
      'Дней ожидания': d.days_waiting,
      'Ответственный': '',
      'Плановая дата': formatDate(d.planned_date),
      'Статус': d.status || 'В процессе',
    }));

    const totalQuantity = filteredData.reduce((sum, d) => sum + (d.quantity || 0), 0);
    exportData.push({
      'Модель': 'Общий итог',
      'Описание': '',
      'Количество': totalQuantity,
      'Дата постановки на Холд': '',
      'Дней ожидания': '',
      'Ответственный': '',
      'Плановая дата': '',
      'Статус': '',
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holds SGP');
    ws['!cols'] = [
      { wch: 20 }, { wch: 60 }, { wch: 10 }, { wch: 18 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
    ];
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Holds_SGP_${dateStr}.xlsx`);
  };

  const totalQuantity = filteredData.reduce((sum, d) => sum + (d.quantity || 0), 0);

  if (loading && rawData.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Заголовок */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>🚗 Holds СГП</h1>
        <div style={headerButtonsStyle}>
          {lastUpdate && (
            <span style={lastUpdateStyle}>
              Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
            </span>
          )}
          <button style={refreshButtonStyle} onClick={fetchData} disabled={loading}>
            {loading ? '⏳ Загрузка...' : '🔄 Обновить'}
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('report')} style={tabStyle(activeTab === 'report')}>
          Отчет
        </button>
        <button onClick={() => setActiveTab('analytics')} style={tabStyle(activeTab === 'analytics')}>
          Аналитика
        </button>
      </div>

      {/* ========== ОТЧЕТ ========== */}
      {activeTab === 'report' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button 
              style={{
                ...buttonStyle,
                background: showModelFilter ? '#1E40AF' : '#2563EB',
              }}
              onClick={() => setShowModelFilter(!showModelFilter)}
            >
              {showModelFilter ? 'Скрыть фильтр' : '🔍 Модели'}
            </button>
            <button style={exportButtonStyle} onClick={handleExport}>
              📥 Экспорт
            </button>
          </div>

          {showModelFilter && (
            <div style={filterContainerStyle}>
              <label style={{ ...filterCheckboxStyle, backgroundColor: '#EEF2FF', border: '1px solid #2563EB' }}>
                <input type="checkbox" checked={selectedModels.length === allModels.length} onChange={handleSelectAll} />
                Все модели
              </label>
              {allModels.map(model => (
                <label key={model} style={{
                  ...filterCheckboxStyle,
                  backgroundColor: selectedModels.includes(model) ? '#EEF2FF' : '#FFFFFF',
                  border: selectedModels.includes(model) ? '1px solid #2563EB' : '1px solid #E5E7EB',
                }}>
                  <input type="checkbox" checked={selectedModels.includes(model)} onChange={() => handleModelToggle(model)} />
                  {model}
                </label>
              ))}
            </div>
          )}

          <div style={cardStyle}>
            <div style={tableContainerStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '15%' }}>Модель</th>
                    <th style={{ ...thStyle, width: '32%' }}>Описание</th>
                    <th style={{ ...thStyle, width: '7%', textAlign: 'center' }}>Кол-во</th>
                    <th style={{ ...thStyle, width: '12%' }}>Дата постановки</th>
                    <th style={{ ...thStyle, width: '7%', textAlign: 'center' }}>Дней</th>
                    <th style={{ ...thStyle, width: '12%' }}>Ответственный</th>
                    <th style={{ ...thStyle, width: '12%' }}>Плановая дата</th>
                    <th style={{ ...thStyle, width: '10%' }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, fontSize: 12 }}>{row.model}</td>
                      <td style={{ ...tdStyle, fontSize: 12, lineHeight: '1.4' }}>{row.issue_desc}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{row.quantity}</td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(row.hold_date)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: row.days_waiting > 30 ? '#DC2626' : row.days_waiting > 14 ? '#F59E0B' : '#10B981' }}>
                        {row.days_waiting}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12 }}></td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(row.planned_date)}</td>
                      <td style={tdStyle}>
                        <span style={statusBadgeStyle}>{row.status || 'В процессе'}</span>
                      </td>
                    </tr>
                  ))}
                  <tr style={totalRowStyle}>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>Общий итог</td>
                    <td style={tdStyle}></td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>{totalQuantity}</td>
                    <td style={tdStyle}></td>
                    <td style={tdStyle}></td>
                    <td style={tdStyle}></td>
                    <td style={tdStyle}></td>
                    <td style={tdStyle}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========== АНАЛИТИКА ========== */}
      {activeTab === 'analytics' && (
        <>
          {/* Таблицы по моделям */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
              📊 Холды по моделям
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {allModels.map(modelFilter => {
                const filtered = filteredData
                  .filter(d => d.model === modelFilter)
                  .sort((a, b) => b.quantity - a.quantity);
                
                if (filtered.length === 0) return null;
                
                const totalCount = filtered.reduce((sum, d) => sum + (d.quantity || 0), 0);
                
                return (
                  <div key={modelFilter} style={{
                    backgroundColor: '#FAFBFC',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <h3 style={{
                      margin: '0 0 12px 0',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#1F2937',
                      borderBottom: '2px solid #2563EB',
                      paddingBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{
                        background: '#2563EB',
                        color: 'white',
                        borderRadius: 8,
                        padding: '2px 12px',
                        fontSize: 14
                      }}>
                        {modelFilter}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#2563EB' }}>
                        {totalCount}
                      </span>
                    </h3>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F3F4F6' }}>
                          <th style={{ padding: '6px', textAlign: 'left', borderBottom: '2px solid #D1D5DB', fontWeight: 600 }}>Описание</th>
                          <th style={{ padding: '6px', textAlign: 'center', borderBottom: '2px solid #D1D5DB', fontWeight: 600 }}>Кол-во</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((row, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                            <td style={{ padding: '6px', borderBottom: '1px solid #E5E7EB' }}>{row.issue_desc}</td>
                            <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #E5E7EB', fontWeight: 700 }}>
                              {row.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ретроспектива */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                📈 Ретроспектива холдов (14 дней)
              </h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button 
                  style={{
                    ...buttonStyle,
                    background: showRetroModelFilter ? '#1E40AF' : '#2563EB',
                  }}
                  onClick={() => setShowRetroModelFilter(!showRetroModelFilter)}
                >
                  {showRetroModelFilter ? 'Скрыть фильтр' : '🔍 Модели'}
                </button>
                <button style={refreshButtonStyle} onClick={loadRetrospective} disabled={retroLoading}>
                  {retroLoading ? '⏳ Загрузка...' : '🔄 Обновить'}
                </button>
              </div>
            </div>

            {showRetroModelFilter && (
              <div style={filterContainerStyle}>
                {allModels.map(model => (
                  <label key={model} style={{
                    ...filterCheckboxStyle,
                    backgroundColor: selectedRetroModels.includes(model) ? '#EEF2FF' : '#FFFFFF',
                    border: selectedRetroModels.includes(model) ? '1px solid #2563EB' : '1px solid #E5E7EB',
                  }}>
                    <input type="checkbox" checked={selectedRetroModels.includes(model)} onChange={() => handleRetroModelToggle(model)} />
                    {model}
                  </label>
                ))}
              </div>
            )}
            
            {!retroLoading && retroData.length > 0 && retroDates.length > 0 ? (
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '12%', fontSize: 10, position: 'sticky', top: 0, zIndex: 30 }}>
                        Модель
                      </th>
                      <th style={{ ...thStyle, width: '25%', fontSize: 10, position: 'sticky', top: 0, zIndex: 30 }}>
                        Описание
                      </th>
                      {retroDates.map(date => (
                        <th key={date} style={{ ...thStyle, textAlign: 'center', width: '4.5%', fontSize: 9, padding: '6px 2px', position: 'sticky', top: 0, zIndex: 30 }}>
                          {formatShortDate(date)}
                        </th>
                      ))}
                    </tr>
                    <tr style={{ backgroundColor: '#FEF3C7', position: 'sticky', top: 34, zIndex: 25 }}>
                      <td style={{ ...tdStyle, fontWeight: 800, fontSize: 10, position: 'sticky', left: 0, backgroundColor: '#FEF3C7', zIndex: 26 }}>
                        ИТОГО
                      </td>
                      <td style={{ ...tdStyle, position: 'sticky', left: 0, backgroundColor: '#FEF3C7', zIndex: 26 }}></td>
                      {retroDates.map(date => {
                        const daySum = retroData.reduce((sum, row) => sum + (row[date] || 0), 0);
                        return (
                          <td key={date} style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, fontSize: 10, backgroundColor: '#FEF3C7' }}>
                            {daySum > 0 ? daySum : ''}
                          </td>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {retroData.map((row, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        <td style={{ ...tdStyle, fontWeight: 700, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.model}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.issue_desc}>
                          {row.issue_desc}
                        </td>
                        {retroDates.map(date => {
                          const val = row[date];
                          return (
                            <td key={date} style={{
                              ...tdStyle,
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: 10,
                              padding: '6px 2px',
                              backgroundColor: val > 0 ? '#FEF3C7' : (idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'),
                              color: val > 0 ? '#92400E' : '#D1D5DB',
                            }}>
                              {val || ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !retroLoading && (
                <p style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>
                  Нажмите «Обновить» для загрузки данных
                </p>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}