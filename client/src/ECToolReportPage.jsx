import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LabelList, PieChart, Pie, Cell,
} from 'recharts';

const API_BASE = '';

/* ===================== ЦВЕТА И СТИЛИ ===================== */
const PIE_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16'];
const TOP3_COLORS = ['#3B82F6', '#F59E0B', '#10B981'];
const OTHER_COLOR = '#9CA3AF';

const reppsTypeBgColors = { year: '#F3E8FF', month: '#E0F2FE', week: '#CCFBF1', day: '#FEF3C7' };
const H_CHART_2 = 260;

const loadingAnimation = `
  @keyframes blink {
    0% { opacity: 0.2; }
    20% { opacity: 1; }
    100% { opacity: 0.2; }
  }
  .loading-dots span { animation: blink 1.4s infinite both; }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
`;

const cardStyle = { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' };
const sectionCardStyle = { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5', display: 'flex', flexDirection: 'column', minWidth: 0 };
const tabStyle = (active) => ({ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: active ? '#7C3AED' : '#F3F4F6', color: active ? '#FFFFFF' : '#6B7280', cursor: 'pointer', boxShadow: active ? `0 4px 12px #7C3AED40` : 'none', transition: 'all 0.2s' });
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB', outline: 'none' };

const thStyle = { textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', whiteSpace: 'nowrap', padding: '5px 4px', fontSize: '10px' };
const tdStyle = { textAlign: 'center', borderBottom: '1px solid #F0F0F5', color: '#1F2937', whiteSpace: 'nowrap', padding: '3px 4px', transition: 'background-color 0.2s' };

const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 10px 0', paddingBottom: 6, borderBottom: '2px solid #E5E7EB', height: 26, boxSizing: 'border-box' };
const reportHeaderStyle = { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 14px 0', paddingBottom: 10, borderBottom: '2px solid #E5E7EB' };
const tableHeaderStyle = { fontSize: 12, fontWeight: 700, color: '#374151', margin: '10px 0 6px 0' };
const tableWrapStyle = { marginTop: 4, border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' };

const shortenLabel = (label, type) => {
  if (type === 'month') return label.split(' ')[0]; 
  if (type === 'week') return label.split(' ')[0];
  return label;
};

const darkTableStyles = {
  container: { backgroundColor: '#111827', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #374151', marginBottom: 20, width: '100%', boxSizing: 'border-box' },
  title: { fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: '0 0 20px 0' },
  tableWrapper: { width: '100%', overflowX: 'auto', borderRadius: '10px' },
  table: { width: '100%', minWidth: 1150, borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { background: '#1F2937', color: '#FFFFFF', padding: '6px 4px', border: '1px solid #4B5563', textAlign: 'center', fontSize: '10px', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' },
  td: { background: '#1F2937', color: '#FFFFFF', padding: '4px 4px', border: '1px solid #4B5563', textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap' },
  stickyCol: { position: 'sticky', left: 0, zIndex: 2 },
  sortBtn: { border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 600, padding: '4px', width: '100%', color: '#FFF', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '4px', transition: 'background 0.2s' },
};

/* ===================== ХЕЛПЕРЫ ===================== */
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
function getLocalYMD(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

const MONTHS_RU = {
  'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4,
  'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11,
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#FFFFFF" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} style={{ pointerEvents: 'none' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ====================================================================== */
export default function ECToolReportPage() {
  const [period, setPeriod] = useState('all');
  const [count, setCount] = useState(3);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [top3Tools, setTop3Tools] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [carsCounts, setCarsCounts] = useState({});

  const [unit, setUnit] = useState('defects');
  const [sortDay, setSortDay] = useState(null);
  const [sortCW, setSortCW] = useState(null);
  const [hiddenRows, setHiddenRows] = useState({});

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
      prevWeekDays: prevDays, currWeekDays: currDays,
      prevWeekNum: getWeekNumber(mondayPrevWeek),
      currWeekNum: getWeekNumber(mondayThisWeek),
      isMonday: today.getDay() === 1,
    };
  }, []);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === 'all') {
      setFromDate('');
      setToDate('');
    } else {
      const defaults = { month: 3, week: 4, day: 14 };
      setCount(defaults[newPeriod] || 3);
    }
  };

  useEffect(() => {
    if (period !== 'all' && (fromDate || toDate) && !(fromDate && toDate)) return;

    setLoading(true);
    const params = new URLSearchParams({ period, count });
    if (period !== 'all' && fromDate && toDate) {
      params.append('fromDate', fromDate);
      params.append('toDate', toDate);
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/ec-tool-report?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setChartData(Array.isArray(json.dataPoints) ? json.dataPoints : []);
        setPieData(Array.isArray(json.pieData) ? json.pieData : []);
        setTop3Tools(Array.isArray(json.top3Tools) ? json.top3Tools : []);
        setRawData(Array.isArray(json.defects) ? json.defects : []);
        setCarsCounts(json.carsByDate || {});
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Ошибка загрузки EC Tool:', err);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [period, count, fromDate, toDate]);

  /* ===================== ЛОГИКА ТАБЛИЦЫ ===================== */
  const { rows, headerCarsPrev, headerCarsCurr, sumCarsPrev, sumCarsCurr } = useMemo(() => {
    if (!Array.isArray(rawData)) return { rows: [], headerCarsPrev: [], headerCarsCurr: [], sumCarsPrev: 0, sumCarsCurr: 0 };

    const grouped = {};
    rawData.forEach(item => {
      if (!grouped[item.MPP]) {
        grouped[item.MPP] = { MPP: item.MPP, PART_NAME: item.PART_NAME, PROBLEM_TYPE: item.PROBLEM_TYPE, days: {} };
      }
      if (!grouped[item.MPP].days[item.CREATION_TIME]) grouped[item.MPP].days[item.CREATION_TIME] = 0;
      grouped[item.MPP].days[item.CREATION_TIME] += item.DEFECTS_COUNT;
    });

    let resultRows = Object.values(grouped).map(g => {
      const row = { MPP: g.MPP, PART_NAME: g.PART_NAME, PROBLEM_TYPE: g.PROBLEM_TYPE, cellsPrev: [], cellsCurr: [], totalPrevDef: 0, totalCurrDef: 0 };
      prevWeekDays.forEach(date => {
        const ds = getLocalYMD(date);
        const v = g.days[ds] || 0;
        row.cellsPrev.push(v); row.totalPrevDef += v;
      });
      currWeekDays.forEach((date, i) => {
        const ds = getLocalYMD(date);
        const v = (isMonday && i > 0) ? 0 : (g.days[ds] || 0);
        row.cellsCurr.push(v); row.totalCurrDef += v;
      });
      return row;
    });

    resultRows = resultRows.filter(r => r.totalPrevDef > 0 || r.totalCurrDef > 0);

    if (sortCW) resultRows.sort((a, b) => sortCW === 'prev' ? b.totalPrevDef - a.totalPrevDef : b.totalCurrDef - a.totalCurrDef);
    else if (sortDay) {
      resultRows.sort((a, b) => {
        const va = sortDay.week === 'prev' ? a.cellsPrev[sortDay.index] : a.cellsCurr[sortDay.index];
        const vb = sortDay.week === 'prev' ? b.cellsPrev[sortDay.index] : b.cellsCurr[sortDay.index];
        return vb - va;
      });
    } else resultRows.sort((a, b) => (b.totalPrevDef + b.totalCurrDef) - (a.totalPrevDef + a.totalCurrDef));

    const carsPrev = prevWeekDays.map(d => carsCounts[getLocalYMD(d)] ?? 0);
    const carsCurr = currWeekDays.map((d, i) => (isMonday && i > 0) ? 0 : (carsCounts[getLocalYMD(d)] ?? 0));

    return {
      rows: resultRows,
      headerCarsPrev: carsPrev, headerCarsCurr: carsCurr,
      sumCarsPrev: carsPrev.reduce((s, v) => s + v, 0),
      sumCarsCurr: carsCurr.reduce((s, v) => s + v, 0),
    };
  }, [rawData, prevWeekDays, currWeekDays, isMonday, sortDay, sortCW, carsCounts]);

  const totalDailyDefectsPrev = useMemo(() => {
    const arr = Array(7).fill(0);
    rows.forEach(r => r.cellsPrev.forEach((val, i) => { arr[i] += val; }));
    return arr;
  }, [rows]);

  const totalDailyDefectsCurr = useMemo(() => {
    const arr = Array(7).fill(0);
    rows.forEach(r => r.cellsCurr.forEach((val, i) => { arr[i] += val; }));
    return arr;
  }, [rows]);

  const totalRow = useMemo(() => {
    if (rows.length === 0) return null;
    let totalPrevDef = 0, totalCurrDef = 0;
    rows.forEach(r => { totalPrevDef += r.totalPrevDef; totalCurrDef += r.totalCurrDef; });
    return {
      isTotal: true,
      MPP: 'Итого дефектов по фильтру: Все',
      cellsPrev: totalDailyDefectsPrev,
      cellsCurr: totalDailyDefectsCurr,
      totalPrevDef, totalCurrDef,
      dpuPrev: sumCarsPrev > 0 ? (totalPrevDef * 1000) / sumCarsPrev : 0,
      dpuCurr: sumCarsCurr > 0 ? (totalCurrDef * 1000) / sumCarsCurr : 0,
    };
  }, [rows, sumCarsPrev, sumCarsCurr, totalDailyDefectsPrev, totalDailyDefectsCurr]);

  const displayRows = totalRow ? [totalRow, ...rows] : rows;
  const handleToggleRow = (mpp) => { setHiddenRows(prev => ({ ...prev, [mpp]: !prev[mpp] })); };
  const showAllRows = () => { setHiddenRows({}); };
  const hiddenCount = Object.values(hiddenRows).filter(Boolean).length;

  const isDPU = unit === 'dpu';
  const colorFunc = isDPU ? getDPUColor : getDefectColor;
  const formatDPU = (value) => value.toFixed(1);

  const carsLookup = useMemo(() => {
    const byDay = {}, byWeek = {}, byMonth = {};
    Object.entries(carsCounts).forEach(([ymd, cars]) => {
      const d = new Date(`${ymd}T00:00:00`);
      if (Number.isNaN(d.getTime())) return;
      const dd = ymd.slice(8, 10), mm = ymd.slice(5, 7);
      byDay[`${dd}.${mm}`] = (byDay[`${dd}.${mm}`] || 0) + cars;
      const wk = `W${getWeekNumber(d)}`;
      byWeek[wk] = (byWeek[wk] || 0) + cars;
      const mk = ymd.slice(0, 7);
      byMonth[mk] = (byMonth[mk] || 0) + cars;
    });
    return { byDay, byWeek, byMonth };
  }, [carsCounts]);

  const sumCarsRange = (start, end) => {
    let s = 0;
    Object.entries(carsCounts).forEach(([d, c]) => { if (d >= start && d <= end) s += c; });
    return s;
  };

  const getCarsForPoint = (p) => {
    if (typeof p?.cars === 'number') return p.cars;
    if (p?.start && p?.end) return sumCarsRange(p.start, p.end);
    const label = String(p?.label ?? '');
    if (/^\d{2}\.\d{2}$/.test(label)) return carsLookup.byDay[label] || 0;
    const w = label.match(/^W(\d{1,2})/i);
    if (w) return carsLookup.byWeek[`W${Number(w[1])}`] || 0;
    const m = label.match(/^([А-Яа-я]+)\.?\s*(\d{4})/);
    if (m) {
      const mi = MONTHS_RU[m[1].toLowerCase().slice(0, 3)];
      if (mi != null) return carsLookup.byMonth[`${m[2]}-${String(mi + 1).padStart(2, '0')}`] || 0;
    }
    return 0;
  };

  const getDisplayData = (points) => {
    return points.map(p => {
      const cars = getCarsForPoint(p);
      const toDPU = (defects) => (cars > 0 ? (defects * 1000) / cars : 0);
      
      const s = { ...p, total: isDPU ? toDPU(p.total || 0) : p.total };
      top3Tools.forEach(t => {
        s[t] = isDPU ? toDPU(p[t] || 0) : p[t];
      });
      
      s.top3Sum = top3Tools.reduce((sum, t) => sum + (s[t] || 0), 0);
      return s;
    });
  };

  const fmtChartVal = (v) => (v > 0 ? (isDPU ? Number(v).toFixed(1) : v) : '');
  const fmtCellVal = (v) => (isDPU ? Number(v).toFixed(1) : v);

  const renderDayCells = (cells, dates, isTotalRow, keyPrefix) =>
    cells.map((defects, ci) => {
      const cars = carsCounts[getLocalYMD(dates[ci])] || 0;
      const value = isDPU ? (cars > 0 ? (defects * 1000) / cars : 0) : defects;
      const bg = isTotalRow ? '#1E3A8A' : colorFunc(value);
      const textColor = isTotalRow ? '#FFF' : (isDPU ? (value > 300 ? '#FFF' : '#000') : (value > 15 ? '#FFF' : '#000'));
      return (
        <td key={`${keyPrefix}${ci}`} style={{ ...darkTableStyles.td, background: bg, color: textColor, fontWeight: isTotalRow ? 800 : 600 }}>
          {isDPU ? formatDPU(value) : value}
        </td>
      );
    });

  const groupedByType = useMemo(() => {
    if (period !== 'all') return null;
    return {
      months: chartData.filter(p => p.type === 'month'),
      weeks:  chartData.filter(p => p.type === 'week'),
      days:   chartData.filter(p => p.type === 'day'),
    };
  }, [chartData, period]);

  const processedPieData = useMemo(() => {
    if (!pieData || !pieData.length) return [];
    const sorted = [...pieData].sort((a, b) => b.value - a.value);
    if (sorted.length <= 10) return sorted;
    const top = sorted.slice(0, 9);
    const otherVal = sorted.slice(9).reduce((acc, curr) => acc + curr.value, 0);
    if (otherVal > 0) top.push({ name: 'Прочие', value: otherVal });
    return top;
  }, [pieData]);

  const pieTotal = useMemo(() => processedPieData.reduce((s, p) => s + p.value, 0), [processedPieData]);

  /* ===================== ГРАФИКИ ===================== */
  const renderCharts = (points) => {
    if (!points || !points.length) return <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>;
    const displayData = getDisplayData(points);
    return (
      <ResponsiveContainer width="100%" height={H_CHART_2}>
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: isDPU ? -8 : -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="label" tickFormatter={(val) => shortenLabel(val, points[0]?.type)} tick={{ fontSize: 10 }} interval={0} height={28} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={isDPU} width={isDPU ? 34 : 25} />
          <Bar dataKey="total" fill="#3B82F6" barSize={22} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#111827' }} formatter={fmtChartVal} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTop3Charts = (points) => {
    if (!points || !points.length) return <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>;
    
    const displayData = getDisplayData(points).map(p => {
      const newP = { ...p, displayLabel: shortenLabel(p.label, p.type), displayTotal: p.top3Sum };
      const lastTool = top3Tools[top3Tools.length - 1];
      
      top3Tools.forEach(t => {
        const val = Number(p[t]) || 0;
        newP[t] = (t === lastTool && val === 0) ? 0.001 : val;
      });
      return newP;
    });

    return (
      <ResponsiveContainer width="100%" height={H_CHART_2}>
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: isDPU ? -8 : -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="displayLabel" tick={{ fontSize: 10 }} interval={0} height={28} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={isDPU} width={isDPU ? 34 : 25} />
          {top3Tools.map((tool, idx) => (
            <Bar key={tool} dataKey={tool} stackId="s" fill={TOP3_COLORS[idx]} barSize={22}>
              {idx === top3Tools.length - 1 && (
                <LabelList dataKey="displayTotal" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#111827' }} formatter={fmtChartVal} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTop3Table = (points) => {
    if (!points || !points.length) return null;
    const displayLabels = points.map(p => shortenLabel(p.label, p.type));
    const displayData = getDisplayData(points);

    // УМЕНЬШЕНИЕ ШРИФТА В ЯЧЕЙКАХ ПРИ DPU
    const cellFontSize = isDPU ? '9px' : '11px';

    return (
      <>
        <h4 style={tableHeaderStyle}>Детализация</h4>
        <div style={tableWrapStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={{ ...thStyle, width: 120, paddingLeft: 6, textAlign: 'left' }}>Гайковерт</th>
                {displayData.map((point, idx) => (
                  <th key={idx} style={{ ...thStyle, backgroundColor: reppsTypeBgColors[point.type] }}>
                    {displayLabels[idx]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top3Tools.map((tool, idx) => (
                <tr key={tool} style={{ backgroundColor: 'white' }}>
                  <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', color: TOP3_COLORS[idx], fontWeight: 700, wordBreak: 'break-word', whiteSpace: 'normal', fontSize: '11px' }}>
                    {tool}
                  </td>
                  {displayData.map((point, i) => {
                    const val = point[tool] || 0;
                    return (
                      <td key={i} style={{ ...tdStyle, fontSize: cellFontSize, color: val > 0 ? '#1F2937' : '#9CA3AF', fontWeight: val > 0 ? 600 : 400 }}>
                        {val > 0 ? fmtCellVal(val) : 0}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ backgroundColor: '#F3F4F6', fontWeight: 700 }}>
                <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', fontSize: '11px' }}>Итого топ-3</td>
                {displayData.map((point, i) => {
                  return (
                    <td key={i} style={{ ...tdStyle, fontSize: cellFontSize, fontWeight: 700 }}>
                      {fmtCellVal(point.top3Sum)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  /* ===================== РЕНДЕР ===================== */
  const grid3 = { display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, alignItems: 'stretch' };

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1500, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 20 }}>EC Tool Report</h1>

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>Период:</span>
            <button onClick={() => handlePeriodChange('all')} style={tabStyle(period === 'all')}>Все</button>
            <button onClick={() => handlePeriodChange('month')} style={tabStyle(period === 'month')}>Месяц</button>
            <button onClick={() => handlePeriodChange('week')} style={tabStyle(period === 'week')}>Неделя</button>
            <button onClick={() => handlePeriodChange('day')} style={tabStyle(period === 'day')}>День</button>
          </div>

          {period !== 'all' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563' }}>
                Кол-во периодов:
                <input type="number" min="1" max="50" value={count} onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)} style={{ ...inputStyle, width: 80 }} />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>От:</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>По:</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                {(fromDate || toDate) && (
                  <button onClick={() => { setFromDate(''); setToDate(''); }} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#9CA3AF', color: '#FFF', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button onClick={() => setUnit('defects')} style={tabStyle(unit === 'defects')}>Шт.</button>
            <button onClick={() => setUnit('dpu')} style={tabStyle(unit === 'dpu')}>DPU / 1000</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>
          <style>{loadingAnimation}</style>
          <div className="loading-dots" style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
            <span>Загрузка данных</span><span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      ) : period === 'all' && groupedByType ? (
        <>
          <div style={cardStyle}>
            <h2 style={reportHeaderStyle}>Количество ошибок по гайковертам</h2>
            <div style={grid3}>
              <div style={sectionCardStyle}>
                <h3 style={{ ...sectionTitleStyle, color: '#0EA5E9' }}>3 месяца</h3>
                {renderCharts(groupedByType.months)}
              </div>
              <div style={sectionCardStyle}>
                <h3 style={{ ...sectionTitleStyle, color: '#14B8A6' }}>4 недели</h3>
                {renderCharts(groupedByType.weeks)}
              </div>
              <div style={sectionCardStyle}>
                <h3 style={{ ...sectionTitleStyle, color: '#F59E0B' }}>14 дней</h3>
                {renderCharts(groupedByType.days)}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={reportHeaderStyle}>Динамика по топ-3 проблемных гайковертов</h2>
            <div style={grid3}>
              <div style={sectionCardStyle}>
                <h3 style={{ ...sectionTitleStyle, color: '#0EA5E9' }}>3 месяца</h3>
                {renderTop3Charts(groupedByType.months)}
                {renderTop3Table(groupedByType.months)}
              </div>
              <div style={sectionCardStyle}>
                <h3 style={{ ...sectionTitleStyle, color: '#14B8A6' }}>4 недели</h3>
                {renderTop3Charts(groupedByType.weeks)}
                {renderTop3Table(groupedByType.weeks)}
              </div>
              <div style={sectionCardStyle}>
                <h3 style={{ ...sectionTitleStyle, color: '#F59E0B' }}>14 дней</h3>
                {renderTop3Charts(groupedByType.days)}
                {renderTop3Table(groupedByType.days)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={cardStyle}>
            <h2 style={reportHeaderStyle}>Количество ошибок по гайковертам</h2>
            {renderCharts(chartData)}
          </div>
          <div style={cardStyle}>
            <h2 style={reportHeaderStyle}>Динамика по топ-3 проблемных гайковертов</h2>
            {renderTop3Charts(chartData)}
            {renderTop3Table(chartData)}
          </div>
        </>
      )}

      {/* ПАЙЧАРТ */}
      <div style={cardStyle}>
        <h2 style={reportHeaderStyle}>Парето по проблемным гайковёртам</h2>
        {processedPieData.length === 0 ? (
          <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 320px', minWidth: 280, height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={processedPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={115} paddingAngle={2} cornerRadius={3} minAngle={3} labelLine={false} label={renderPieLabel}>
                    {processedPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Прочие' ? OTHER_COLOR : PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{pieTotal.toLocaleString('ru-RU')}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>всего дефектов</div>
              </div>
            </div>
            <div style={{ flex: '0 1 360px', paddingLeft: 24, maxHeight: 340, overflowY: 'auto' }}>
              {processedPieData.map((entry, index) => {
                const color = entry.name === 'Прочие' ? OTHER_COLOR : PIE_COLORS[index % PIE_COLORS.length];
                const pct = pieTotal > 0 ? (entry.value / pieTotal) * 100 : 0;
                return (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 8px', borderRadius: 6, background: index % 2 ? '#F9FAFB' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <span style={{ minWidth: 12, width: 12, height: 12, borderRadius: 3, background: color, marginRight: 8 }} />
                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.name}>{entry.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                      {entry.value}<span style={{ color: '#9CA3AF', fontWeight: 600 }}>{` · ${pct.toFixed(1)}%`}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ТЁМНАЯ ТАБЛИЦА */}
      <div style={darkTableStyles.container}>
        <h2 style={darkTableStyles.title}>Детализация по повторяемости</h2>
        <div style={darkTableStyles.tableWrapper}>
          <table style={darkTableStyles.table}>
            <thead>
              <tr>
                <th style={{ ...darkTableStyles.th, ...darkTableStyles.stickyCol, zIndex: 3, width: '26%', minWidth: 220, textAlign: 'left', borderTopLeftRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>Дефект</span>
                    {hiddenCount > 0 && (
                      <button onClick={showAllRows} style={{ background: 'transparent', border: '1px solid #60A5FA', borderRadius: 6, color: '#60A5FA', cursor: 'pointer', fontSize: 10, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                        Показать все ({hiddenCount})
                      </button>
                    )}
                  </div>
                </th>

                {prevWeekDays.map((d, i) => (
                  <th key={`ph${i}`} style={darkTableStyles.th}>
                    <button onClick={() => { setSortCW(null); setSortDay(p => p?.week === 'prev' && p?.index === i ? null : { week: 'prev', index: i }); }} style={{ ...darkTableStyles.sortBtn, background: sortDay?.week === 'prev' && sortDay?.index === i ? '#2563EB' : 'transparent' }}>
                      <span>{formatDate(d)}</span><span style={{ fontSize: 9 }}>{getDayOfWeek(d)}</span>
                    </button>
                  </th>
                ))}
                <th style={{ ...darkTableStyles.th, minWidth: 46 }}>
                  <button onClick={() => { setSortDay(null); setSortCW(p => p === 'prev' ? null : 'prev'); }} style={{ ...darkTableStyles.sortBtn, background: sortCW === 'prev' ? '#2563EB' : 'transparent' }}>CW{prevWeekNum}</button>
                </th>

                {currWeekDays.map((d, i) => (
                  <th key={`ch${i}`} style={darkTableStyles.th}>
                    <button onClick={() => { setSortCW(null); setSortDay(p => p?.week === 'curr' && p?.index === i ? null : { week: 'curr', index: i }); }} style={{ ...darkTableStyles.sortBtn, background: sortDay?.week === 'curr' && sortDay?.index === i ? '#2563EB' : 'transparent' }}>
                      <span>{formatDate(d)}</span><span style={{ fontSize: 9 }}>{getDayOfWeek(d)}</span>
                    </button>
                  </th>
                ))}
                <th style={{ ...darkTableStyles.th, minWidth: 46, borderTopRightRadius: '8px' }}>
                  <button onClick={() => { setSortDay(null); setSortCW(p => p === 'curr' ? null : 'curr'); }} style={{ ...darkTableStyles.sortBtn, background: sortCW === 'curr' ? '#2563EB' : 'transparent' }}>CW{currWeekNum}</button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#374151', fontWeight: 700 }}>
                <td style={{ ...darkTableStyles.td, ...darkTableStyles.stickyCol, background: '#374151', textAlign: 'left' }}>Кол-во машин</td>
                {headerCarsPrev.map((v, i) => <td key={`hcp${i}`} style={darkTableStyles.td}>{v}</td>)}
                <td style={darkTableStyles.td}>{sumCarsPrev}</td>
                {headerCarsCurr.map((v, i) => <td key={`hcc${i}`} style={darkTableStyles.td}>{v}</td>)}
                <td style={darkTableStyles.td}>{sumCarsCurr}</td>
              </tr>

              {displayRows.map((row) => {
                if (!row.isTotal && hiddenRows[row.MPP]) return null;
                const rowDpuPrev = row.isTotal ? row.dpuPrev : (sumCarsPrev > 0 ? (row.totalPrevDef * 1000) / sumCarsPrev : 0);
                const rowDpuCurr = row.isTotal ? row.dpuCurr : (sumCarsCurr > 0 ? (row.totalCurrDef * 1000) / sumCarsCurr : 0);
                const totalBg = '#1E3A8A';
                const rowBg = row.isTotal ? totalBg : '#1F2937';

                return (
                  <tr key={row.isTotal ? 'TOTAL' : row.MPP} style={{ backgroundColor: rowBg }}>
                    <td style={{ ...darkTableStyles.td, ...darkTableStyles.stickyCol, background: rowBg, textAlign: 'left', fontWeight: row.isTotal ? 800 : 600 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        {!row.isTotal && (
                          <button onClick={() => handleToggleRow(row.MPP)} title="Скрыть строку" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', padding: 0, fontSize: 11, lineHeight: 1.2 }}>▾</button>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.MPP}</div>
                          {!row.isTotal && row.PART_NAME && (
                            <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 400, whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.PART_NAME}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {renderDayCells(row.cellsPrev, prevWeekDays, row.isTotal, 'cp')}

                    <td style={{ ...darkTableStyles.td, background: row.isTotal ? totalBg : colorFunc(isDPU ? rowDpuPrev : row.totalPrevDef), color: row.isTotal ? '#FFF' : ((isDPU ? rowDpuPrev : row.totalPrevDef) > (isDPU ? 300 : 15) ? '#FFF' : '#000'), fontWeight: 800 }}>
                      {isDPU ? formatDPU(rowDpuPrev) : row.totalPrevDef}
                    </td>

                    {renderDayCells(row.cellsCurr, currWeekDays, row.isTotal, 'cc')}

                    <td style={{ ...darkTableStyles.td, background: row.isTotal ? totalBg : colorFunc(isDPU ? rowDpuCurr : row.totalCurrDef), color: row.isTotal ? '#FFF' : ((isDPU ? rowDpuCurr : row.totalCurrDef) > (isDPU ? 300 : 15) ? '#FFF' : '#000'), fontWeight: 800 }}>
                      {isDPU ? formatDPU(rowDpuCurr) : row.totalCurrDef}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}