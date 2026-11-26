import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LabelList, Tooltip
} from 'recharts';

const API_BASE = '';
// ЦВЕТА: Ремонтники - зеленые, Качество - красные
const COLOR_REP = '#10B981';   // Ремонтники (зеленый)
const COLOR_OTHER = '#EF4444'; // Качество (красный)

// Анимация загрузки (как в DRR Логистика)
const loadingAnimation = `
  @keyframes loadingDotBlink {
    0%, 20% { opacity: 0.2; }
    50% { opacity: 1; }
    100% { opacity: 0.2; }
  }
  .loading-dots {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
  }
  .loading-dots span {
    animation: loadingDotBlink 1.4s infinite both;
    font-weight: 600;
    color: #6B7280;
    font-size: 18px;
    line-height: 1;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  .loading-dots span:nth-child(4) { animation-delay: 0.6s; }
`;

// Стили из REPELEC Report
const cardStyle = { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' };
const sectionCardStyle = { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5', display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' };
const tabStyle = (active, color = '#7C3AED') => ({ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: active ? color : '#F3F4F6', color: active ? '#FFFFFF' : '#6B7280', cursor: 'pointer', boxShadow: active ? `0 4px 12px ${color}40` : 'none', transition: 'all 0.2s' });
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB', outline: 'none' };

const thStyle = { textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', whiteSpace: 'nowrap', padding: '5px 4px', fontSize: '10px' };
const tdStyle = { textAlign: 'center', borderBottom: '1px solid #F0F0F5', color: '#1F2937', whiteSpace: 'nowrap', padding: '6px 4px', fontSize: '11px', transition: 'background-color 0.2s' };

const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 10px 0', paddingBottom: 6, borderBottom: '2px solid #E5E7EB', height: 26, boxSizing: 'border-box' };
const reportHeaderStyle = { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 14px 0', paddingBottom: 10, borderBottom: '2px solid #E5E7EB' };
const tableHeaderStyle = { fontSize: 12, fontWeight: 700, color: '#374151', margin: '10px 0 6px 0' };
const tableWrapStyle = { marginTop: 4, border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden', flexGrow: 1 };
const dashDividerStyle = { borderTop: '2px dashed #CBD5E1', marginTop: 12, marginBottom: 8 };
const reppsTypeBgColors = { year: '#F3E8FF', month: '#E0F2FE', week: '#CCFBF1', day: '#FEF3C7' };
const H_CHART_2 = 260;
const modalRowsPerPage = 50;

// Сокращение подписей
const shortenLabel = (label, type) => {
  if (type === 'month') { const [m, y] = label.split(' '); return y ? `${m}'${y.slice(2)}` : m; }
  if (type === 'week') return label.split(' ')[0];
  return label;
};

export default function RepassClosureRate() {
  const [period, setPeriod] = useState('all');
  const [count, setCount] = useState(3);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dataPoints, setDataPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Модалка
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalVins, setModalVins] = useState([]);
  const [modalMeta, setModalMeta] = useState({ period: '', category: '', shift: '' });
  const [modalPage, setModalPage] = useState(1);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    if (p === 'all') { setFromDate(''); setToDate(''); }
    else { const d = { year: 2, month: 3, week: 4, day: 14 }; setCount(d[p] || 3); }
  };

  // Блокировка скролла страницы при открытой модалке
  useEffect(() => {
    if (modalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modalOpen]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period !== 'all' && count) params.append('count', count);
    if (period !== 'all' && fromDate && toDate) {
      params.append('fromDate', fromDate);
      params.append('toDate', toDate);
    }
    fetch(`${API_BASE}/api/cp-final-late-repair?${params}`)
      .then(r => r.json())
      .then(json => { setDataPoints(json.dataPoints || []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [period, count, fromDate, toDate]);

  const chartData = useMemo(() => dataPoints.map(p => ({
    ...p,
    total: (p.rep || 0) + (p.other || 0),
    totalA: (p.shiftA_rep || 0) + (p.shiftA_other || 0),
    totalB: (p.shiftB_rep || 0) + (p.shiftB_other || 0),
  })), [dataPoints]);

  const groupedByType = useMemo(() => {
    if (period !== 'all') return null;
    return {
      months: chartData.filter(p => p.type === 'month'),
      weeks: chartData.filter(p => p.type === 'week'),
      days: chartData.filter(p => p.type === 'day')
    };
  }, [chartData, period]);

  const openDetails = (p, category, shift = 'all') => {
    setModalOpen(true);
    setModalLoading(true);
    setModalVins([]);
    setModalMeta({ period: p.label, category, shift });
    setModalPage(1); // Сброс страницы при открытии
    
    const params = new URLSearchParams({
      startDate: p.startDate,
      endDate: p.endDate,
      category,
      shift
    });
    fetch(`${API_BASE}/api/cp-final-late-repair/details?${params}`)
      .then(r => r.json())
      .then(json => { setModalVins(json || []); setModalLoading(false); })
      .catch(() => setModalLoading(false));
  };

  // Отрисовка графика (Общий: Качество / Ремонтники)
  const renderChart = (points) => {
    if (!points.length) return <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>;
    const displayData = points.map(p => {
      const rep = Number(p.rep) || 0;
      const other = Number(p.other) || 0;
      return {
        ...p,
        displayLabel: shortenLabel(p.label, p.type),
        displayTotal: rep + other,
        rep: rep > 0 ? rep : 0.001,
        other: other > 0 ? other : 0.001,
      };
    });

    return (
      <ResponsiveContainer width="100%" height={H_CHART_2}>
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="displayLabel" tick={{ fontSize: 10 }} interval={0} height={28} />
          <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
          <Tooltip labelFormatter={(val, payload) => payload?.[0]?.payload?.label || val} />
          <Bar dataKey="other" stackId="s" fill={COLOR_OTHER} barSize={22} name="Качество" radius={[4, 4, 0, 0]} />
          <Bar dataKey="rep" stackId="s" fill={COLOR_REP} barSize={22} name="Ремонтники" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="displayTotal" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#111827' }} formatter={v => v > 0.001 ? Math.round(v) : ''} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Отрисовка графика по сменам
  const renderShiftChart = (points) => {
    if (!points.length) return <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>;
    
    const maxTotal = Math.max(...points.map(p => (p.shiftA_rep||0) + (p.shiftA_other||0) + (p.shiftB_rep||0) + (p.shiftB_other||0)), 1);
    const separatorValue = maxTotal * 0.02;

    const displayData = points.map(p => {
      const aRep = Number(p.shiftA_rep) || 0;
      const aOther = Number(p.shiftA_other) || 0;
      const bRep = Number(p.shiftB_rep) || 0;
      const bOther = Number(p.shiftB_other) || 0;
      const total = aRep + aOther + bRep + bOther;
      
      return {
        ...p,
        displayLabel: shortenLabel(p.label, p.type),
        displayTotal: total,
        shiftA_other: aOther > 0 ? aOther : 0.001,
        shiftA_rep: aRep > 0 ? aRep : 0.001,
        separator: total > 0 ? separatorValue : 0.001,
        shiftB_other: bOther > 0 ? bOther : 0.001,
        shiftB_rep: bRep > 0 ? bRep : 0.001,
      };
    });

    return (
      <ResponsiveContainer width="100%" height={H_CHART_2}>
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="displayLabel" tick={{ fontSize: 10 }} interval={0} height={28} />
          <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
          <Tooltip 
            labelFormatter={(val, payload) => payload?.[0]?.payload?.label || val}
            formatter={(value, name) => {
              if (name === 'separator') return null;
              return [Math.round(value), name];
            }}
          />
          <Bar dataKey="shiftA_other" stackId="s" fill="#FCA5A5" barSize={22} name="Качество (A)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="shiftA_rep" stackId="s" fill="#6EE7B7" barSize={22} name="Ремонтники (A)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="separator" stackId="s" fill="#FFFFFF" barSize={22} name="separator" radius={[4, 4, 0, 0]} />
          <Bar dataKey="shiftB_other" stackId="s" fill="#EF4444" barSize={22} name="Качество (B)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="shiftB_rep" stackId="s" fill="#10B981" barSize={22} name="Ремонтники (B)" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="displayTotal" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#111827' }} formatter={v => v > 0.001 ? Math.round(v) : ''} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderCategoryTable = (points) => {
    if (!points.length) return null;
    const displayLabels = points.map(p => shortenLabel(p.label, p.type));
    const rows = [
      { key: 'other', label: 'Качество', color: COLOR_OTHER },
      { key: 'rep', label: 'Ремонтники', color: COLOR_REP },
      { key: 'total', label: 'Всего', color: '#111827', bold: true }
    ];

    return (
      <>
        <h4 style={tableHeaderStyle}>Категории</h4>
        <div style={tableWrapStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={{ ...thStyle, width: 85, paddingLeft: 6, textAlign: 'left', whiteSpace: 'normal' }}>Категория</th>
                {points.map((point, idx) => (
                  <th key={idx} style={{ ...thStyle, backgroundColor: reppsTypeBgColors[point.type] }}>{displayLabels[idx]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key} style={{ backgroundColor: row.bold ? '#F3F4F6' : 'white', fontWeight: row.bold ? 700 : 400 }}>
                  <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', color: row.color, fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.label}</td>
                  {points.map((point, idx) => {
                    const val = row.key === 'total' ? (point.rep || 0) + (point.other || 0) : (point[row.key] || 0);
                    return (
                      <td key={idx}
                          style={{ ...tdStyle, cursor: val > 0 ? 'pointer' : 'default', color: val > 0 && !row.bold ? '#2563EB' : 'inherit', fontWeight: row.bold ? 700 : 600 }}
                          onClick={() => val > 0 && openDetails(point, row.key)}
                          onMouseEnter={(e) => { if (val > 0) e.currentTarget.style.backgroundColor = '#BFDBFE'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          title={val > 0 ? 'Клик — показать VIN' : ''}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderShiftTable = (points) => {
    if (!points.length) return null;
    const displayLabels = points.map(p => shortenLabel(p.label, p.type));
    const rows = [
      { letter: 'A', label: 'Смена A' },
      { letter: 'B', label: 'Смена B' }
    ];

    return (
      <>
        <h4 style={tableHeaderStyle}>По сменам</h4>
        <div style={tableWrapStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={{ ...thStyle, width: 90, paddingLeft: 6, textAlign: 'left' }}>Смена</th>
                {points.map((point, idx) => (
                  <th key={idx} style={{ ...thStyle, backgroundColor: reppsTypeBgColors[point.type] }}>{displayLabels[idx]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.letter} style={{ backgroundColor: 'white' }}>
                  <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', fontWeight: 700 }}>
                    {row.label}
                  </td>
                  {points.map((point, idx) => {
                    const repVal = point[`shift${row.letter}_rep`] || 0;
                    const otherVal = point[`shift${row.letter}_other`] || 0;
                    const totalVal = repVal + otherVal;
                    return (
                      <td key={idx}
                          style={{ ...tdStyle, cursor: totalVal > 0 ? 'pointer' : 'default', backgroundColor: reppsTypeBgColors[point.type] }}
                          onClick={() => totalVal > 0 && openDetails(point, 'all', row.letter)}
                          onMouseEnter={(e) => { if (totalVal > 0) e.currentTarget.style.backgroundColor = '#BFDBFE'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = reppsTypeBgColors[point.type]; }}
                          title={totalVal > 0 ? 'Клик — показать VIN' : ''}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                          <span style={{ color: COLOR_REP, fontWeight: 700 }}>{repVal}</span>
                          <span style={{ color: COLOR_OTHER, fontWeight: 700 }}>{otherVal}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ backgroundColor: '#F3F4F6', fontWeight: 700 }}>
                <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left' }}>Всего</td>
                {points.map((point, idx) => (
                  <td key={idx} style={{ ...tdStyle, fontWeight: 700 }}>
                    {(point.shiftA_rep || 0) + (point.shiftA_other || 0) + (point.shiftB_rep || 0) + (point.shiftB_other || 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderSection = (title, points, accent) => (
    <div key={title} style={sectionCardStyle}>
      <h3 style={{ ...sectionTitleStyle, color: accent }}>{title}</h3>
      {renderChart(points)}
      {renderCategoryTable(points)}
      <div style={dashDividerStyle} />
      {renderShiftTable(points)}
    </div>
  );

  const renderShiftChartSection = (title, points, accent) => (
    <div key={title} style={sectionCardStyle}>
      <h3 style={{ ...sectionTitleStyle, color: accent }}>{title}</h3>
      {renderShiftChart(points)}
    </div>
  );

  // --- СТАТИСТИКА ДЛЯ МОДАЛКИ ---
  const totalDefects = modalVins.length;
  const uniqueVins = new Set(modalVins.map(v => v.vin)).size;
  const repDefects = modalVins.filter(v => v.isRep).length;
  const otherDefects = totalDefects - repDefects;

  const totalModalPages = Math.ceil(totalDefects / modalRowsPerPage);
  const paginatedModalVins = useMemo(() => {
    const start = (modalPage - 1) * modalRowsPerPage;
    return modalVins.slice(start, start + modalRowsPerPage);
  }, [modalVins, modalPage]);

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1500, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 20 }}>
        Закрытие ремонтов Health Process
      </h1>

      {/* ФИЛЬТРЫ */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>Период:</span>
          {['all','year','month','week','day'].map(p => (
            <button key={p} onClick={() => handlePeriodChange(p)} style={tabStyle(period === p)}>
              {{ all: 'Все', year: 'Год', month: 'Месяц', week: 'Неделя', day: 'День' }[p]}
            </button>
          ))}
          {period !== 'all' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                Кол-во: <input type="number" min="1" max="50" value={count}
                  onChange={e => setCount(parseInt(e.target.value, 10) || 1)}
                  style={{ ...inputStyle, width: 80 }} />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>От:</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>По:</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 16, fontSize: 13, marginLeft: 'auto' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: COLOR_OTHER, borderRadius: 3 }} /> Качество
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: COLOR_REP, borderRadius: 3 }} /> Ремонтники
            </span>
          </div>
        </div>
      </div>

      {/* ОСНОВНОЙ БЛОК ДАННЫХ */}
      {loading ? (
        <div style={cardStyle}>
          <style>{loadingAnimation}</style>
          <div className="loading-dots" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span>Загрузка данных</span><span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      ) : period === 'all' ? (
        <div style={cardStyle}>
          <h2 style={reportHeaderStyle}>Динамика по категориям и сменам</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, alignItems: 'stretch' }}>
            {renderSection('📅 3 месяца', groupedByType.months, '#0EA5E9')}
            {renderSection('📆 4 недели',  groupedByType.weeks,  '#14B8A6')}
            {renderSection('📊 14 дней',   groupedByType.days,   '#F59E0B')}
          </div>

          <h2 style={{ ...reportHeaderStyle, marginTop: 30 }}>Динамика по сменам (A и B)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, alignItems: 'stretch' }}>
            {renderShiftChartSection('📅 3 месяца', groupedByType.months, '#0EA5E9')}
            {renderShiftChartSection('📆 4 недели',  groupedByType.weeks,  '#14B8A6')}
            {renderShiftChartSection('📊 14 дней',   groupedByType.days,   '#F59E0B')}
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <h2 style={reportHeaderStyle}>Динамика по категориям и сменам</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 30 }}>
            <div>{renderChart(chartData)}</div>
            <div>{renderCategoryTable(chartData)}</div>
          </div>
          <div style={dashDividerStyle} />
          {renderShiftTable(chartData)}
          
          <h2 style={{ ...reportHeaderStyle, marginTop: 30 }}>Динамика по сменам (A и B)</h2>
          <div>{renderShiftChart(chartData)}</div>
        </div>
      )}

      {/* МОДАЛКА ДЕТАЛИЗАЦИИ */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '10px' }} onClick={() => setModalOpen(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, width: '100%', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Шапка модалки со статистикой */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                  Детализация: {modalMeta.period} · {modalMeta.category === 'rep' ? 'Ремонтники' : modalMeta.category === 'other' ? 'Качество' : 'Всего'} {modalMeta.shift !== 'all' ? `· Смена ${modalMeta.shift}` : ''}
                </h3>
                <div style={{ margin: '6px 0 0', fontSize: 13, color: '#4B5563', display: 'flex', gap: 16 }}>
                  <span>Всего дефектов: <b>{totalDefects}</b></span>
                  <span>Уник. VIN: <b>{uniqueVins}</b></span>
                  <span style={{ color: COLOR_REP }}>Ремонтники: <b>{repDefects}</b></span>
                  <span style={{ color: COLOR_OTHER }}>Качество: <b>{otherDefects}</b></span>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>×</button>
            </div>

            {modalLoading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <style>{loadingAnimation}</style>
                <div className="loading-dots">
                  <span>Загрузка</span><span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            ) : modalVins.length === 0 ? (
              <p style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Нет данных</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                
                {/* Таблица с данными */}
                <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #E5E7EB', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>VIN</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>Модель</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>Дефект (Деталь / Проблема)</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>Кто закрыл (Аккаунт)</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>Время CPFinal</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>Время CP72</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>Время ремонта</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>Смена</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedModalVins.map((v, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5', fontFamily: 'monospace' }}>{v.vin}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5' }}>{v.model}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5' }}>
                            <span style={{ fontWeight: 600 }}>{v.part}</span><br/>
                            <span style={{ fontSize: 12, color: '#DC2626' }}>{v.problem}</span>
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5', fontWeight: 700, color: v.isRep ? COLOR_REP : COLOR_OTHER }}>
                            {v.repairAccount}
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5' }}>{new Date(v.cpFinal).toLocaleString('ru-RU')}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5' }}>{new Date(v.cp72).toLocaleString('ru-RU')}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5', fontWeight: 600, color: '#DC2626' }}>{new Date(v.repairTime).toLocaleString('ru-RU')}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F5' }}>{v.shift || 'Ночь'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Пагинация (стилизованная как в SgpAuditPage) */}
                {totalModalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                    <span style={{ fontSize: 14, color: '#6B7280' }}>Всего: {modalVins.length} записей</span>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <button 
                        onClick={() => setModalPage(p => Math.max(1, p - 1))} 
                        disabled={modalPage === 1} 
                        style={{ 
                          padding: '8px 20px', borderRadius: 8, border: 'none', 
                          background: modalPage === 1 ? '#E5E7EB' : '#2563EB', color: 'white', 
                          fontWeight: 600, fontSize: 14, cursor: modalPage === 1 ? 'not-allowed' : 'pointer' 
                        }}
                      >
                        ← Назад
                      </button>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{modalPage} / {totalModalPages}</span>
                      <button 
                        onClick={() => setModalPage(p => Math.min(totalModalPages, p + 1))} 
                        disabled={modalPage === totalModalPages} 
                        style={{ 
                          padding: '8px 20px', borderRadius: 8, border: 'none', 
                          background: modalPage === totalModalPages ? '#E5E7EB' : '#2563EB', color: 'white', 
                          fontWeight: 600, fontSize: 14, cursor: modalPage === totalModalPages ? 'not-allowed' : 'pointer' 
                        }}
                      >
                        Вперёд →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}