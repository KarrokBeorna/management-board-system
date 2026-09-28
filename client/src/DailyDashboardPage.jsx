import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = '';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #F0F0F5',
};

const thStyle = {
  padding: '10px 12px',
  textAlign: 'center',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #E5E7EB',
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px 12px',
  textAlign: 'center',
  borderBottom: '1px solid #F0F0F5',
  color: '#1F2937',
};

const inputStyle = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #D1D5DB',
  fontSize: 13,
};

const translationCache = new Map();
async function translateText(text, from = 'ru', to = 'en') {
  if (!text || !text.trim()) return text;
  const cacheKey = `${from}:${to}:${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    const json = await res.json();
    const translated = json.responseData?.translatedText || text;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

export default function DailyDashboardPage() {
  const [useEnglish, setUseEnglish] = useState(false);

  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [shiftFilter, setShiftFilter] = useState('all');

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // ---------- DRR TOP 3 (диапазон) ----------
  const [showTop3Filter, setShowTop3Filter] = useState(false);
  const [top3DateFrom, setTop3DateFrom] = useState(yesterday);
  const [top3DateTo, setTop3DateTo] = useState(yesterday);
  const [top3RawData, setTop3RawData] = useState([]);
  const [top3Translated, setTop3Translated] = useState([]);
  const [top3Loading, setTop3Loading] = useState(false);

  // ---------- TOP 5 A/B (диапазон) ----------
  const [selectedGrades, setSelectedGrades] = useState(['A', 'B', 'A1', 'B1']);
  const [availableGrades, setAvailableGrades] = useState([]);
  const [showGradeFilter, setShowGradeFilter] = useState(false);
  const [showTop5Filter, setShowTop5Filter] = useState(false);
  const [top5DateFrom, setTop5DateFrom] = useState(yesterday);
  const [top5DateTo, setTop5DateTo] = useState(yesterday);
  const [top5RawData, setTop5RawData] = useState([]);
  const [top5Translated, setTop5Translated] = useState([]);
  const [top5Loading, setTop5Loading] = useState(false);

  // ---------- DRR TOP 3 WEEK ----------
  const [weekTop3Data, setWeekTop3Data] = useState([]);
  const [weekTop3Loading, setWeekTop3Loading] = useState(false);

  const weekOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);          // ← воскресенье
      const weekNum = (() => {
        const target = new Date(monday);
        const dayNr = (target.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        return 1 + Math.ceil((firstThursday - target) / 604800000);
      })();
      options.push({
        value: i,
        label: `CW${weekNum} (${monday.toISOString().split('T')[0]} – ${sunday.toISOString().split('T')[0]})`,
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      });
    }
    return options;
  }, []);

  const currentWeek = weekOptions[selectedWeekOffset];

  useEffect(() => {
    fetch(`${API_BASE}/api/problem-grades`)
      .then(res => res.json())
      .then(grades => setAvailableGrades(grades))
      .catch(() => {});
  }, []);

  // Загрузка недели
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      weekStart: currentWeek.start,
      weekEnd: currentWeek.end,
      shift: shiftFilter,
    });
    fetch(`${API_BASE}/api/daily-dashboard-week?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setWeekData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedWeekOffset, currentWeek.start, currentWeek.end, shiftFilter]);

  const loadTop3 = () => {
    setTop3Loading(true);
    const params = new URLSearchParams({
      dateFrom: top3DateFrom,
      dateTo: top3DateTo,
    });
    fetch(`${API_BASE}/api/daily-dashboard-top3?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setTop3RawData(json || []);
        setTop3Loading(false);
      })
      .catch(() => setTop3Loading(false));
  };

  const loadTop5 = () => {
    setTop5Loading(true);
    const params = new URLSearchParams({
      dateFrom: top5DateFrom,
      dateTo: top5DateTo,
    });
    if (selectedGrades.length > 0) {
      params.append('grades', selectedGrades.join(','));
    }
    fetch(`${API_BASE}/api/daily-dashboard-top5?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setTop5RawData(json || []);
        setTop5Loading(false);
      })
      .catch(() => setTop5Loading(false));
  };

  // Загрузка DRR TOP 3 WEEK
  useEffect(() => {
    if (!currentWeek) return;
    setWeekTop3Loading(true);
    const params = new URLSearchParams({
      dateFrom: currentWeek.start,
      dateTo: currentWeek.end,
      shift: shiftFilter,
    });
    fetch(`${API_BASE}/api/daily-dashboard-week-top3?${params.toString()}`)
      .then(res => res.json())
      .then(json => setWeekTop3Data(json || []))
      .catch(() => setWeekTop3Data([]))
      .finally(() => setWeekTop3Loading(false));
  }, [currentWeek.start, currentWeek.end, shiftFilter]);

  // Первоначальная загрузка топов
  useEffect(() => {
    if (weekData) {
      loadTop3();
      loadTop5();
    }
  }, [weekData]);

  // Переводы
  useEffect(() => {
    if (useEnglish && top3RawData.length > 0) {
      Promise.all(top3RawData.map(async (item) => ({ ...item, defect: (await translateText(item.defect)).toUpperCase() })))
        .then(setTop3Translated);
    } else setTop3Translated([]);
  }, [useEnglish, top3RawData]);

  useEffect(() => {
    if (useEnglish && top5RawData.length > 0) {
      Promise.all(top5RawData.map(async (item) => ({ ...item, defect: (await translateText(item.defect)).toUpperCase() })))
        .then(setTop5Translated);
    } else setTop5Translated([]);
  }, [useEnglish, top5RawData]);

  useEffect(() => { loadTop3(); }, [top3DateFrom, top3DateTo]);
  useEffect(() => { loadTop5(); }, [top5DateFrom, top5DateTo, selectedGrades]);

  const handleGradeToggle = (grade) => {
    setSelectedGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
  };

  const top3Data = useEnglish && top3Translated.length > 0 ? top3Translated : top3RawData;
  const top5Data = useEnglish && top5Translated.length > 0 ? top5Translated : top5RawData;

  if (loading) {
    return (
      <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
        <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>Daily Dashboard</h1>
        <p style={{ color: '#6B7280' }}>Загрузка...</p>
      </div>
    );
  }

  if (!weekData) {
    return (
      <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
        <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>Daily Dashboard</h1>
        <div style={cardStyle}><p style={{ color: '#6B7280', textAlign: 'center' }}>Нет данных</p></div>
      </div>
    );
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, margin: 0 }}>QUALITY DAILY REPORT</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14,
            background: '#FFFFFF', fontWeight: 500,
          }}>
            <option value="all">Сутки</option>
            <option value="day">День</option>
            <option value="evening">Вечер</option>
            <option value="night">Ночь</option>
          </select>
          <button onClick={() => setUseEnglish(!useEnglish)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14,
            background: useEnglish ? '#2563EB' : '#FFFFFF', color: useEnglish ? '#FFFFFF' : '#374151',
            fontWeight: 500, cursor: 'pointer',
          }}>{useEnglish ? 'EN' : 'RU'}</button>
          <select value={selectedWeekOffset} onChange={e => setSelectedWeekOffset(Number(e.target.value))} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14,
            background: '#FFFFFF', fontWeight: 500,
          }}>
            {weekOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Основная таблица DRR/DPU/DPU OFF */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1F2937' }}>
          CW{weekData.weekNumber}{' '}
          <span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280' }}>({weekData.weekStart} – {weekData.weekEnd})</span>
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                <th style={thStyle}>CW{weekData.weekNumber}</th>
                {dayLabels.map((day, i) => (
                  <th key={day} style={thStyle}>{day}<br/>{weekData.days[i]?.slice(5)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>DRR</td>
                <td style={tdStyle}>{weekData.weekDrr}</td>
                {weekData.drr.map((val, i) => <td key={i} style={tdStyle}>{val}</td>)}
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>Target DRR</td>
                <td style={tdStyle}>60</td>
                {dayLabels.map((_, i) => <td key={i} style={tdStyle}>60</td>)}
              </tr>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>DPU</td>
                <td style={tdStyle}>{weekData.weekDpu}</td>
                {weekData.dpu.map((val, i) => <td key={i} style={tdStyle}>{val}</td>)}
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>Target DPU</td>
                <td style={tdStyle}>0.4</td>
                {dayLabels.map((_, i) => <td key={i} style={tdStyle}>0.4</td>)}
              </tr>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>DPU OFF</td>
                <td style={tdStyle}>{weekData.weekDpuOff}</td>
                {(weekData.dpuOff || []).map((val, i) => <td key={i} style={tdStyle}>{val}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Две карточки рядом */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* DRR TOP 3 */}
        <div style={{ ...cardStyle, flex: 1, minWidth: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 }}>DRR TOP 3</h2>
            <button onClick={() => setShowTop3Filter(!showTop3Filter)} style={{
              background: showTop3Filter ? '#2563EB' : '#F3F4F6', color: showTop3Filter ? '#FFFFFF' : '#374151',
              border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>{showTop3Filter ? 'Скрыть фильтр' : 'Фильтр'}</button>
          </div>
          {showTop3Filter && (
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>с</span>
              <input type="date" value={top3DateFrom} onChange={e => setTop3DateFrom(e.target.value)} style={inputStyle} />
              <span style={{ fontSize: 12, color: '#6B7280' }}>по</span>
              <input type="date" value={top3DateTo} onChange={e => setTop3DateTo(e.target.value)} style={inputStyle} />
            </div>
          )}
          {top3Loading ? <p style={{ color: '#6B7280', textAlign: 'center', padding: 10 }}>Загрузка...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr><th style={thStyle}>DEFECT</th><th style={thStyle}>COUNT</th></tr></thead>
              <tbody>
                {top3Data.map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#F9FAFB' : 'white' }}>
                    <td style={tdStyle}>{item.defect}</td>
                    <td style={tdStyle}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* TOP 5 A/B */}
        <div style={{ ...cardStyle, flex: 1, minWidth: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 }}>TOP 5 A/B дефектов на CP7 и CP8</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowTop5Filter(!showTop5Filter)} style={{
                background: showTop5Filter ? '#2563EB' : '#F3F4F6', color: showTop5Filter ? '#FFFFFF' : '#374151',
                border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>{showTop5Filter ? 'Скрыть фильтр' : 'Фильтр'}</button>
              <button onClick={() => setShowGradeFilter(!showGradeFilter)} style={{
                background: showGradeFilter ? '#2563EB' : '#F3F4F6', color: showGradeFilter ? '#FFFFFF' : '#374151',
                border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>{showGradeFilter ? 'Скрыть классы' : 'Классы дефектов'}</button>
            </div>
          </div>
          {showTop5Filter && (
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>с</span>
              <input type="date" value={top5DateFrom} onChange={e => setTop5DateFrom(e.target.value)} style={inputStyle} />
              <span style={{ fontSize: 12, color: '#6B7280' }}>по</span>
              <input type="date" value={top5DateTo} onChange={e => setTop5DateTo(e.target.value)} style={inputStyle} />
            </div>
          )}
          {showGradeFilter && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {availableGrades.map(grade => (
                <label key={grade} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedGrades.includes(grade)} onChange={() => handleGradeToggle(grade)} />
                  {grade}
                </label>
              ))}
            </div>
          )}
          {top5Loading ? <p style={{ color: '#6B7280', textAlign: 'center', padding: 10 }}>Загрузка...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr><th style={thStyle}>DEFECT</th><th style={thStyle}>COUNT</th></tr></thead>
              <tbody>
                {top5Data.map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#F9FAFB' : 'white' }}>
                    <td style={tdStyle}>{item.defect}</td>
                    <td style={tdStyle}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DRR TOP 3 WEEK */}
      <div style={{ ...cardStyle }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: '0 0 12px 0' }}>
          DRR TOP 3 — неделя CW{weekData.weekNumber}
          <span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280', marginLeft: 8 }}>
            ({weekData.weekStart} – {weekData.weekEnd})
          </span>
        </h2>
        {weekTop3Loading ? <p style={{ color: '#6B7280', textAlign: 'center', padding: 10 }}>Загрузка...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>DEFECT</th>
                <th style={{ ...thStyle, width: 120 }}>COUNT</th>
              </tr>
            </thead>
            <tbody>
              {weekTop3Data.length === 0 ? (
                <tr><td colSpan={2} style={{ ...tdStyle, color: '#94A3B8' }}>Нет данных</td></tr>
              ) : weekTop3Data.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#F9FAFB' : 'white' }}>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{item.defect}</td>
                  <td style={tdStyle}>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}