import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API_BASE = '';

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
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 28,
  marginBottom: 30,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
};

const thStyle = {
  padding: '12px 10px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
};

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nonAllOptions = options.filter(o => o !== 'ALL');
  const allSelected = selected.length === nonAllOptions.length && nonAllOptions.length > 0;

  const handleToggle = (value) => {
    if (value === 'ALL') {
      if (allSelected) {
        onChange([]);
      } else {
        onChange(nonAllOptions);
      }
    } else {
      const updated = selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value];
      onChange(updated);
    }
  };

  const displayText = selected.length === 0 || allSelected
    ? placeholder
    : selected.join(', ');

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...inputStyle,
          width: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
          cursor: 'pointer',
          textAlign: 'left',
          padding: '8px 10px',
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 80,
          fontSize: 13,
        }}>
          {displayText}
        </span>
        <span style={{ fontSize: 10, color: '#6B7280' }}>▼</span>
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: 12,
          minWidth: 200,
          zIndex: 100,
          border: '1px solid #F0F0F5',
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={allSelected} onChange={() => handleToggle('ALL')} />
            Все
          </label>
          {nonAllOptions.map(option => (
            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => handleToggle(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DefectElectronicsTopPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMpp, setExpandedMpp] = useState(null);
  const [vinData, setVinData] = useState([]);
  const [vinLoading, setVinLoading] = useState(false);

  const availableModels = ['ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];
  const availableGrades = ['A', 'B', 'C'];

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    setDateFrom(yStr);
    setDateTo(yStr);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const modelsParam = (selectedModels.length === 0 || selectedModels.length === availableModels.length) ? 'ALL' : selectedModels.join(',');
      const gradesParam = (selectedGrades.length === 0 || selectedGrades.length === availableGrades.length) ? 'ALL' : selectedGrades.join(',');

      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        model: modelsParam,
        grades: gradesParam,
      });
      const res = await fetch(`${API_BASE}/api/drr-electronics-top-defects?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const json = await res.json();
      setData(json);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVins = async (row) => {
    setVinLoading(true);
    try {
      const params = new URLSearchParams({
        partName: row.PART_NAME,
        problemType: row.PROBLEM_TYPE,
        model: row.MODEL,
        dateFrom,
        dateTo,
      });
      const res = await fetch(`${API_BASE}/api/drr-electronics-vins?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки VIN');
      const json = await res.json();
      setVinData(json);
    } catch (err) {
      alert(err.message);
    } finally {
      setVinLoading(false);
    }
  };

  const handleToggleMpp = (row) => {
    if (expandedMpp === row.MPP) {
      setExpandedMpp(null);
      setVinData([]);
    } else {
      setExpandedMpp(row.MPP);
      loadVins(row);
    }
  };

  const exportVins = () => {
    if (vinData.length === 0) return;
    const exportData = vinData.map(v => ({
      VIN: v.VIN,
      Модель: v.MODEL,
      Комментарий: v.COMMENT,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VINs');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `VIN_${expandedMpp}.xlsx`);
  };

  const exportFullReport = async () => {
    if (data.length === 0) return;
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      const summary = data.map(row => ({
        MPP: row.MPP,
        Модель: row.MODEL,
        'Кол-во авто': row.VIN_COUNT,
        'Кол-во дефектов': row.DEFECT_COUNT,
        'DPU per 1000': row.DPU,
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Топ MPP');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'Топ_дефектов_электроники.xlsx');
    } catch (err) {
      alert('Ошибка при экспорте: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>Топ дефектов электроники</h1>

      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Начало:
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Конец:
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Модели:
            <MultiSelect
              options={['ALL', ...availableModels]}
              selected={selectedModels}
              onChange={setSelectedModels}
              placeholder="Все"
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Классы:
            <MultiSelect
              options={['ALL', ...availableGrades]}
              selected={selectedGrades}
              onChange={setSelectedGrades}
              placeholder="Все"
            />
          </label>
          <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <button onClick={loadData} disabled={loading} style={buttonStyle}>
              {loading ? '⏳ Загрузка...' : '▶ Загрузить'}
            </button>
            <button onClick={exportFullReport} disabled={data.length === 0 || loading} style={{ ...buttonStyle, background: '#059669' }}>
              📊 Экспорт
            </button>
          </div>
        </div>

        {data.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <th style={thStyle}>MPP</th>
                  <th style={thStyle}>Модель</th>
                  <th style={thStyle}>Кол-во авто</th>
                  <th style={thStyle}>Кол-во дефектов</th>
                  <th style={thStyle}>DPU per 1000</th>
                  <th style={thStyle}>Пост внесения</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <React.Fragment key={row.MPP}>
                    <tr style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                      <td style={tdStyle}>{row.MPP}</td>
                      <td style={{ ...tdStyle, fontSize: '10px' }}>{row.MODEL}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.VIN_COUNT}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.DEFECT_COUNT}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.DPU}</td>
                      <td style={tdStyle}>{row.POST_NAME}</td>
                      <td style={tdStyle}>
                        <button onClick={() => handleToggleMpp(row)} style={{ ...buttonStyle, background: '#6B7280', padding: '4px 10px', fontSize: 12 }}>
                          {expandedMpp === row.MPP ? 'Скрыть VIN' : 'VIN'}
                        </button>
                      </td>
                    </tr>
                    {expandedMpp === row.MPP && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, margin: '8px 0' }}>
                            {vinLoading ? (
                              <p>Загрузка VIN...</p>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <span style={{ fontWeight: 600 }}>VIN для "{row.MPP}" ({vinData.length} шт.)</span>
                                  <button onClick={exportVins} style={{ ...buttonStyle, background: '#059669', padding: '4px 10px', fontSize: 12 }}>📊 Экспорт VIN</button>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#E5E7EB' }}>
                                      <th style={thStyle}>VIN</th>
                                      <th style={thStyle}>Модель</th>
                                      <th style={thStyle}>Комментарий</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {vinData.map((v, i) => (
                                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                        <td style={tdStyle}>{v.VIN}</td>
                                        <td style={tdStyle}>{v.MODEL}</td>
                                        <td style={tdStyle}>{v.COMMENT}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && data.length === 0 && (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Нет данных</p>
        )}
      </div>
    </div>
  );
}