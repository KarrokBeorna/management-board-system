import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const API_BASE = '';

// ===== ФУНКЦИИ (СТАРЫЕ ЦВЕТА) =====
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getDayOfWeek(date) {
  return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date(date).getDay()];
}

function getDefectColor(value) {
  if (value === 0) return '#00B050';
  if (value <= 4)  return '#92D050';
  if (value <= 8)  return '#FFFF00';
  if (value <= 15) return '#FFC000';
  return '#FF0000';
}

function getDPUColor(value) {
  if (value === 0) return '#00B050';
  if (value <= 100) return '#92D050';
  if (value <= 200) return '#FFFF00';
  if (value <= 300) return '#FFC000';
  return '#FF0000';
}

function CarCell({ count, sticky }) {
  return (
    <div style={{
      ...styles.cars,
      ...(sticky ? { position: 'sticky', top: 36, zIndex: 9 } : {})
    }}>
      {count !== null ? count : '...'}
    </div>
  );
}

function CarsWeekSum({ sum, sticky }) {
  return (
    <div style={{
      ...styles.cars,
      ...(sticky ? { position: 'sticky', top: 36, zIndex: 9 } : {})
    }}>
      {sum !== null ? sum : '...'}
    </div>
  );
}

// ===== УЛУЧШЕННЫЙ ПОИСК =====
function SearchBar({ uniqueDefects, onSelect, selectedSearchItem, onClear }) {
  const [localQuery, setLocalQuery] = useState(selectedSearchItem ? selectedSearchItem.label : '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setLocalQuery(selectedSearchItem ? selectedSearchItem.label : '');
  }, [selectedSearchItem]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!localQuery.trim() || (selectedSearchItem && localQuery === selectedSearchItem.label)) return [];
    const q = localQuery.toLowerCase();
    return uniqueDefects.filter(d =>
      d.part.toLowerCase().includes(q) || d.defect.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [localQuery, uniqueDefects, selectedSearchItem]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 280 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 10, color: '#9CA3AF', fontSize: 14 }}>🔍</span>
        <input
          type="text"
          placeholder="Деталь или дефект..."
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            if (selectedSearchItem) onClear();
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          style={{ ...styles.filterSelect, paddingLeft: 32, paddingRight: 28, width: '100%' }}
        />
        {localQuery && (
          <button
            onClick={() => {
              setLocalQuery('');
              setShowSuggestions(false);
              onClear();
            }}
            style={{
              position: 'absolute',
              right: 8,
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: '#1F2937',
          border: '1px solid #374151',
          borderRadius: 8,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          maxHeight: 250,
          overflowY: 'auto'
        }}>
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                setLocalQuery(item.label);
                setShowSuggestions(false);
                onSelect(item);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                color: '#E5E7EB',
                fontSize: 13,
                borderBottom: '1px solid #374151',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ОСНОВНОЙ КОМПОНЕНТ =====
export default function ReportPage() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [checkpoint, setCheckpoint] = useState('CP7');
  const [defectType, setDefectType] = useState('default');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [unit, setUnit] = useState('defects');
  const [shift, setShift] = useState('all');

  const [sortDay, setSortDay] = useState(null);
  const [sortCW, setSortCW] = useState(null);

  const [carsCounts, setCarsCounts] = useState({});
  const [carsLoading, setCarsLoading] = useState(false);

  const [userNotes, setUserNotes] = useState({});
  const loadDataRef = useRef();

  const [hiddenRows, setHiddenRows] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedSearchItem, setSelectedSearchItem] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/defect-notes`)
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(n => { map[n.mpp] = n; });
        setUserNotes(map);
      })
      .catch(() => {});
  }, []);

  const handleNoteSave = async (mpp, field, value) => {
    const current = userNotes[mpp] || { responsible: '', action: '' };
    const updated = { ...current, [field]: value };
    setUserNotes(prev => ({ ...prev, [mpp]: updated }));

    try {
      const res = await fetch(`${API_BASE}/api/defect-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mpp,
          responsible: updated.responsible || '',
          action: updated.action || ''
        }),
      });
      const json = await res.json();
      if (json.success && json.note) {
        setUserNotes(prev => ({
          ...prev,
          [mpp]: { ...prev[mpp], updated_at: json.note.updated_at }
        }));
      }
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  };

  const { prevWeekDays, currWeekDays, prevWeekNum, currWeekNum, isMonday } = useMemo(() => {
    const today = new Date();
    const mondayThisWeek = getMonday(today);
    const mondayPrevWeek = new Date(mondayThisWeek);
    mondayPrevWeek.setDate(mondayPrevWeek.getDate() - 7);
    const prevDays = [], currDays = [];
    for (let i = 0; i < 7; i++) {
      prevDays.push(new Date(mondayPrevWeek.getTime() + i * 86400000));
      currDays.push(new Date(mondayThisWeek.getTime() + i * 86400000));
    }
    return {
      prevWeekDays: prevDays,
      currWeekDays: currDays,
      prevWeekNum: getWeekNumber(mondayPrevWeek),
      currWeekNum: getWeekNumber(mondayThisWeek),
      isMonday: today.getDay() === 1
    };
  }, []);

  const allDays = useMemo(() => [...prevWeekDays, ...currWeekDays], [prevWeekDays, currWeekDays]);

  const loadAllData = useCallback(() => {
    const params = new URLSearchParams();
    if (checkpoint !== 'ALL') params.append('checkpoint', checkpoint);
    if (defectType !== 'default') params.append('defectType', defectType);
    if (shift !== 'all') params.append('shift', shift);

    const defectsUrl = `${API_BASE}/api/defects-dashboard${params.toString() ? '?' + params.toString() : ''}`;

    setLoading(true);
    setError(null);

    fetch(defectsUrl)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRawData(data);
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const prevIndex = prevWeekDays.findIndex(d => d.toISOString().split('T')[0] === todayStr);
          const currIndex = currWeekDays.findIndex(d => d.toISOString().split('T')[0] === todayStr);
          if (prevIndex !== -1) {
            setSortDay({ week: 'prev', index: prevIndex });
          } else if (currIndex !== -1) {
            setSortDay({ week: 'curr', index: currIndex });
          }
        } else {
          setError('Неверный формат данных от сервера');
        }
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });

    if (!allDays.length) return;
    setCarsLoading(true);
    const carModel = selectedModel === 'ALL' ? null : selectedModel;
    const fetches = allDays.map(date => {
      const ds = date.toISOString().split('T')[0];
      const url = carModel
        ? `${API_BASE}/api/cars-count?model=${encodeURIComponent(carModel)}&date=${ds}`
        : `${API_BASE}/api/cars-count?date=${ds}`;
      return fetch(url).then(res => res.json());
    });

    Promise.all(fetches)
      .then(results => {
        const counts = {};
        allDays.forEach((date, i) => {
          const ds = date.toISOString().split('T')[0];
          counts[ds] = results[i]?.CARS_COUNT || 0;
        });
        setCarsCounts(counts);
        setCarsLoading(false);
      })
      .catch(() => setCarsLoading(false));
  }, [checkpoint, defectType, selectedModel, shift, allDays, prevWeekDays, currWeekDays]);

  useEffect(() => {
    loadDataRef.current = loadAllData;
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (loadDataRef.current) loadDataRef.current();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const uniqueDefects = useMemo(() => {
    if (!Array.isArray(rawData)) return [];
    const map = new Map();
    rawData.forEach(d => {
      const key = `${d.PART_NAME}|||${d.PROBLEM_TYPE}`;
      if (!map.has(key)) {
        map.set(key, {
          part: d.PART_NAME,
          defect: d.PROBLEM_TYPE,
          label: `${d.PART_NAME} ${d.PROBLEM_TYPE}`.trim()
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rawData]);

  const { models, rows, headerCarsPrev, headerCarsCurr, sumCarsPrev, sumCarsCurr } = useMemo(() => {
    if (!Array.isArray(rawData)) return {
      models: ['ALL'], rows: [], headerCarsPrev: [], headerCarsCurr: [], sumCarsPrev: 0, sumCarsCurr: 0
    };

    const modelSet = new Set(rawData.map(d => d.MODEL));
    const modelsArr = ['ALL', ...Array.from(modelSet).sort()];
    
    let filtered = selectedModel === 'ALL' ? rawData : rawData.filter(d => d.MODEL === selectedModel);
    
    if (selectedSearchItem) {
      filtered = filtered.filter(d => 
        d.PART_NAME === selectedSearchItem.part && 
        d.PROBLEM_TYPE === selectedSearchItem.defect
      );
    }

    const grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.MPP]) grouped[item.MPP] = { MPP: item.MPP, days: {} };
      if (!grouped[item.MPP].days[item.CREATION_TIME]) grouped[item.MPP].days[item.CREATION_TIME] = 0;
      grouped[item.MPP].days[item.CREATION_TIME] += item.DEFECTS_COUNT;
    });

    let resultRows = Object.values(grouped).map(g => {
      const row = { MPP: g.MPP, cellsPrev: [], cellsCurr: [], totalPrevDef: 0, totalCurrDef: 0 };

      prevWeekDays.forEach(date => {
        const ds = date.toISOString().split('T')[0];
        const v = g.days[ds] || 0;
        row.cellsPrev.push(v);
        row.totalPrevDef += v;
      });

      currWeekDays.forEach((date, i) => {
        const ds = date.toISOString().split('T')[0];
        const v = (isMonday && i > 0) ? 0 : (g.days[ds] || 0);
        row.cellsCurr.push(v);
        row.totalCurrDef += v;
      });

      return row;
    });

    if (sortCW) {
      resultRows.sort((a, b) => sortCW === 'prev' ? b.totalPrevDef - a.totalPrevDef : b.totalCurrDef - a.totalCurrDef);
    } else if (sortDay) {
      resultRows.sort((a, b) => {
        const va = sortDay.week === 'prev' ? a.cellsPrev[sortDay.index] : a.cellsCurr[sortDay.index];
        const vb = sortDay.week === 'prev' ? b.cellsPrev[sortDay.index] : b.cellsCurr[sortDay.index];
        return vb - va;
      });
    } else {
      resultRows.sort((a, b) => (b.totalPrevDef + b.totalCurrDef) - (a.totalPrevDef + a.totalCurrDef));
    }

    const carsPrev = prevWeekDays.map(d => carsCounts[d.toISOString().split('T')[0]] ?? 0);
    const carsCurr = currWeekDays.map((d, i) => (isMonday && i > 0) ? 0 : (carsCounts[d.toISOString().split('T')[0]] ?? 0));
    const sumPrev = carsPrev.reduce((s, v) => s + v, 0);
    const sumCurr = carsCurr.reduce((s, v) => s + v, 0);

    return {
      models: modelsArr,
      rows: resultRows,
      headerCarsPrev: carsPrev,
      headerCarsCurr: carsCurr,
      sumCarsPrev: sumPrev,
      sumCarsCurr: sumCurr
    };
  }, [rawData, selectedModel, prevWeekDays, currWeekDays, isMonday, sortDay, sortCW, carsCounts, selectedSearchItem]);

  const handleToggleRow = (mpp) => {
    setHiddenRows(prev => ({ ...prev, [mpp]: !prev[mpp] }));
  };

  const showAllRows = () => {
    setHiddenRows({});
  };

  const hiddenCount = Object.values(hiddenRows).filter(Boolean).length;

  if (loading || carsLoading) return <div style={styles.loading}>Загрузка...</div>;
  if (error) return <div style={styles.error}>Ошибка: {error}</div>;

  const isDPU = unit === 'dpu';
  const colorFunc = isDPU ? getDPUColor : getDefectColor;
  const formatDPU = (value) => value.toFixed(1);

  const responsibleOptions = ['', 'Сварка', 'Окраска', 'Сборка', 'Качество'];
  const actionOptions = ['', 'На контроле', 'Устранено', 'Требует проверки'];

  const stickyTop1 = 0;
  const stickyTop2 = 36;

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>Контроль качества</h1>
      
      {/* === УЛУЧШЕННАЯ ПАНЕЛЬ ФИЛЬТРОВ === */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Чекпоинт:</span>
          <select value={checkpoint} onChange={e => setCheckpoint(e.target.value)} style={styles.filterSelect}>
            <option value="ALL">Все</option>
            <option value="CP7">CP7</option>
            <option value="CP8">CP8</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Тип:</span>
          <select value={defectType} onChange={e => setDefectType(e.target.value)} style={styles.filterSelect}>
            <option value="default">Default</option>
            <option value="offline">Offline</option>
            <option value="online">Online</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Модель:</span>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={styles.filterSelect}>
            {models.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все модели' : m}</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: '#374151', margin: '0 8px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SearchBar 
            uniqueDefects={uniqueDefects} 
            selectedSearchItem={selectedSearchItem} 
            onSelect={setSelectedSearchItem} 
            onClear={() => setSelectedSearchItem(null)} 
          />
        </div>

        <div style={{ width: 1, height: 24, background: '#374151', margin: '0 8px' }} />

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Единицы:</span>
          <select value={unit} onChange={e => setUnit(e.target.value)} style={styles.filterSelect}>
            <option value="defects">Штуки</option>
            <option value="dpu">DPU per 1000</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Смена:</span>
          <select value={shift} onChange={e => setShift(e.target.value)} style={styles.filterSelect}>
            <option value="all">Сутки</option>
            <option value="A">Смена A</option>
            <option value="B">Смена B</option>
            <option value="C">Смена C</option>
          </select>
        </div>

        {sortDay && <span style={styles.sortInfo}>Сорт: день {sortDay.week==='prev'?'прошл':'тек'} {sortDay.index+1} <button onClick={()=>setSortDay(null)} style={styles.clearBtn}>✕</button></span>}
        {sortCW && <span style={styles.sortInfo}>Сорт: CW{sortCW==='prev'?prevWeekNum:currWeekNum} <button onClick={()=>setSortCW(null)} style={styles.clearBtn}>✕</button></span>}
      </div>

      {/* === ОБЕРТКА ДЛЯ ТАБЛИЦЫ (ЧТОБЫ НЕ ВЫЛЕЗАЛА) === */}
      <div style={{ overflowX: 'auto', width: '100%', paddingBottom: 20 }}>
        <div style={styles.grid}>
          {/* 1-я строка заголовков */}
          <div style={{ ...styles.dark, position: 'sticky', top: stickyTop1, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Дефект</span>
            {hiddenCount > 0 && (
              <button onClick={showAllRows} title="Показать все скрытые строки" style={{ background: 'transparent', border: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>👁️</span> {hiddenCount}
              </button>
            )}
          </div>
          <div style={{ ...styles.dark, position: 'sticky', top: stickyTop1, zIndex: 10 }}>Ответственный</div>
          <div style={{ ...styles.dark, position: 'sticky', top: stickyTop1, zIndex: 10 }}>Действие</div>

          {prevWeekDays.map((d, i) => (
            <div key={`ph${i}`} style={{ ...styles.hdr, position: 'sticky', top: stickyTop1, zIndex: 10 }}>
              <button onClick={() => { setSortCW(null); setSortDay(p => p?.week==='prev'&&p?.index===i?null:{week:'prev',index:i}); }} style={{ ...styles.sortBtn, background: sortDay?.week==='prev'&&sortDay?.index===i ? '#2563EB' : 'transparent', color: sortDay?.week==='prev'&&sortDay?.index===i ? '#FFF' : '#D1D5DB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2 }}>
                <span>{formatDate(d)}</span>
                <span>{getDayOfWeek(d)}</span>
              </button>
            </div>
          ))}
          <div style={{ ...styles.hdr, position: 'sticky', top: stickyTop1, zIndex: 10 }}>
            <button onClick={() => { setSortDay(null); setSortCW(p => p==='prev'?null:'prev'); }} style={{...styles.sortBtn, background: sortCW==='prev'?'#2563EB':'transparent', color: sortCW==='prev'?'#FFF':'#D1D5DB'}}>CW{prevWeekNum}</button>
          </div>

          {currWeekDays.map((d, i) => (
            <div key={`ch${i}`} style={{ ...styles.hdr, position: 'sticky', top: stickyTop1, zIndex: 10 }}>
              <button onClick={() => { setSortCW(null); setSortDay(p => p?.week==='curr'&&p?.index===i?null:{week:'curr',index:i}); }} style={{ ...styles.sortBtn, background: sortDay?.week==='curr'&&sortDay?.index===i ? '#2563EB' : 'transparent', color: sortDay?.week==='curr'&&sortDay?.index===i ? '#FFF' : '#D1D5DB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2 }}>
                <span>{formatDate(d)}</span>
                <span>{getDayOfWeek(d)}</span>
              </button>
            </div>
          ))}
          <div style={{ ...styles.hdr, position: 'sticky', top: stickyTop1, zIndex: 10 }}>
            <button onClick={() => { setSortDay(null); setSortCW(p => p==='curr'?null:'curr'); }} style={{...styles.sortBtn, background: sortCW==='curr'?'#2563EB':'transparent', color: sortCW==='curr'?'#FFF':'#D1D5DB'}}>CW{currWeekNum}</button>
          </div>

          {/* 2-я строка заголовков */}
          <div style={{ ...styles.dark, position: 'sticky', top: stickyTop2, zIndex: 9 }}>Кол-во машин</div>
          <div style={{ ...styles.dark, position: 'sticky', top: stickyTop2, zIndex: 9 }}></div>
          <div style={{ ...styles.dark, position: 'sticky', top: stickyTop2, zIndex: 9 }}></div>
          {headerCarsPrev.map((v, i) => <CarCell key={`hcp${i}`} count={v} sticky />)}
          <CarsWeekSum sum={sumCarsPrev} sticky />
          {headerCarsCurr.map((v, i) => <CarCell key={`hcc${i}`} count={v} sticky />)}
          <CarsWeekSum sum={sumCarsCurr} sticky />

          {/* Строки данных */}
          {rows.map((row) => {
            if (hiddenRows[row.MPP]) return null;
            const dpuPrev = sumCarsPrev > 0 ? (row.totalPrevDef * 1000) / sumCarsPrev : 0;
            const dpuCurr = sumCarsCurr > 0 ? (row.totalCurrDef * 1000) / sumCarsCurr : 0;
            const note = userNotes[row.MPP] || { responsible: '', action: '' };
            const isSelected = selectedRow === row.MPP;
            const selectedBoxShadow = isSelected ? 'inset 0 0 0 2px #FFFFFF' : undefined;

            return (
              <React.Fragment key={row.MPP}>
                <div
                  style={{
                    ...styles.name,
                    position: 'relative',
                    overflow: 'visible',
                    boxShadow: selectedBoxShadow,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => setSelectedRow(isSelected ? null : row.MPP)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleRow(row.MPP); }}
                    title="Свернуть строку"
                    style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 1 }}
                  >
                    ▾
                  </button>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.MPP}
                  </span>
                </div>

                <div style={{ ...styles.noteCell, boxShadow: selectedBoxShadow }}>
                  <select value={note.responsible} onChange={e => handleNoteSave(row.MPP, 'responsible', e.target.value)} style={styles.noteSelect}>
                    {responsibleOptions.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                  </select>
                  {note.updated_at && <div style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString('ru-RU')}</div>}
                </div>

                <div style={{ ...styles.noteCell, boxShadow: selectedBoxShadow }}>
                  <select value={note.action} onChange={e => handleNoteSave(row.MPP, 'action', e.target.value)} style={styles.noteSelect}>
                    {actionOptions.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                  </select>
                  {note.updated_at && <div style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString('ru-RU')}</div>}
                </div>

                {row.cellsPrev.map((defects, ci) => {
                  const dateStr = prevWeekDays[ci].toISOString().split('T')[0];
                  const cars = carsCounts[dateStr] || 0;
                  let value = isDPU ? (cars > 0 ? (defects * 1000) / cars : 0) : defects;
                  if (isDPU && value > 1000) value = 980;
                  const bg = colorFunc(value);
                  const textColor = isDPU ? (value > 300 ? '#FFF' : '#000') : (value > 15 ? '#FFF' : '#000');
                  return (
                    <div key={`cp${row.MPP}${ci}`} style={{ ...styles.val, background: bg, color: textColor, boxShadow: selectedBoxShadow }}>
                      {isDPU ? formatDPU(value) : value}
                    </div>
                  );
                })}
                <div style={{ ...styles.total, background: colorFunc(isDPU ? dpuPrev : row.totalPrevDef), color: (isDPU ? dpuPrev : row.totalPrevDef) > (isDPU ? 300 : 15) ? '#FFF' : '#000', boxShadow: selectedBoxShadow }}>
                  {isDPU ? formatDPU(dpuPrev) : row.totalPrevDef}
                </div>

                {row.cellsCurr.map((defects, ci) => {
                  const dateStr = currWeekDays[ci].toISOString().split('T')[0];
                  const cars = carsCounts[dateStr] || 0;
                  let value = isDPU ? (cars > 0 ? (defects * 1000) / cars : 0) : defects;
                  if (isDPU && value > 1000) value = 980;
                  const bg = colorFunc(value);
                  const textColor = isDPU ? (value > 300 ? '#FFF' : '#000') : (value > 15 ? '#FFF' : '#000');
                  return (
                    <div key={`cc${row.MPP}${ci}`} style={{ ...styles.val, background: bg, color: textColor, boxShadow: selectedBoxShadow }}>
                      {isDPU ? formatDPU(value) : value}
                    </div>
                  );
                })}
                <div style={{ ...styles.total, background: colorFunc(isDPU ? dpuCurr : row.totalCurrDef), color: (isDPU ? dpuCurr : row.totalCurrDef) > (isDPU ? 300 : 15) ? '#FFF' : '#000', boxShadow: selectedBoxShadow }}>
                  {isDPU ? formatDPU(dpuCurr) : row.totalCurrDef}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === СТИЛИ (СТАРАЯ ТАБЛИЦА + НОВЫЕ ФИЛЬТРЫ) ===
const styles = {
  app: { background: '#111827', minHeight: '100vh', padding: 20, fontFamily: 'Segoe UI, Arial, sans-serif', color: '#FFF' },
  title: { marginBottom: 20, fontSize: 22, fontWeight: 600 },
  
  // Новая панель фильтров
  filterBar: { 
    display: 'flex', 
    alignItems: 'flex-end', 
    gap: 16, 
    marginBottom: 20, 
    flexWrap: 'wrap',
    background: '#1F2937',
    padding: '16px 20px',
    borderRadius: 12,
    border: '1px solid #374151'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  filterLabel: { 
    fontSize: 12, 
    color: '#9CA3AF', 
    fontWeight: 600
  },
  filterSelect: { 
    padding: '8px 12px', 
    borderRadius: 8, 
    border: '1px solid #4B5563', 
    background: '#111827', 
    color: '#FFF', 
    fontSize: 13, 
    cursor: 'pointer',
    outline: 'none',
    minWidth: 100
  },
  sortInfo: { 
    fontSize: 12, 
    color: '#60A5FA', 
    display: 'flex', 
    alignItems: 'center', 
    gap: 5,
    background: '#1E3A8A',
    padding: '4px 10px',
    borderRadius: 6,
    marginLeft: 'auto'
  },
  clearBtn: { background: '#EF4444', color: '#FFF', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 10, padding: '1px 5px' },

  // СТАРАЯ ТАБЛИЦА
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 2fr) 110px 110px repeat(7, 60px) 60px repeat(7, 60px) 60px',
    border: '1px solid #4B5563',
    fontSize: 13,
    minWidth: 1100 // Чтобы на узких экранах не сжималась в кашу, а появлялся скролл
  },
  dark: { background: '#1F2937', padding: '6px 8px', fontWeight: 600, border: '1px solid #4B5563', display: 'flex', alignItems: 'center', fontSize: 11 },
  hdr: { background: '#374151', padding: 4, fontWeight: 600, border: '1px solid #4B5563', textAlign: 'center', fontSize: 11 },
  sortBtn: { border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '4px 6px', borderRadius: 4, width: '100%' },
  cars: { background: '#374151', padding: '4px 3px', border: '1px solid #4B5563', textAlign: 'center', fontSize: 11, color: '#D1D5DB', minHeight: 19, whiteSpace: 'nowrap' },
  name: { background: '#1F2937', padding: '6px 8px', fontWeight: 600, border: '1px solid #4B5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 },
  noteCell: { background: '#1F2937', padding: '2px 4px', border: '1px solid #4B5563', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  noteSelect: { width: '100%', padding: '2px 4px', borderRadius: 4, border: '1px solid #4B5563', background: '#374151', color: '#FFF', fontSize: 11, cursor: 'pointer' },
  noteDate: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
  val: { padding: '6px 4px', border: '1px solid #4B5563', textAlign: 'center', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  total: { padding: '6px 4px', border: '1px solid #4B5563', textAlign: 'center', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' },
  loading: { textAlign: 'center', padding: 50, fontSize: 18, color: '#9CA3AF' },
  error: { textAlign: 'center', padding: 50, fontSize: 18, color: '#EF4444' },
};