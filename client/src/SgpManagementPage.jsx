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

const modelChipStyle = (active) => ({
  padding: '8px 16px',
  borderRadius: 20,
  border: active ? '2px solid #3B82F6' : '1px solid #E5E7EB',
  fontWeight: 600,
  fontSize: 13,
  background: active ? '#EFF6FF' : '#FFFFFF',
  color: active ? '#1D4ED8' : '#6B7280',
  cursor: 'pointer',
  boxShadow: active ? '0 2px 8px rgba(59,130,246,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});

// Стиль для кнопок-фильтров
const filterButtonStyle = (active) => ({
  padding: '6px 14px',
  borderRadius: 8,
  border: active ? '2px solid #3B82F6' : '1px solid #D1D5DB',
  fontWeight: 600,
  fontSize: 12,
  background: active ? '#EFF6FF' : '#FFFFFF',
  color: active ? '#1D4ED8' : '#6B7280',
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
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

const tableWrapperStyle = {
  maxHeight: 'calc(100vh - 400px)',
  overflowY: 'auto',
  borderRadius: 8,
  position: 'relative',
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
  verticalAlign: 'middle',
};

const totalRowStyle = {
  backgroundColor: '#F9FAFB',
  fontWeight: 800,
  borderTop: '2px solid #E5E7EB',
  position: 'sticky',
  bottom: 0,
  zIndex: 10,
  boxShadow: '0 -4px 6px -2px rgba(0,0,0,0.05)',
};

const statsContainerStyle = {
  display: 'flex',
  gap: 16,
  marginBottom: 16,
  flexWrap: 'wrap',
};

const statCardStyle = (borderColor) => ({
  padding: '12px 20px',
  borderRadius: 12,
  backgroundColor: '#F9FAFB',
  border: `2px solid ${borderColor}`,
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const filterContainerStyle = {
  display: 'flex',
  gap: 16,
  marginBottom: 20,
  flexWrap: 'wrap',
};

const filterGroupStyle = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const filterLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
  marginRight: 4,
};

export default function SgpManagementPage() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModel, setActiveModel] = useState('ALL');
  
  // Фильтры (множественный выбор)
  const [blockStatusFilter, setBlockStatusFilter] = useState([]);
  const [resolutionStatusFilter, setResolutionStatusFilter] = useState([]);
  const [storageStatusFilter, setStorageStatusFilter] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/sgp-management`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      
      // Группируем по VIN
      const groupedMap = {};
      
      json.forEach(row => {
        const vin = row.vin;
        
        if (!groupedMap[vin]) {
          groupedMap[vin] = {
            vin: row.vin,
            model: row.model,
            block_status: row.block_status,
            details: [],
          };
        }
        
        groupedMap[vin].details.push({
          reason: row.reason || '',
          resolution_status: row.resolution_status || '—',
          storage_status: row.storage_status || 'Unknown',
          location: row.location || '—',
        });
      });
      
      const groupedData = Object.values(groupedMap);
      setRawData(groupedData);
      setError(null);
    } catch (err) {
      console.error('Ошибка SGP Management:', err);
      setError('Нет данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allModels = useMemo(() => {
    const models = [...new Set(rawData.map(d => d.model))].filter(Boolean).sort();
    return models;
  }, [rawData]);

  const filteredByModel = useMemo(() => {
    if (activeModel === 'ALL') return rawData;
    return rawData.filter(d => d.model === activeModel);
  }, [rawData, activeModel]);

  // Применение фильтров
  const filteredData = useMemo(() => {
    let result = filteredByModel;
    
    // Фильтр по статусу блока
    if (blockStatusFilter.length > 0) {
      result = result.filter(d => blockStatusFilter.includes(d.block_status));
    }
    
    // Фильтр по статусу устранения
    if (resolutionStatusFilter.length > 0) {
      result = result.filter(d => 
        d.details?.some(detail => resolutionStatusFilter.includes(detail.resolution_status))
      );
    }
    
    // Фильтр по статусу хранения
    if (storageStatusFilter.length > 0) {
      result = result.filter(d => 
        d.details?.some(detail => storageStatusFilter.includes(detail.storage_status))
      );
    }
    
    return result;
  }, [filteredByModel, blockStatusFilter, resolutionStatusFilter, storageStatusFilter]);

  // Сброс фильтров при смене модели
  useEffect(() => {
    setBlockStatusFilter([]);
    setResolutionStatusFilter([]);
    setStorageStatusFilter([]);
  }, [activeModel]);

  // Статистика по выбранной модели (без учета фильтров)
  const stats = useMemo(() => {
    const totalInStock = filteredByModel.filter(d => 
      d.details?.some(detail => detail.storage_status === 'In stock')
    ).length;
    
    const totalOutbound = filteredByModel.filter(d => 
      d.details?.some(detail => detail.storage_status === 'Outbound')
    ).length;
    
    const totalBlock = filteredByModel.filter(d => d.block_status === 'Блок').length;
    const totalNotBlock = filteredByModel.filter(d => d.block_status === 'Не блок').length;
    
    return { totalInStock, totalOutbound, totalBlock, totalNotBlock };
  }, [filteredByModel]);

  // Переключение фильтра
  const toggleFilter = (filterType, value) => {
    if (filterType === 'block') {
      setBlockStatusFilter(prev => 
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else if (filterType === 'resolution') {
      setResolutionStatusFilter(prev => 
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else if (filterType === 'storage') {
      setStorageStatusFilter(prev => 
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    }
  };

  const handleExportCurrent = () => {
    const exportData = [];
    
    filteredData.forEach(d => {
      const details = d.details || [];
      if (details.length === 0) {
        exportData.push({
          'VIN': d.vin,
          'Модель': d.model,
          'Статус блок': d.block_status,
          'Причина': '',
          'Статус устранения': '',
          'Статус хранения': '',
          'Расположение': '',
        });
      } else {
        details.forEach((detail, i) => {
          exportData.push({
            'VIN': i === 0 ? d.vin : '',
            'Модель': i === 0 ? d.model : '',
            'Статус блок': i === 0 ? d.block_status : '',
            'Причина': detail.reason || '',
            'Статус устранения': detail.resolution_status || '',
            'Статус хранения': detail.storage_status || '',
            'Расположение': detail.location || '',
          });
        });
      }
    });
    
    exportData.push({
      'VIN': 'ИТОГО',
      'Модель': '',
      'Статус блок': '',
      'Причина': '',
      'Статус устранения': '',
      'Статус хранения': '',
      'Расположение': filteredData.length,
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const sheetName = activeModel === 'ALL' ? 'Все модели' : activeModel;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 50 },
      { wch: 15 }, { wch: 15 }, { wch: 25 },
    ];
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `SGP_Management_${activeModel === 'ALL' ? 'All' : activeModel}_${dateStr}.xlsx`);
  };

  const handleExportAll = () => {
    const exportData = [];
    
    rawData.forEach(d => {
      const details = d.details || [];
      if (details.length === 0) {
        exportData.push({
          'VIN': d.vin,
          'Модель': d.model,
          'Статус блок': d.block_status,
          'Причина': '',
          'Статус устранения': '',
          'Статус хранения': '',
          'Расположение': '',
        });
      } else {
        details.forEach((detail, i) => {
          exportData.push({
            'VIN': i === 0 ? d.vin : '',
            'Модель': i === 0 ? d.model : '',
            'Статус блок': i === 0 ? d.block_status : '',
            'Причина': detail.reason || '',
            'Статус устранения': detail.resolution_status || '',
            'Статус хранения': detail.storage_status || '',
            'Расположение': detail.location || '',
          });
        });
      }
    });
    
    exportData.push({
      'VIN': 'ИТОГО',
      'Модель': '',
      'Статус блок': '',
      'Причина': '',
      'Статус устранения': '',
      'Статус хранения': '',
      'Расположение': rawData.length,
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Все модели');
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 50 },
      { wch: 15 }, { wch: 15 }, { wch: 25 },
    ];
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `SGP_Management_All_${dateStr}.xlsx`);
  };

  if (loading && rawData.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 16, padding: 40 }}>
          Загрузка данных...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Заголовок */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>🚗 СГП Management</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={exportButtonStyle} onClick={handleExportAll}>
            📥 Экспорт всех
          </button>
          <button style={buttonStyle} onClick={fetchData}>
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* Переключатель моделей - чипсы */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={modelChipStyle(activeModel === 'ALL')} onClick={() => setActiveModel('ALL')}>
          <span style={{ fontWeight: 800 }}>Все модели</span>
          <span style={{ 
            background: activeModel === 'ALL' ? '#3B82F6' : '#E5E7EB',
            color: activeModel === 'ALL' ? '#FFFFFF' : '#6B7280',
            borderRadius: 10,
            padding: '1px 8px',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {rawData.length}
          </span>
        </div>
        {allModels.map(model => {
          const count = rawData.filter(d => d.model === model).length;
          return (
            <div 
              key={model} 
              style={modelChipStyle(activeModel === model)}
              onClick={() => setActiveModel(model)}
            >
              <span>{model}</span>
              <span style={{ 
                background: activeModel === model ? '#3B82F6' : '#E5E7EB',
                color: activeModel === model ? '#FFFFFF' : '#6B7280',
                borderRadius: 10,
                padding: '1px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Статистика по выбранной модели */}
      <div style={statsContainerStyle}>
        <div style={statCardStyle('#10B981')}>
          📦 Итого In stock: <span style={{ color: '#10B981', fontSize: 20, fontWeight: 800 }}>{stats.totalInStock}</span>
        </div>
        <div style={statCardStyle('#3B82F6')}>
          📤 Итого Outbound: <span style={{ color: '#3B82F6', fontSize: 20, fontWeight: 800 }}>{stats.totalOutbound}</span>
        </div>
        <div style={statCardStyle('#DC2626')}>
          🔴 Итого Блок: <span style={{ color: '#DC2626', fontSize: 20, fontWeight: 800 }}>{stats.totalBlock}</span>
        </div>
        <div style={statCardStyle('#059669')}>
          🟢 Итого Не блок: <span style={{ color: '#059669', fontSize: 20, fontWeight: 800 }}>{stats.totalNotBlock}</span>
        </div>
      </div>

      {/* Фильтры */}
      <div style={filterContainerStyle}>
        <div style={filterGroupStyle}>
          <span style={filterLabelStyle}>Статус блок:</span>
          <button 
            style={filterButtonStyle(blockStatusFilter.includes('Блок'))}
            onClick={() => toggleFilter('block', 'Блок')}
          >
            Блок
          </button>
          <button 
            style={filterButtonStyle(blockStatusFilter.includes('Не блок'))}
            onClick={() => toggleFilter('block', 'Не блок')}
          >
            Не блок
          </button>
        </div>
        
        <div style={filterGroupStyle}>
          <span style={filterLabelStyle}>Статус устранения:</span>
          <button 
            style={filterButtonStyle(resolutionStatusFilter.includes('Устранено'))}
            onClick={() => toggleFilter('resolution', 'Устранено')}
          >
            Устранено
          </button>
          <button 
            style={filterButtonStyle(resolutionStatusFilter.includes('Не устранено'))}
            onClick={() => toggleFilter('resolution', 'Не устранено')}
          >
            Не устранено
          </button>
        </div>
        
        <div style={filterGroupStyle}>
          <span style={filterLabelStyle}>Статус хранения:</span>
          <button 
            style={filterButtonStyle(storageStatusFilter.includes('In stock'))}
            onClick={() => toggleFilter('storage', 'In stock')}
          >
            In stock
          </button>
          <button 
            style={filterButtonStyle(storageStatusFilter.includes('Outbound'))}
            onClick={() => toggleFilter('storage', 'Outbound')}
          >
            Outbound
          </button>
          <button 
            style={filterButtonStyle(storageStatusFilter.includes('In stock (blocked)'))}
            onClick={() => toggleFilter('storage', 'In stock (blocked)')}
          >
            In stock (blocked)
          </button>
          <button 
            style={filterButtonStyle(storageStatusFilter.includes('Unknown'))}
            onClick={() => toggleFilter('storage', 'Unknown')}
          >
            Unknown
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <button style={exportButtonStyle} onClick={handleExportCurrent}>
            📥 Экспорт текущей таблицы ({filteredData.length})
          </button>
        </div>

        <div style={tableWrapperStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '17%' }}>VIN</th>
                <th style={{ ...thStyle, width: '11%' }}>Модель</th>
                <th style={{ ...thStyle, width: '9%' }}>Статус блок</th>
                <th style={{ ...thStyle, width: '22%' }}>Причина</th>
                <th style={{ ...thStyle, width: '11%' }}>Статус устранения</th>
                <th style={{ ...thStyle, width: '13%' }}>Статус хранения</th>
                <th style={{ ...thStyle, width: '17%' }}>Расположение</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, rowIdx) => {
                const details = row.details || [];
                
                if (details.length === 0) {
                  return (
                    <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                      <td style={{ ...tdStyle, fontWeight: 600, fontSize: 12 }}>{row.vin}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{row.model}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: row.block_status === 'Блок' ? '#FEE2E2' : '#D1FAE5',
                          color: row.block_status === 'Блок' ? '#991B1B' : '#065F46',
                        }}>
                          {row.block_status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#9CA3AF' }}>—</td>
                      <td style={{ ...tdStyle, color: '#9CA3AF' }}>—</td>
                      <td style={{ ...tdStyle, color: '#9CA3AF' }}>—</td>
                      <td style={{ ...tdStyle, color: '#9CA3AF' }}>—</td>
                    </tr>
                  );
                }
                
                return details.map((detail, detailIdx) => {
                  const isLastDetail = detailIdx === details.length - 1;
                  
                  return (
                    <tr key={`${rowIdx}-${detailIdx}`} style={{ 
                      backgroundColor: rowIdx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                    }}>
                      <td style={{ 
                        ...tdStyle, 
                        fontWeight: 600, 
                        fontSize: 12,
                        borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
                      }}>
                        {detailIdx === 0 ? row.vin : ''}
                      </td>
                      <td style={{ 
                        ...tdStyle, 
                        fontWeight: 700,
                        borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
                      }}>
                        {detailIdx === 0 ? row.model : ''}
                      </td>
                      <td style={{ 
                        ...tdStyle,
                        borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
                      }}>
                        {detailIdx === 0 ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: row.block_status === 'Блок' ? '#FEE2E2' : '#D1FAE5',
                            color: row.block_status === 'Блок' ? '#991B1B' : '#065F46',
                          }}>
                            {row.block_status}
                          </span>
                        ) : ''}
                      </td>
                      <td style={{ 
                        ...tdStyle, 
                        fontSize: 12, 
                        lineHeight: '1.4',
                        borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
                      }}>
                        {detail.reason || '—'}
                      </td>
                      <td style={{ 
                        ...tdStyle, 
                        fontSize: 12,
                        borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
                      }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: detail.resolution_status === 'Устранено' ? '#F0FDF4' : '#FEF3C7',
                          color: detail.resolution_status === 'Устранено' ? '#065F46' : '#92400E',
                        }}>
                          {detail.resolution_status || '—'}
                        </span>
                      </td>
                      <td style={{ 
                        ...tdStyle, 
                        fontSize: 12,
                        borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
                      }}>
                        {detail.storage_status || '—'}
                      </td>
                      <td style={{ 
                        ...tdStyle, 
                        fontSize: 12,
                        borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
                      }}>
                        {detail.location || '—'}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
            <tfoot>
              <tr style={totalRowStyle}>
                <td style={{ ...tdStyle, fontWeight: 800 }}>ИТОГО</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>{filteredData.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}