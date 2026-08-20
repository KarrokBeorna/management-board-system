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

const modelTabStyle = (active) => ({
  padding: '10px 24px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 600,
  fontSize: 14,
  background: active ? '#3B82F6' : '#F3F4F6',
  color: active ? '#FFFFFF' : '#6B7280',
  cursor: 'pointer',
  boxShadow: active ? '0 4px 12px rgba(59,130,246,0.25)' : 'none',
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
  maxHeight: 'calc(100vh - 300px)',
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
};

const tdStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  borderBottom: '1px solid #F3F4F6',
  color: '#1F2937',
  fontSize: 13,
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

const filterContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 16,
  padding: 12,
  backgroundColor: '#F9FAFB',
  borderRadius: 8,
  border: '1px solid #E5E7EB',
};

const filterSelectStyle = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #D1D5DB',
  fontSize: 13,
  background: '#FFFFFF',
  cursor: 'pointer',
  minWidth: 150,
};

export default function SgpManagementPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModel, setActiveModel] = useState('ALL');
  const [filters, setFilters] = useState({});

  // Получение данных
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/sgp-management`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData(json);
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

  // Список моделей
  const allModels = useMemo(() => {
    const models = [...new Set(data.map(d => d.model))].filter(Boolean).sort();
    return models;
  }, [data]);

  // Фильтрация по модели
  const filteredByModel = useMemo(() => {
    if (activeModel === 'ALL') return data;
    return data.filter(d => d.model === activeModel);
  }, [data, activeModel]);

  // Уникальные значения для фильтров
  const getUniqueValues = (field) => {
    const values = [...new Set(filteredByModel.map(d => d[field]).filter(v => v !== null && v !== undefined && v !== ''))];
    return values.sort();
  };

  // Применение фильтров
  const filteredData = useMemo(() => {
    let result = filteredByModel;
    
    Object.keys(filters).forEach(field => {
      const filterValue = filters[field];
      if (filterValue && filterValue !== 'ALL') {
        result = result.filter(d => {
          const val = d[field];
          if (typeof val === 'string') {
            return val.toLowerCase().includes(filterValue.toLowerCase());
          }
          return val === filterValue;
        });
      }
    });
    
    return result;
  }, [filteredByModel, filters]);

  // Сброс фильтров при смене модели
  useEffect(() => {
    setFilters({});
  }, [activeModel]);

  // Экспорт текущей таблицы
  const handleExportCurrent = () => {
    const exportData = filteredData.map(d => ({
      'VIN': d.vin,
      'Модель': d.model,
      'Статус блок': d.block_status,
      'Причина': d.reason,
      'Статус устранения': d.resolution_status,
      'Статус хранения': d.storage_status,
      'Расположение': d.location,
    }));
    
    // Добавляем строку "Итого"
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

  // Экспорт всех моделей
  const handleExportAll = () => {
    const exportData = data.map(d => ({
      'VIN': d.vin,
      'Модель': d.model,
      'Статус блок': d.block_status,
      'Причина': d.reason,
      'Статус устранения': d.resolution_status,
      'Статус хранения': d.storage_status,
      'Расположение': d.location,
    }));
    
    // Добавляем строку "Итого"
    exportData.push({
      'VIN': 'ИТОГО',
      'Модель': '',
      'Статус блок': '',
      'Причина': '',
      'Статус устранения': '',
      'Статус хранения': '',
      'Расположение': data.length,
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

  if (loading && data.length === 0) {
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

      {/* Переключатель моделей */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveModel('ALL')} style={modelTabStyle(activeModel === 'ALL')}>
          Все модели ({data.length})
        </button>
        {allModels.map(model => {
          const count = data.filter(d => d.model === model).length;
          return (
            <button 
              key={model} 
              onClick={() => setActiveModel(model)} 
              style={modelTabStyle(activeModel === model)}
            >
              {model} ({count})
            </button>
          );
        })}
      </div>

      <div style={cardStyle}>
        {/* Фильтры */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <button style={exportButtonStyle} onClick={handleExportCurrent}>
            📥 Экспорт текущей таблицы
          </button>
          
          {/* Фильтр по статусу блок */}
          <select 
            style={filterSelectStyle}
            value={filters.block_status || 'ALL'}
            onChange={(e) => setFilters(prev => ({ ...prev, block_status: e.target.value }))}
          >
            <option value="ALL">Все статусы блок</option>
            {getUniqueValues('block_status').map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
          
          {/* Фильтр по статусу устранения */}
          <select 
            style={filterSelectStyle}
            value={filters.resolution_status || 'ALL'}
            onChange={(e) => setFilters(prev => ({ ...prev, resolution_status: e.target.value }))}
          >
            <option value="ALL">Все статусы устранения</option>
            {getUniqueValues('resolution_status').map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
          
          {/* Фильтр по статусу хранения */}
          <select 
            style={filterSelectStyle}
            value={filters.storage_status || 'ALL'}
            onChange={(e) => setFilters(prev => ({ ...prev, storage_status: e.target.value }))}
          >
            <option value="ALL">Все статусы хранения</option>
            {getUniqueValues('storage_status').map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>

        {/* Таблица */}
        <div style={tableWrapperStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '18%' }}>VIN</th>
                <th style={{ ...thStyle, width: '12%' }}>Модель</th>
                <th style={{ ...thStyle, width: '10%' }}>Статус блок</th>
                <th style={{ ...thStyle, width: '30%' }}>Причина</th>
                <th style={{ ...thStyle, width: '12%' }}>Статус устранения</th>
                <th style={{ ...thStyle, width: '12%' }}>Статус хранения</th>
                <th style={{ ...thStyle, width: '16%' }}>Расположение</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
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
                  <td style={{ ...tdStyle, fontSize: 12, lineHeight: '1.4' }}>{row.reason || ''}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: row.resolution_status === 'Устранено' ? '#D1FAE5' : '#FEF3C7',
                      color: row.resolution_status === 'Устранено' ? '#065F46' : '#92400E',
                    }}>
                      {row.resolution_status || '—'}
                    </span>
                  </td>
                  <td style={tdStyle}>{row.storage_status}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{row.location}</td>
                </tr>
              ))}
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