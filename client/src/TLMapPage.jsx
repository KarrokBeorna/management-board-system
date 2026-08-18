import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = '';

// ====== СТИЛИ ======
const containerStyle = {
  padding: '20px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  width: '100%',
  margin: '0 auto',
  background: '#E5E7EB',
  minHeight: 'calc(100vh - 60px)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  flexWrap: 'wrap',
  gap: 12,
  flexShrink: 0,
};

const titleStyle = {
  fontSize: 24,
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
};

const exportButtonStyle = {
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
};

const lastUpdateStyle = {
  fontSize: 12,
  color: '#6B7280',
  fontWeight: 500,
};

const totalsRowStyle = {
  display: 'flex',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'nowrap',
  flexShrink: 0,
};

const totalCardStyle = {
  flex: '1 1 0',
  minWidth: 0,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: '10px 8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
  textAlign: 'center',
};

const totalLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7280',
  marginBottom: 4,
};

const totalValueStyle = {
  fontSize: 24,
  fontWeight: 800,
  color: '#1F2937',
};

const kanbanContainerStyle = {
  display: 'flex',
  gap: 12,
  alignItems: 'stretch',
  flex: 1,
  minHeight: 0,
};

const zoneColumnStyle = {
  flex: '1 1 0',
  minWidth: 0,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 14,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: 'calc(100vh - 280px)',
  minHeight: 300,
};

const zoneTitleStyle = {
  textAlign: 'center',
  fontSize: 16,
  fontWeight: 800,
  color: '#1F2937',
  marginBottom: 10,
  paddingBottom: 8,
  borderBottom: '2px solid #F3F4F6',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const zoneTotalBadgeStyle = {
  backgroundColor: '#FFFFFF',
  border: '2px dashed #9CA3AF',
  borderRadius: '50%',
  minWidth: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 800,
  color: '#374151',
  padding: '0 6px',
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  zIndex: 5,
  transition: 'transform 0.15s, background 0.15s',
};

const itemsScrollStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  overflowY: 'auto',
  paddingRight: 4,
  flex: 1,
  minHeight: 0,
};

const emptyZoneStyle = {
  textAlign: 'center',
  color: '#9CA3AF',
  fontSize: 13,
  padding: '20px 0',
  fontWeight: 500,
};

const getColorByFirstLetter = (label) => {
  if (!label) return '#D1D5DB';
  const firstLetter = label.charAt(0).toUpperCase();
  switch (firstLetter) {
    case 'A': return '#86EFAC';
    case 'J': return '#FDBA74';
    case 'M': return '#C4B5FD';
    case 'G': return '#A7F3D0';
    default: return '#D1D5DB';
  }
};

const itemCardStyle = (color) => ({
  backgroundColor: color,
  borderRadius: 3,
  padding: '5px 8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  minHeight: 28,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  flexShrink: 0,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  border: 'none',
  width: '100%',
});

const itemLabelStyle = {
  color: '#000000',
  fontWeight: 900,
  fontSize: 15,
  letterSpacing: '0.3px',
};

const itemCountStyle = {
  color: '#000000',
  fontWeight: 900,
  fontSize: 17,
};

const filterContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
  padding: 10,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  border: '1px solid #E5E7EB',
  flexShrink: 0,
};

const filterCheckboxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 13,
  cursor: 'pointer',
};

// ====== КОНСТАНТЫ ======
const MODEL_ORDER = ['A8', 'J6', 'J7', 'J8', 'MX'];
const ZONE_ORDER = ['TLWA', 'TLRT', 'TLADAS', 'TLTT', 'CPA'];

const sortByModelAndVersion = (a, b) => {
  const [modelA, versionA] = a.label.split('.');
  const [modelB, versionB] = b.label.split('.');
  const modelIndexA = MODEL_ORDER.indexOf(modelA);
  const modelIndexB = MODEL_ORDER.indexOf(modelB);
  if (modelIndexA !== modelIndexB) return modelIndexA - modelIndexB;
  const versionNumA = parseInt(versionA, 10) || 0;
  const versionNumB = parseInt(versionB, 10) || 0;
  return versionNumA - versionNumB;
};

const formatSpec = (spec) => {
  if (!spec || spec === '???') return '???';
  const match = spec.match(/([A-Z]+\d*)[._\s]?(\d+)?/i);
  if (match) {
    const model = match[1].toUpperCase();
    const version = match[2] || '';
    return version ? `${model}.${version}` : model;
  }
  return spec;
};

// ====== МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ПО ЗОНЕ ======
function DetailsModal({ zoneName, label, count, details, onClose }) {
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  };
  const modalContentStyle = {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
    maxWidth: 1000, width: '90%', maxHeight: '80vh',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    display: 'flex', flexDirection: 'column',
  };
  const modalHeaderStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, gap: 12, flexWrap: 'wrap',
  };
  const modalTitleStyle = {
    fontSize: 20, fontWeight: 800, color: '#1F2937', margin: 0,
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  };
  const closeButtonStyle = {
    padding: '8px 12px', borderRadius: 8, border: 'none',
    background: '#F3F4F6', color: '#374151', fontSize: 16,
    fontWeight: 700, cursor: 'pointer',
  };
  const tableContainerStyle = { overflowY: 'auto', flex: 1 };
  const thStyle = {
    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
    color: '#374151', borderBottom: '2px solid #E5E7EB',
    background: '#F9FAFB', whiteSpace: 'nowrap',
    position: 'sticky', top: 0, zIndex: 5,
  };
  const tdStyle = {
    padding: '8px 12px', textAlign: 'left',
    borderBottom: '1px solid #F0F0F5', color: '#1F2937', fontSize: 13,
  };
  const recordsCountStyle = { fontSize: 13, color: '#6B7280', fontWeight: 500 };

  const handleExportDetails = () => {
    const exportData = details.map(d => ({
      'VIN': d.vin, 'MODEL': d.model, 'SPEC': d.spec,
      'LOT': d.lot, 'COLOR': d.color, 'SEQ': d.seq,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${zoneName}_${label}`);
    ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
    XLSX.writeFile(wb, `TL_Map_${zoneName}_${label}.xlsx`);
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={modalTitleStyle}>
            {zoneName} — {label} — {count} шт.
            <span style={recordsCountStyle}>Найдено записей: {details.length}</span>
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...exportButtonStyle, padding: '8px 16px', fontSize: 13 }} onClick={handleExportDetails}>📥 Экспорт</button>
            <button style={closeButtonStyle} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={tableContainerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>VIN</th>
                <th style={thStyle}>MODEL</th>
                <th style={thStyle}>SPEC</th>
                <th style={thStyle}>LOT</th>
                <th style={thStyle}>COLOR</th>
                <th style={thStyle}>SEQ</th>
              </tr>
            </thead>
            <tbody>
              {details.map((detail, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                  <td style={tdStyle}>{detail.vin}</td>
                  <td style={tdStyle}>{detail.model}</td>
                  <td style={tdStyle}>{detail.spec}</td>
                  <td style={tdStyle}>{detail.lot}</td>
                  <td style={tdStyle}>{detail.color}</td>
                  <td style={tdStyle}>{detail.seq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ====== МОДАЛЬНОЕ ОКНО ПРОШЕДШИХ ЗА СЕГОДНЯ ======
function PassedTodayModal({ zoneName, uniqueCount, totalRecords, details, onClose }) {
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  };
  const modalContentStyle = {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
    maxWidth: 1000, width: '90%', maxHeight: '80vh',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    display: 'flex', flexDirection: 'column',
  };
  const modalHeaderStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, gap: 12, flexWrap: 'wrap',
  };
  const modalTitleStyle = {
    fontSize: 20, fontWeight: 800, color: '#1F2937', margin: 0,
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  };
  const closeButtonStyle = {
    padding: '8px 12px', borderRadius: 8, border: 'none',
    background: '#F3F4F6', color: '#374151', fontSize: 16,
    fontWeight: 700, cursor: 'pointer',
  };
  const tableContainerStyle = { overflowY: 'auto', flex: 1 };
  const thStyle = {
    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
    color: '#374151', borderBottom: '2px solid #E5E7EB',
    background: '#F9FAFB', whiteSpace: 'nowrap',
    position: 'sticky', top: 0, zIndex: 5,
  };
  const tdStyle = {
    padding: '8px 12px', textAlign: 'left',
    borderBottom: '1px solid #F0F0F5', color: '#1F2937', fontSize: 13,
  };

  const handleExportDetails = () => {
    const exportData = details.map(d => ({
      'VIN': d.vin,
      'MODEL': d.model,
      'SEQ': d.seq,
      'ВРЕМЯ': d.pass_time ? new Date(d.pass_time).toLocaleTimeString('ru-RU') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${zoneName}_passed_today`);
    ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
    XLSX.writeFile(wb, `TL_Map_${zoneName}_passed_today.xlsx`);
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={modalTitleStyle}>
            {zoneName} — Прошло за сегодня
            <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
              Уникальных VIN: {uniqueCount} | Всего записей: {totalRecords}
            </span>
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...exportButtonStyle, padding: '8px 16px', fontSize: 13 }} onClick={handleExportDetails}>📥 Экспорт</button>
            <button style={closeButtonStyle} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={tableContainerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>VIN</th>
                <th style={thStyle}>MODEL</th>
                <th style={thStyle}>SEQ</th>
                <th style={thStyle}>ВРЕМЯ</th>
              </tr>
            </thead>
            <tbody>
              {details.map((detail, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                  <td style={tdStyle}>{detail.vin}</td>
                  <td style={tdStyle}>{detail.model}</td>
                  <td style={tdStyle}>{detail.seq}</td>
                  <td style={tdStyle}>{detail.pass_time ? new Date(detail.pass_time).toLocaleTimeString('ru-RU') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TLMapPage() {
  const [rawData, setRawData] = useState([]);
  const [passedTodayData, setPassedTodayData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModelFilter, setShowModelFilter] = useState(false);
  const [selectedModels, setSelectedModels] = useState(['A8', 'J6', 'J7', 'J8', 'MX']);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPassedToday, setSelectedPassedToday] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const ALL_MODELS = ['A8', 'J6', 'J7', 'J8', 'MX'];

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tl-map`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setRawData(json);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Ошибка TL Map:', err);
      setError('Нет данных');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPassedToday = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tl-map-passed-today`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();
      setPassedTodayData(json);
    } catch (err) {
      console.error('Ошибка passed today:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPassedToday();
  }, [fetchData, fetchPassedToday]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
      fetchPassedToday();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData, fetchPassedToday]);

  const processedData = useMemo(() => {
    const zonesMap = {};
    const detailsMap = {};
    
    rawData.forEach(row => {
      const zone = row.vehicle_status;
      const spec = formatSpec(row.spec);
      const model = row.model || spec.split('.')[0];
      
      if (!zone || !ZONE_ORDER.includes(zone)) return;
      
      const detailsKey = `${zone}_${spec}`;
      if (!detailsMap[detailsKey]) detailsMap[detailsKey] = [];
      detailsMap[detailsKey].push({
        vin: row.vin, model, spec, lot: row.lot, color: row.color, seq: row.seq,
      });
      
      if (!zonesMap[zone]) zonesMap[zone] = {};
      if (!zonesMap[zone][spec]) zonesMap[zone][spec] = 0;
      zonesMap[zone][spec]++;
    });
    
    // ВСЕГДА создаем все 5 зон
    const zones = ZONE_ORDER.map(zoneName => ({
      zoneName,
      items: zonesMap[zoneName] 
        ? Object.keys(zonesMap[zoneName]).map(spec => ({
            label: spec,
            count: zonesMap[zoneName][spec],
          }))
        : [],
    }));
    
    return { zones, detailsMap };
  }, [rawData]);

  const handleModelToggle = (model) => {
    setSelectedModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]);
  };

  const handleExportAll = () => {
    const exportData = [];
    zonesWithTotal.forEach(zone => {
      zone.items.forEach(item => {
        exportData.push({ 'Zone': zone.zoneName, 'Model': item.label, 'Count': item.count });
      });
      exportData.push({ 'Zone': zone.zoneName, 'Model': 'ИТОГО', 'Count': zone.total });
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TL Map');
    ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 10 }];
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `TL_Map_${dateStr}.xlsx`);
  };

  const handlePassedTodayClick = async (zoneName) => {
    try {
      const res = await fetch(`${API_BASE}/api/tl-map-passed-today-details?zone=${zoneName}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();
      
      setSelectedPassedToday({
        zoneName,
        uniqueCount: passedTodayData[zoneName] || 0,
        totalRecords: json.length,
        details: json,
      });
    } catch (err) {
      console.error('Ошибка загрузки деталей:', err);
    }
  };

  const filteredZones = processedData.zones.map(zone => ({
    ...zone,
    items: zone.items.filter(item => selectedModels.includes(item.label.split('.')[0]))
  }));

  const sortedZones = filteredZones.map(zone => ({
    ...zone,
    items: [...zone.items].sort(sortByModelAndVersion),
  }));

  const zonesWithTotal = sortedZones.map(zone => ({
    ...zone,
    total: zone.items.reduce((sum, item) => sum + (item.count || 0), 0),
  }));

  const handleItemClick = (zoneName, label, count) => {
    const detailsKey = `${zoneName}_${label}`;
    setSelectedItem({
      zoneName, label, count,
      details: processedData.detailsMap[detailsKey] || [],
    });
  };

  const handleCloseModal = () => setSelectedItem(null);
  const handleClosePassedToday = () => setSelectedPassedToday(null);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 16, padding: 40 }}>Загрузка данных...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: '#DC2626', fontSize: 16, padding: 40 }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, position: 'relative' }}>
      <style>{`
        .items-scroll::-webkit-scrollbar { width: 6px; }
        .items-scroll::-webkit-scrollbar-track { background: transparent; }
        .items-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 8px; }
        .items-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .items-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
      `}</style>
      
      <div style={headerStyle}>
        <h1 style={titleStyle}>Наполнение постов Testline</h1>
        <div style={headerButtonsStyle}>
          {lastUpdate && <span style={lastUpdateStyle}>Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}</span>}
          <button style={{ ...buttonStyle, background: showModelFilter ? '#1E40AF' : '#2563EB' }} onClick={() => setShowModelFilter(!showModelFilter)}>
            {showModelFilter ? 'Скрыть фильтр' : 'Модели'}
          </button>
          <button style={exportButtonStyle} onClick={handleExportAll}>📥 Экспорт</button>
        </div>
      </div>

      {showModelFilter && (
        <div style={filterContainerStyle}>
          {ALL_MODELS.map(model => (
            <label key={model} style={filterCheckboxStyle}>
              <input type="checkbox" checked={selectedModels.includes(model)} onChange={() => handleModelToggle(model)} />
              {model}
            </label>
          ))}
        </div>
      )}

      <div style={totalsRowStyle}>
        {zonesWithTotal.map(zone => (
          <div key={`total-${zone.zoneName}`} style={totalCardStyle}>
            <div style={totalLabelStyle}>{zone.zoneName}</div>
            <div style={totalValueStyle}>{zone.total}</div>
          </div>
        ))}
      </div>

      <div style={kanbanContainerStyle}>
        {zonesWithTotal.map(zone => (
          <div key={zone.zoneName} style={zoneColumnStyle}>
            <div style={zoneTitleStyle}>
              <span>{zone.zoneName}</span>
              <span
                style={zoneTotalBadgeStyle}
                onClick={() => handlePassedTodayClick(zone.zoneName)}
                title={`Прошло за сегодня: ${passedTodayData[zone.zoneName] || 0}. Нажмите для просмотра`}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#F3F4F6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#FFFFFF'; }}
              >
                {passedTodayData[zone.zoneName] || 0}
              </span>
            </div>
            <div className="items-scroll" style={itemsScrollStyle}>
              {zone.items.length > 0 ? (
                zone.items.map((item, idx) => (
                  <button
                    key={`${zone.zoneName}-${item.label}-${idx}`}
                    style={itemCardStyle(getColorByFirstLetter(item.label))}
                    onClick={() => handleItemClick(zone.zoneName, item.label, item.count)}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <span style={itemLabelStyle}>{item.label}</span>
                    <span style={itemCountStyle}>{item.count}</span>
                  </button>
                ))
              ) : (
                <div style={emptyZoneStyle}>Нет данных</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <DetailsModal
          zoneName={selectedItem.zoneName}
          label={selectedItem.label}
          count={selectedItem.count}
          details={selectedItem.details}
          onClose={handleCloseModal}
        />
      )}

      {selectedPassedToday && (
        <PassedTodayModal
          zoneName={selectedPassedToday.zoneName}
          uniqueCount={selectedPassedToday.uniqueCount}
          totalRecords={selectedPassedToday.totalRecords}
          details={selectedPassedToday.details}
          onClose={handleClosePassedToday}
        />
      )}
    </div>
  );
}