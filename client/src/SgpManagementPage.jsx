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
  maxHeight: 'calc(100vh - 350px)',
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
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'background 0.2s',
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

const statsContainerStyle = {
  display: 'flex',
  gap: 16,
  marginBottom: 20,
  flexWrap: 'wrap',
};

const statCardStyle = (color) => ({
  padding: '12px 20px',
  borderRadius: 12,
  backgroundColor: '#F9FAFB',
  border: `2px solid ${color}`,
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export default function SgpManagementPage() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModel, setActiveModel] = useState('ALL');
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, left: 0 });
  
  // Множественные фильтры: { columnName: [selectedValues] }
  const [filters, setFilters] = useState({
    storage_status: ['In stock'],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/sgp-management`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setRawData(json);
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

  const getUniqueValues = (field) => {
    let values = [];
    
    if (field === 'block_status') {
      values = filteredByModel.map(d => d.block_status);
    } else if (field === 'storage_status') {
      filteredByModel.forEach(d => {
        d.details?.forEach(detail => {
          values.push(detail.storage_status);
        });
      });
    } else if (field === 'resolution_status') {
      filteredByModel.forEach(d => {
        d.details?.forEach(detail => {
          values.push(detail.resolution_status);
        });
      });
    } else {
      values = filteredByModel.map(d => d[field]);
    }
    
    return [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))].sort();
  };

  // Фильтрация с множественным выбором
  const filteredData = useMemo(() => {
    let result = filteredByModel;
    
    Object.keys(filters).forEach(field => {
      const selectedValues = filters[field];
      if (selectedValues && selectedValues.length > 0 && !selectedValues.includes('ALL')) {
        result = result.filter(d => {
          if (field === 'block_status') {
            return selectedValues.includes(d.block_status);
          } else if (field === 'storage_status') {
            return d.details?.some(detail => selectedValues.includes(detail.storage_status));
          } else if (field === 'resolution_status') {
            return d.details?.some(detail => selectedValues.includes(detail.resolution_status));
          } else {
            return selectedValues.includes(d[field]);
          }
        });
      }
    });
    
    return result;
  }, [filteredByModel, filters]);

  useEffect(() => {
    setFilters({ storage_status: ['In stock'] });
    setActiveFilterColumn(null);
  }, [activeModel]);

  // Статистика
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

  const handleHeaderClick = (column, event) => {
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
    setFilters(prev => {
      const currentValues = prev[column] || [];
      let newValues;
      
      if (value === 'ALL') {
        // Если выбрали "Все" - очищаем фильтр для этой колонки
        newValues = [];
      } else if (currentValues.includes(value)) {
        // Убираем значение
        newValues = currentValues.filter(v => v !== value);
      } else {
        // Добавляем значение
        newValues = [...currentValues, value];
      }
      
      return { ...prev, [column]: newValues };
    });
  };

  const handleFilterSelectAll = (column) => {
    setFilters(prev => ({ ...prev, [column]: [] }));
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

      {/* Статистика */}
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
        <div style={statCardStyle('#10B981')}>
          🟢 Итого Не блок: <span style={{ color: '#10B981', fontSize: 20, fontWeight: 800 }}>{stats.totalNotBlock}</span>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <button style={exportButtonStyle} onClick={handleExportCurrent}>
            📥 Экспорт текущей таблицы
          </button>
        </div>

        <div style={tableWrapperStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th 
                  style={{ ...thStyle, width: '17%', background: filters.vin?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                  onClick={(e) => handleHeaderClick('vin', e)}
                >
                  VIN {filters.vin?.length > 0 ? `(${filters.vin.length})` : ''} {activeFilterColumn === 'vin' ? '▼' : '▼'}
                </th>
                <th 
                  style={{ ...thStyle, width: '11%', background: filters.model?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                  onClick={(e) => handleHeaderClick('model', e)}
                >
                  Модель {filters.model?.length > 0 ? `(${filters.model.length})` : ''} ▼
                </th>
                <th 
                  style={{ ...thStyle, width: '9%', background: filters.block_status?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                  onClick={(e) => handleHeaderClick('block_status', e)}
                >
                  Статус блок {filters.block_status?.length > 0 ? `(${filters.block_status.length})` : ''} ▼
                </th>
                <th style={{ ...thStyle, width: '22%', cursor: 'default' }}>Причина</th>
                <th 
                  style={{ ...thStyle, width: '11%', background: filters.resolution_status?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                  onClick={(e) => handleHeaderClick('resolution_status', e)}
                >
                  Статус устранения {filters.resolution_status?.length > 0 ? `(${filters.resolution_status.length})` : ''} ▼
                </th>
                <th 
                  style={{ ...thStyle, width: '13%', background: filters.storage_status?.length > 0 ? '#DBEAFE' : '#F9FAFB' }}
                  onClick={(e) => handleHeaderClick('storage_status', e)}
                >
                  Статус хранения {filters.storage_status?.length > 0 ? `(${filters.storage_status.length})` : ''} ▼
                </th>
                <th style={{ ...thStyle, width: '17%', cursor: 'default' }}>Расположение</th>
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
                      borderBottom: isLastDetail ? '2px solid #D1D5DB' : '1px solid #F3F4F6',
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
                          backgroundColor: detail.resolution_status === 'Устранено' ? '#F0FDF4' : detail.resolution_status === 'Не устранено' ? '#FEF3C7' : '#F3F4F6',
                          color: detail.resolution_status === 'Устранено' ? '#065F46' : detail.resolution_status === 'Не устранено' ? '#92400E' : '#9CA3AF',
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

      {/* Выпадающий фильтр с множественным выбором */}
      {activeFilterColumn && (
        <div style={{
          ...filterDropdownStyle,
          top: filterDropdownPos.top,
          left: filterDropdownPos.left,
        }}>
          <div 
            style={{ ...filterOptionStyle, fontWeight: 700, borderBottom: '1px solid #E5E7EB', marginBottom: 4 }}
            onClick={() => handleFilterSelectAll(activeFilterColumn)}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <input 
              type="checkbox" 
              checked={!filters[activeFilterColumn] || filters[activeFilterColumn].length === 0}
              readOnly
            />
            Все значения
          </div>
          {getUniqueValues(activeFilterColumn).map(val => {
            const isChecked = filters[activeFilterColumn]?.includes(val);
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
  );
}