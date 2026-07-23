import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ==================== УТИЛИТЫ ====================
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

// ==================== КОМПОНЕНТЫ ====================
function CarCell({ count }) {
  return <div style={styles.cars}>{count !== null ? count : '...'}</div>;
}

function CarsWeekSum({ sum }) {
  return <div style={styles.cars}>{sum !== null ? sum : '...'}</div>;
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================
export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [checkpoint, setCheckpoint] = useState('CP7');
  const [defectType, setDefectType] = useState('default'); // 'default', 'offline', 'online'
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [unit, setUnit] = useState('defects');

  const [sortDay, setSortDay] = useState(null);
  const [sortCW, setSortCW] = useState(null);

  const [carsCounts, setCarsCounts] = useState({});
  const [carsLoading, setCarsLoading] = useState(false);

  const [userNotes, setUserNotes] = useState({});

  const loadDataRef = useRef();

  // Заметки
  useEffect(() => {
    fetch('http://localhost:40000/api/defect-notes')
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(n => { map[n.mpp] = n; });
        setUserNotes(map);
      })
      .catch(() => {});
  }, []);

  const handleNoteSave = (mpp, field, value) => {
    const current = userNotes[mpp] || { responsible: '', action: '' };
    const updated = { ...current, [field]: value };
    setUserNotes(prev => ({ ...prev, [mpp]: updated }));

    fetch('http://localhost:40000/api/defect-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mpp, responsible: updated.responsible, action: updated.action }),
    }).catch(err => console.error('Ошибка сохранения:', err));
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
    const defectsUrl = `http://localhost:40000/api/defects-dashboard${params.toString() ? '?' + params.toString() : ''}`;

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
        ? `http://localhost:40000/api/cars-count?model=${encodeURIComponent(carModel)}&date=${ds}`
        : `http://localhost:40000/api/cars-count?date=${ds}`;
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
  }, [checkpoint, defectType, selectedModel, allDays, prevWeekDays, currWeekDays]);

  useEffect(() => {
    loadDataRef.current = loadAllData;
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (loadDataRef.current) loadDataRef.current();
    }, 600000);
    return () => clearInterval(interval);
  }, []);

  const { models, rows, headerCarsPrev, headerCarsCurr, sumCarsPrev, sumCarsCurr, totalPrevSum, totalCurrSum } = useMemo(() => {
    if (!Array.isArray(rawData)) return {
      models: ['ALL'], rows: [], headerCarsPrev: [], headerCarsCurr: [],
      sumCarsPrev: 0, sumCarsCurr: 0, totalPrevSum: 0, totalCurrSum: 0
    };

    const modelSet = new Set(rawData.map(d => d.MODEL));
    const modelsArr = ['ALL', ...Array.from(modelSet).sort()];
    const filtered = selectedModel === 'ALL' ? rawData : rawData.filter(d => d.MODEL === selectedModel);

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

    const totalPrevDef = resultRows.reduce((s, r) => s + r.totalPrevDef, 0);
    const totalCurrDef = resultRows.reduce((s, r) => s + r.totalCurrDef, 0);

    return {
      models: modelsArr,
      rows: resultRows,
      headerCarsPrev: carsPrev,
      headerCarsCurr: carsCurr,
      sumCarsPrev: sumPrev,
      sumCarsCurr: sumCurr,
      totalPrevSum: totalPrevDef,
      totalCurrSum: totalCurrDef
    };
  }, [rawData, selectedModel, prevWeekDays, currWeekDays, isMonday, sortDay, sortCW, carsCounts]);

  if (loading || carsLoading) return <div style={styles.loading}>Загрузка...</div>;
  if (error) return <div style={styles.error}>Ошибка: {error}</div>;

  const isDPU = unit === 'dpu';
  const colorFunc = isDPU ? getDPUColor : getDefectColor;
  const formatDPU = (value) => value.toFixed(1);

  const responsibleOptions = ['', 'Сварка', 'Окраска', 'Сборка', 'Качество'];
  const actionOptions = ['', 'На контроле', 'Устранено', 'Требует проверки'];

  const gridStyle = {
    ...styles.grid,
    gridTemplateColumns: 'minmax(300px, 2fr) 110px 110px repeat(7, 60px) 60px repeat(7, 60px) 60px'
  };

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>Контроль качества</h1>
      <div style={styles.filterBar}>
        <span style={styles.filterLabel}>Чекпоинт:</span>
        <select value={checkpoint} onChange={e => setCheckpoint(e.target.value)} style={styles.filterSelect}>
          <option value="ALL">Все</option>
          <option value="CP7">CP7</option>
          <option value="CP8">CP8</option>
        </select>

        <span style={styles.filterLabel}>Тип:</span>
        <select value={defectType} onChange={e => setDefectType(e.target.value)} style={styles.filterSelect}>
          <option value="default">Default</option>
          <option value="offline">Offline</option>
          <option value="online">Online</option>
        </select>

        <span style={styles.filterLabel}>Модель:</span>
        <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={styles.filterSelect}>
          {models.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все модели' : m}</option>)}
        </select>

        <span style={styles.filterLabel}>Единицы:</span>
        <select value={unit} onChange={e => setUnit(e.target.value)} style={styles.filterSelect}>
          <option value="defects">Штуки</option>
          <option value="dpu">DPU per 1000</option>
        </select>

        {sortDay && <span style={styles.sortInfo}>Сорт: день {sortDay.week==='prev'?'прошл':'тек'} {sortDay.index+1} <button onClick={()=>setSortDay(null)} style={styles.clearBtn}>✕</button></span>}
        {sortCW && <span style={styles.sortInfo}>Сорт: CW{sortCW==='prev'?prevWeekNum:currWeekNum} <button onClick={()=>setSortCW(null)} style={styles.clearBtn}>✕</button></span>}
      </div>

      <div style={gridStyle}>
        {/* Шапка */}
        <div style={styles.dark}>Дефект</div>
        <div style={styles.dark}>Ответственный</div>
        <div style={styles.dark}>Действие</div>

        {prevWeekDays.map((d, i) => (
          <div key={`ph${i}`} style={styles.hdr}>
            <button
              onClick={() => { setSortCW(null); setSortDay(p => p?.week==='prev'&&p?.index===i?null:{week:'prev',index:i}); }}
              style={{
                ...styles.sortBtn,
                background: sortDay?.week==='prev'&&sortDay?.index===i ? '#2563EB' : 'transparent',
                color: sortDay?.week==='prev'&&sortDay?.index===i ? '#FFF' : '#D1D5DB',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1.2,
              }}
            >
              <span>{formatDate(d)}</span>
              <span>{getDayOfWeek(d)}</span>
            </button>
          </div>
        ))}

        <div style={styles.hdr}>
          <button onClick={() => { setSortDay(null); setSortCW(p => p==='prev'?null:'prev'); }} style={{...styles.sortBtn, background: sortCW==='prev'?'#2563EB':'transparent', color: sortCW==='prev'?'#FFF':'#D1D5DB'}}>CW{prevWeekNum}</button>
        </div>

        {currWeekDays.map((d, i) => (
          <div key={`ch${i}`} style={styles.hdr}>
            <button
              onClick={() => { setSortCW(null); setSortDay(p => p?.week==='curr'&&p?.index===i?null:{week:'curr',index:i}); }}
              style={{
                ...styles.sortBtn,
                background: sortDay?.week==='curr'&&sortDay?.index===i ? '#2563EB' : 'transparent',
                color: sortDay?.week==='curr'&&sortDay?.index===i ? '#FFF' : '#D1D5DB',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1.2,
              }}
            >
              <span>{formatDate(d)}</span>
              <span>{getDayOfWeek(d)}</span>
            </button>
          </div>
        ))}

        <div style={styles.hdr}>
          <button onClick={() => { setSortDay(null); setSortCW(p => p==='curr'?null:'curr'); }} style={{...styles.sortBtn, background: sortCW==='curr'?'#2563EB':'transparent', color: sortCW==='curr'?'#FFF':'#D1D5DB'}}>CW{currWeekNum}</button>
        </div>

        {/* Строка "Кол-во машин" */}
        <div style={styles.dark}>Кол-во машин</div>
        <div style={styles.dark}></div>
        <div style={styles.dark}></div>
        {headerCarsPrev.map((v, i) => <CarCell key={`hcp${i}`} count={v} />)}
        <CarsWeekSum sum={sumCarsPrev} />
        {headerCarsCurr.map((v, i) => <CarCell key={`hcc${i}`} count={v} />)}
        <CarsWeekSum sum={sumCarsCurr} />

        {/* Тело таблицы */}
        {rows.map((row, ri) => {
          const dpuPrev = sumCarsPrev > 0 ? (row.totalPrevDef * 1000) / sumCarsPrev : 0;
          const dpuCurr = sumCarsCurr > 0 ? (row.totalCurrDef * 1000) / sumCarsCurr : 0;
          const note = userNotes[row.MPP] || { responsible: '', action: '' };

          return (
            <React.Fragment key={row.MPP}>
              <div style={styles.name}>{row.MPP}</div>

              <div style={styles.noteCell}>
                <select value={note.responsible} onChange={e => handleNoteSave(row.MPP, 'responsible', e.target.value)} style={styles.noteSelect}>
                  {responsibleOptions.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                </select>
                {note.updated_at && <div style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString('ru-RU')}</div>}
              </div>

              <div style={styles.noteCell}>
                <select value={note.action} onChange={e => handleNoteSave(row.MPP, 'action', e.target.value)} style={styles.noteSelect}>
                  {actionOptions.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                </select>
                {note.updated_at && <div style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString('ru-RU')}</div>}
              </div>

              {row.cellsPrev.map((defects, ci) => {
                const dateStr = prevWeekDays[ci].toISOString().split('T')[0];
                const cars = carsCounts[dateStr] || 0;
                const value = isDPU ? (cars > 0 ? (defects * 1000) / cars : 0) : defects;
                const bg = colorFunc(value);
                const textColor = isDPU ? (value > 300 ? '#FFF' : '#000') : (value > 15 ? '#FFF' : '#000');
                return <div key={`cp${ri}${ci}`} style={{...styles.val, background: bg, color: textColor}}>{isDPU ? formatDPU(value) : value}</div>;
              })}
              <div style={{...styles.total, background: colorFunc(isDPU ? dpuPrev : row.totalPrevDef), color: (isDPU ? dpuPrev : row.totalPrevDef) > (isDPU ? 300 : 15) ? '#FFF' : '#000'}}>{isDPU ? formatDPU(dpuPrev) : row.totalPrevDef}</div>

              {row.cellsCurr.map((defects, ci) => {
                const dateStr = currWeekDays[ci].toISOString().split('T')[0];
                const cars = carsCounts[dateStr] || 0;
                const value = isDPU ? (cars > 0 ? (defects * 1000) / cars : 0) : defects;
                const bg = colorFunc(value);
                const textColor = isDPU ? (value > 300 ? '#FFF' : '#000') : (value > 15 ? '#FFF' : '#000');
                return <div key={`cc${ri}${ci}`} style={{...styles.val, background: bg, color: textColor}}>{isDPU ? formatDPU(value) : value}</div>;
              })}
              <div style={{...styles.total, background: colorFunc(isDPU ? dpuCurr : row.totalCurrDef), color: (isDPU ? dpuCurr : row.totalCurrDef) > (isDPU ? 300 : 15) ? '#FFF' : '#000'}}>{isDPU ? formatDPU(dpuCurr) : row.totalCurrDef}</div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  app: { background: '#111827', minHeight: '100vh', padding: 20, fontFamily: 'Segoe UI, Arial, sans-serif', color: '#FFF' },
  title: { marginBottom: 15, fontSize: 20, fontWeight: 600 },
  filterBar: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15, flexWrap: 'wrap' },
  filterLabel: { fontSize: 14, color: '#D1D5DB' },
  filterSelect: { padding: '6px 12px', borderRadius: 6, border: '1px solid #4B5563', background: '#1F2937', color: '#FFF', fontSize: 14, cursor: 'pointer' },
  sortInfo: { fontSize: 12, color: '#60A5FA', display: 'flex', alignItems: 'center', gap: 5 },
  clearBtn: { background: '#EF4444', color: '#FFF', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 10, padding: '1px 5px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 2fr) 110px 110px repeat(7, 60px) 60px repeat(7, 60px) 60px',
    border: '1px solid #4B5563',
    fontSize: 13,
    overflowX: 'auto',
  },
  dark: {
    background: '#1F2937',
    padding: '6px 8px',
    fontWeight: 600,
    border: '1px solid #4B5563',
    display: 'flex',
    alignItems: 'center',
    fontSize: 11,
  },
  hdr: { background: '#374151', padding: 4, fontWeight: 600, border: '1px solid #4B5563', textAlign: 'center', fontSize: 11 },
  sortBtn: { border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '4px 6px', borderRadius: 4, width: '100%' },
  cars: { background: '#374151', padding: '4px 3px', border: '1px solid #4B5563', textAlign: 'center', fontSize: 11, color: '#D1D5DB', minHeight: 19, whiteSpace: 'nowrap' },
  name: {
    background: '#1F2937',
    padding: '6px 8px',
    fontWeight: 600,
    border: '1px solid #4B5563',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: 12,
  },
  noteCell: { background: '#1F2937', padding: '2px 4px', border: '1px solid #4B5563', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  noteSelect: { width: '100%', padding: '2px 4px', borderRadius: 4, border: '1px solid #4B5563', background: '#374151', color: '#FFF', fontSize: 11, cursor: 'pointer' },
  noteDate: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
  val: { padding: '6px 4px', border: '1px solid #4B5563', textAlign: 'center', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  total: { padding: '6px 4px', border: '1px solid #4B5563', textAlign: 'center', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' },
  loading: { textAlign: 'center', padding: 50, fontSize: 18, color: '#9CA3AF' },
  error: { textAlign: 'center', padding: 50, fontSize: 18, color: '#EF4444' },
};