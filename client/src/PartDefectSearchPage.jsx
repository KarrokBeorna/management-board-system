import React, { useState } from 'react';
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
  boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
  flex: 1,
  minWidth: 0,
};

export default function PartDefectSearchPage() {
  // Левый блок
  const [leftPart, setLeftPart] = useState('');
  const [leftDefect, setLeftDefect] = useState('');
  const [leftModel, setLeftModel] = useState('ALL');
  const [leftDateFrom, setLeftDateFrom] = useState('');
  const [leftTimeFrom, setLeftTimeFrom] = useState('00:00');
  const [leftDateTo, setLeftDateTo] = useState('');
  const [leftTimeTo, setLeftTimeTo] = useState('23:59');
  const [leftData, setLeftData] = useState([]);
  const [leftLoading, setLeftLoading] = useState(false);
  const [leftError, setLeftError] = useState(null);

  // Правый блок
  const [rightVin, setRightVin] = useState('');
  const [rightModel, setRightModel] = useState('ALL');
  const [rightDateFrom, setRightDateFrom] = useState('');
  const [rightTimeFrom, setRightTimeFrom] = useState('00:00');
  const [rightDateTo, setRightDateTo] = useState('');
  const [rightTimeTo, setRightTimeTo] = useState('23:59');
  const [rightData, setRightData] = useState([]);
  const [rightLoading, setRightLoading] = useState(false);
  const [rightError, setRightError] = useState(null);

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

  const searchLeft = async () => {
    if (!leftPart.trim() && !leftDefect.trim() && leftModel === 'ALL') {
      alert('Заполните хотя бы одно поле');
      return;
    }
    setLeftLoading(true);
    setLeftError(null);
    try {
      const params = new URLSearchParams();
      if (leftPart.trim()) params.append('part', leftPart.trim());
      if (leftDefect.trim()) params.append('defect', leftDefect.trim());
      if (leftModel !== 'ALL') params.append('model', leftModel);
      if (leftDateFrom) params.append('dateFrom', `${leftDateFrom} ${leftTimeFrom}:00`);
      if (leftDateTo) params.append('dateTo', `${leftDateTo} ${leftTimeTo}:59`);
      const res = await fetch(`${API_BASE}/api/part-defect-search?${params.toString()}`);
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      const json = await res.json();
      setLeftData(Array.isArray(json) ? json : []);
    } catch (err) {
      setLeftError(err.message);
    } finally {
      setLeftLoading(false);
    }
  };

  const searchRight = async () => {
    if (!rightVin.trim() && rightModel === 'ALL') {
      alert('Заполните VIN или модель');
      return;
    }
    setRightLoading(true);
    setRightError(null);
    try {
      const params = new URLSearchParams();
      if (rightVin.trim()) params.append('vin', rightVin.trim());
      if (rightModel !== 'ALL') params.append('model', rightModel);
      if (rightDateFrom) params.append('dateFrom', `${rightDateFrom} ${rightTimeFrom}:00`);
      if (rightDateTo) params.append('dateTo', `${rightDateTo} ${rightTimeTo}:59`);
      const res = await fetch(`${API_BASE}/api/vin-defect-search?${params.toString()}`);
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      const json = await res.json();
      setRightData(Array.isArray(json) ? json : []);
      if (Array.isArray(json) && json.length === 0) {
        setRightError('Ничего не найдено');
      }
    } catch (err) {
      setRightError(err.message);
    } finally {
      setRightLoading(false);
    }
  };

  const exportToExcel = (data, filename) => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
  };

  const renderDateFilter = (dateFrom, setDateFrom, timeFrom, setTimeFrom, dateTo, setDateTo, timeTo, setTimeTo) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#4B5563' }}>С:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} style={timeInputStyle} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#4B5563' }}>По:</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} style={timeInputStyle} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>Part/Defect Search</h1>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* ========== ЛЕВЫЙ БЛОК ========== */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
            🔍 Поиск дефектов по детали/модели
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Деталь (часть названия)"
              value={leftPart}
              onChange={e => setLeftPart(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Дефект (часть названия)"
              value={leftDefect}
              onChange={e => setLeftDefect(e.target.value)}
              style={inputStyle}
            />
            <select value={leftModel} onChange={e => setLeftModel(e.target.value)} style={inputStyle}>
              {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все модели' : m}</option>)}
            </select>
            {renderDateFilter(leftDateFrom, setLeftDateFrom, leftTimeFrom, setLeftTimeFrom, leftDateTo, setLeftDateTo, leftTimeTo, setLeftTimeTo)}
            <button onClick={searchLeft} disabled={leftLoading} style={buttonStyle}>
              {leftLoading ? '⏳ Поиск...' : '🔎 Найти'}
            </button>
          </div>

          {leftError && <p style={{ color: '#DC2626', marginBottom: 12 }}>❌ {leftError}</p>}

          {leftData.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Найдено: {leftData.length}</span>
                <button onClick={() => exportToExcel(leftData, 'part_defect_search')} style={{ ...buttonStyle, background: '#059669', padding: '6px 12px', fontSize: 12 }}>
                  📊 Excel
                </button>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={thStyle}>VIN</th>
                      <th style={thStyle}>Дата внесения</th>
                      <th style={thStyle}>Текущий пост</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leftData.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        <td style={tdStyle}>{row.VIN}</td>
                        <td style={tdStyle}>{row.CREATION_TIME ? row.CREATION_TIME.replace('T', ' ').slice(0, 19) : ''}</td>
                        <td style={tdStyle}>{row.CURRENT_POST}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ========== ПРАВЫЙ БЛОК ========== */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
            🔍 Поиск дефектов по VIN/модели
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="VIN (или часть)"
              value={rightVin}
              onChange={e => setRightVin(e.target.value)}
              style={inputStyle}
            />
            <select value={rightModel} onChange={e => setRightModel(e.target.value)} style={inputStyle}>
              {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все модели' : m}</option>)}
            </select>
            {renderDateFilter(rightDateFrom, setRightDateFrom, rightTimeFrom, setRightTimeFrom, rightDateTo, setRightDateTo, rightTimeTo, setRightTimeTo)}
            <button onClick={searchRight} disabled={rightLoading} style={buttonStyle}>
              {rightLoading ? '⏳ Поиск...' : '🔎 Найти'}
            </button>
          </div>

          {rightError && <p style={{ color: '#DC2626', marginBottom: 12 }}>❌ {rightError}</p>}

          {rightData.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Найдено: {rightData.length}</span>
                <button onClick={() => exportToExcel(rightData, 'vin_defect_search')} style={{ ...buttonStyle, background: '#059669', padding: '6px 12px', fontSize: 12 }}>
                  📊 Excel
                </button>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={thStyle}>Деталь</th>
                      <th style={thStyle}>Дефект</th>
                      <th style={thStyle}>Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rightData.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        <td style={tdStyle}>{row.PART_NAME}</td>
                        <td style={tdStyle}>{row.PROBLEM_TYPE}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{row.DEFECT_COUNT}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
};