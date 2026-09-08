import React, { useState, useEffect, useRef } from 'react';
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
  const [selectedPosts, setSelectedPosts] = useState(['ROBOT']);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMppKey, setExpandedMppKey] = useState(null);
  const [vinData, setVinData] = useState([]);
  const [vinTopMpps, setVinTopMpps] = useState([]);
  const [vinLoading, setVinLoading] = useState(false);

  // Модалка VIN
  const [showVinDefectsModal, setShowVinDefectsModal] = useState(false);
  const [vinDefectsData, setVinDefectsData] = useState([]);
  const [vinDefectsLoading, setVinDefectsLoading] = useState(false);
  const [selectedVin, setSelectedVin] = useState('');

  // Фильтр топ MPP по типу
  const [topMppFilter, setTopMppFilter] = useState('all');

  const availableModels = ['ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];
  const availableGrades = ['A', 'B', 'C'];
  const availablePosts = ['ROBOT', 'CP7', 'CP8', 'PIP', 'TL', 'REPAIR', 'TEST TRACK'];

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    setDateFrom(yStr);
    setDateTo(yStr);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadData();
    }
  }, [dateFrom, dateTo, selectedModels, selectedGrades, selectedPosts]);

  const loadData = async () => {
    setLoading(true);
    try {
      const modelsParam = (selectedModels.length === 0 || selectedModels.length === availableModels.length) ? 'ALL' : selectedModels.join(',');
      const gradesParam = (selectedGrades.length === 0 || selectedGrades.length === availableGrades.length) ? 'ALL' : selectedGrades.join(',');
      const postsParam = (selectedPosts.length === 0 || selectedPosts.length === availablePosts.length) ? 'ALL' : selectedPosts.join(',');

      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        model: modelsParam,
        grades: gradesParam,
        posts: postsParam,
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

  const loadVinsAndTopMpps = async (row, idx) => {
    const key = `${row.MPP}_${row.POST_NAME}_${idx}`;
    setExpandedMppKey(key);
    setVinLoading(true);
    setVinData([]);
    setVinTopMpps([]);
    try {
      const params = new URLSearchParams({
        partName: row.PART_NAME,
        problemType: row.PROBLEM_TYPE || '',
        model: row.MODEL,
        dateFrom,
        dateTo,
      });

      const vinsRes = await fetch(`${API_BASE}/api/drr-electronics-vins?${params.toString()}`);
      if (!vinsRes.ok) throw new Error('Ошибка загрузки VIN');
      const vinsJson = await vinsRes.json();
      setVinData(vinsJson);

      const topMppRes = await fetch(`${API_BASE}/api/drr-electronics-vins-top-mpp?${params.toString()}`);
      if (!topMppRes.ok) throw new Error('Ошибка загрузки топ MPP');
      const topMppJson = await topMppRes.json();
      setVinTopMpps(topMppJson);
    } catch (err) {
      alert(err.message);
      setVinData([]);
      setVinTopMpps([]);
    } finally {
      setVinLoading(false);
    }
  };

  const handleToggleMpp = (row, idx) => {
    const key = `${row.MPP}_${row.POST_NAME}_${idx}`;
    if (expandedMppKey === key) {
      setExpandedMppKey(null);
      setVinData([]);
      setVinTopMpps([]);
    } else {
      loadVinsAndTopMpps(row, idx);
    }
  };

  const loadVinDefects = async (vin) => {
    setSelectedVin(vin);
    setShowVinDefectsModal(true);
    setVinDefectsLoading(true);
    try {
      const params = new URLSearchParams({ vin, dateFrom, dateTo });
      const res = await fetch(`${API_BASE}/api/drr-electronics-vin-defects?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки дефектов VIN');
      const json = await res.json();
      setVinDefectsData(json);
    } catch (err) {
      alert(err.message);
      setVinDefectsData([]);
    } finally {
      setVinDefectsLoading(false);
    }
  };

  const exportVins = () => {
    if (vinData.length === 0) return;
    const exportData = vinData.map(v => ({
      VIN: v.VIN,
      Модель: v.MODEL,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VINs');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `VIN_${expandedMppKey}.xlsx`);
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

  const filteredTopMpps = vinTopMpps.filter(mpp => {
    if (topMppFilter === 'offline') return mpp.IS_OFFLINE === 'Оффлайн';
    if (topMppFilter === 'online') return mpp.IS_OFFLINE === 'Онлайн';
    return true;
  });

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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Посты:
            <MultiSelect
              options={['ALL', ...availablePosts]}
              selected={selectedPosts}
              onChange={setSelectedPosts}
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
                  <React.Fragment key={`${row.MPP}_${row.POST_NAME}_${idx}`}>
                    <tr style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                      <td style={tdStyle}>{row.MPP}</td>
                      <td style={{ ...tdStyle, fontSize: '10px' }}>{row.MODEL}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.VIN_COUNT}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.DEFECT_COUNT}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.DPU}</td>
                      <td style={tdStyle}>{row.POST_NAME}</td>
                      <td style={tdStyle}>
                        <button onClick={() => handleToggleMpp(row, idx)} style={{ ...buttonStyle, background: '#6B7280', padding: '4px 10px', fontSize: 12 }}>
                          {expandedMppKey === `${row.MPP}_${row.POST_NAME}_${idx}` ? 'Скрыть VIN' : 'VIN'}
                        </button>
                      </td>
                    </tr>
                    {expandedMppKey === `${row.MPP}_${row.POST_NAME}_${idx}` && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, margin: '8px 0' }}>
                            {vinLoading ? (
                              <p>Загрузка VIN...</p>
                            ) : (
                              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                {/* ЛЕВАЯ КОЛОНКА: VIN */}
                                <div style={{ flex: '0 0 50%', maxWidth: '50%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 600 }}>VIN для "{row.MPP}" ({vinData.length} шт.)</span>
                                    <button onClick={exportVins} style={{ ...buttonStyle, background: '#059669', padding: '4px 10px', fontSize: 12 }}>📊 Экспорт VIN</button>
                                  </div>
                                  <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, margin: '0 auto' }}>
                                      <thead>
                                        <tr style={{ backgroundColor: '#E5E7EB' }}>
                                          <th style={thStyle}>VIN</th>
                                          <th style={thStyle}>Модель</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {vinData.map((v, i) => (
                                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                            <td
                                              onClick={() => loadVinDefects(v.VIN)}
                                              style={{ ...tdStyle, cursor: 'pointer', color: '#2563EB', textDecoration: 'underline' }}
                                            >
                                              {v.VIN}
                                            </td>
                                            <td style={tdStyle}>{v.MODEL}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* ПРАВАЯ КОЛОНКА: Топ MPP */}
                                <div style={{ flex: '0 0 50%', maxWidth: '50%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontWeight: 600 }}>Топ MPP для этих VIN</span>
                                    <select
                                      value={topMppFilter}
                                      onChange={(e) => setTopMppFilter(e.target.value)}
                                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 12 }}
                                    >
                                      <option value="all">Все</option>
                                      <option value="offline">Оффлайн</option>
                                      <option value="online">Онлайн</option>
                                    </select>
                                  </div>
                                  <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, margin: '0 auto', tableLayout: 'fixed' }}>
                                      <thead>
                                        <tr style={{ backgroundColor: '#E5E7EB' }}>
                                          <th style={{ ...thStyle, width: '55%', whiteSpace: 'normal', wordBreak: 'break-word' }}>MPP</th>
                                          <th style={{ ...thStyle, width: '20%' }}>Модель</th>
                                          <th style={{ ...thStyle, width: '10%' }}>Кол-во</th>
                                          <th style={{ ...thStyle, width: '15%' }}>Тип</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filteredTopMpps.map((mpp, i) => (
                                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                                            <td style={{ ...tdStyle, whiteSpace: 'normal', wordBreak: 'break-word' }}>{mpp.MPP}</td>
                                            <td style={tdStyle}>{mpp.MODEL}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{mpp.DEFECT_COUNT}</td>
                                            <td style={tdStyle}>{mpp.IS_OFFLINE}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
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

      {/* Модальное окно дефектов VIN */}
      {showVinDefectsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000,
        }} onClick={() => setShowVinDefectsModal(false)}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
            width: '90%', maxWidth: 700, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Дефекты VIN: {selectedVin}
              </h3>
              <button onClick={() => setShowVinDefectsModal(false)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            {vinDefectsLoading ? (
              <p>Загрузка...</p>
            ) : (
              <div style={{ overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={thStyle}>MPP</th>
                      <th style={thStyle}>Модель</th>
                      <th style={thStyle}>Кол-во</th>
                      <th style={thStyle}>Онлайн/Оффлайн</th>
                      <th style={thStyle}>Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vinDefectsData.map((d, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        <td style={tdStyle}>{d.MPP}</td>
                        <td style={tdStyle}>{d.MODEL}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{d.DEFECT_COUNT}</td>
                        <td style={tdStyle}>{d.IS_OFFLINE}</td>
                        <td style={tdStyle}>{d.COMMENT}</td>
                      </tr>
                    ))}
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