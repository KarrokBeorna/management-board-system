import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx'; 
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LabelList,
} from 'recharts';

const API_BASE = '';

const reppsTypeBgColors = { year: '#F3E8FF', month: '#E0F2FE', week: '#CCFBF1', day: '#FEF3C7' };
const SHIFT_A_COLOR = '#F59E0B';
const SHIFT_B_COLOR = '#10B981';

const modelShortNames = { 
  'ESTEO MX': 'MX', 'JELAND J6': 'J6', 'JELAND J7': 'J7', 'TENET A8': 'A8', 'JELAND J8': 'J8', 'total': 'Total' 
};
const H_CHART_2 = 260;

const cardStyle = { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5' };
const sectionCardStyle = { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #F0F0F5', display: 'flex', flexDirection: 'column', minWidth: 0 };
const tabStyle = (active) => ({ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: active ? '#7C3AED' : '#F3F4F6', color: active ? '#FFFFFF' : '#6B7280', cursor: 'pointer', boxShadow: active ? '0 4px 12px rgba(124,58,237,0.25)' : 'none', transition: 'all 0.2s' });
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB' };
const thStyle = { textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', whiteSpace: 'nowrap', padding: '5px 4px', fontSize: '10px' };
const tdStyle = { textAlign: 'center', borderBottom: '1px solid #F0F0F5', color: '#1F2937', whiteSpace: 'nowrap', padding: '3px 4px', fontSize: '11px' };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 10px 0', paddingBottom: 6, borderBottom: '2px solid #E5E7EB', height: 26, boxSizing: 'border-box' };
const reportHeaderStyle = { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 14px 0', paddingBottom: 10, borderBottom: '2px solid #E5E7EB' };
const tableHeaderStyle = { fontSize: 12, fontWeight: 700, color: '#374151', margin: '10px 0 6px 0' };
const tableWrapStyle = { marginTop: 4, border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' };
const dashDividerStyle = { borderTop: '2px dashed #CBD5E1', marginTop: 12, marginBottom: 8 };
const modalThStyle = { padding: '10px 12px', textAlign: 'left', background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 2, whiteSpace: 'nowrap' };
const modalTdStyle = { padding: '8px 12px', borderBottom: '1px solid #F0F0F5', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' };

const shortenLabel = (label, type) => {
  if (type === 'month') { const [m, y] = label.split(' '); return y ? `${m}'${y.slice(2)}` : m; }
  if (type === 'week') return label.split(' ')[0];
  return label;
};

const formatDateTime = (str) => {
  if (!str) return '—';
  try { return new Date(str).toLocaleString('ru-RU'); } catch { return String(str); }
};

export default function RepelecReportPage() {
  const [period, setPeriod] = useState('all');
  const [count, setCount] = useState(3);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [dataPoints, setDataPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalVins, setModalVins] = useState([]);
  const [modalMeta, setModalMeta] = useState({ label: '', shift: '', model: '' });

  const availableModels = ['ALL', 'ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];
  const modelKeys = ['ESTEO MX', 'JELAND J6', 'JELAND J7', 'JELAND J8', 'TENET A8'];

  useEffect(() => {
    if (modalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modalOpen]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === 'all') { setFromDate(''); setToDate(''); }
    else { const defaults = { year: 2, month: 3, week: 4, day: 14 }; setCount(defaults[newPeriod] || 3); }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period !== 'all' && count) params.append('count', count);
    if (period !== 'all' && fromDate && toDate) { params.append('fromDate', fromDate); params.append('toDate', toDate); }
    fetch(`${API_BASE}/api/repelec-report?${params.toString()}`)
      .then(res => res.json())
      .then(json => { setDataPoints(json.dataPoints || []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [period, count, fromDate, toDate]);

  const chartData = useMemo(() => dataPoints.map(p => ({ ...p })), [dataPoints]);
  const groupedByType = useMemo(() => {
    if (period !== 'all') return null;
    return { months: chartData.filter(p => p.type === 'month'), weeks: chartData.filter(p => p.type === 'week'), days: chartData.filter(p => p.type === 'day') };
  }, [chartData, period]);

  const stackKeyA = selectedModel === 'ALL' ? 'shiftA' : `${selectedModel}_A`;
  const stackKeyB = selectedModel === 'ALL' ? 'shiftB' : `${selectedModel}_B`;

  const openVinsModal = (startDate, endDate, shift, model, label) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalVins([]);
    setModalMeta({ label, shift, model });

    const params = new URLSearchParams({ dateFrom: startDate, dateTo: endDate, shift });
    if (model && model !== 'ALL') params.append('model', model);

    fetch(`${API_BASE}/api/repelec-vins?${params.toString()}`)
      .then(res => res.json())
      .then(json => { setModalVins(json || []); setModalLoading(false); })
      .catch(() => { setModalVins([]); setModalLoading(false); });
  };

  const closeModal = () => { setModalOpen(false); setModalVins([]); };

  const exportErrorsToExcel = () => {
    const exportData = [];
    modalVins.forEach(item => {
      const bmsList = item.bms_defects || [];
      
      if (bmsList.length === 0) {
        exportData.push({
          'VIN': item.vin,
          'Модель': item.model,
          'Время REPELEC': formatDateTime(item.repelec_time),
          'Время CP72': formatDateTime(item.cp72_time),
          'Станция BMS': '—',
          'Модуль BMS': '—',
          'Результат BMS': '—',
          'Описание ошибки BMS': '—',
        });
      } else {
        bmsList.forEach(b => {
          exportData.push({
            'VIN': item.vin,
            'Модель': item.model,
            'Время REPELEC': formatDateTime(item.repelec_time),
            'Время CP72': formatDateTime(item.cp72_time),
            'Станция BMS': b.test_station,
            'Модуль BMS': b.module_name,
            'Результат BMS': b.result,
            'Описание ошибки BMS': b.fault_content,
          });
        });
      }
    });

    if (exportData.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ошибки REPELEC');
    ws['!cols'] = [
      { wch: 22 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, 
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 50 }
    ];
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `REPELEC_BMS_Ошибки_${dateStr}.xlsx`);
  };

  const renderStackChart = (points) => {
    if (!points.length) return <p style={{ padding: 16, color: '#6B7280', textAlign: 'center', fontSize: 13 }}>Нет данных</p>;
    
    const displayData = points.map(p => {
      const aVal = Number(p[stackKeyA]) || 0;
      const bVal = Number(p[stackKeyB]) || 0;
      const displayTotal = aVal + bVal; 
      return { 
        ...p, 
        displayLabel: shortenLabel(p.label, p.type), 
        displayTotal,
        [stackKeyA]: aVal > 0 ? aVal : 0.001, 
        [stackKeyB]: bVal > 0 ? bVal : 0.001 
      };
    });

    return (
      <ResponsiveContainer width="100%" height={H_CHART_2}>
        <BarChart data={displayData} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="displayLabel" tick={{ fontSize: 10 }} interval={0} height={28} />
          <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
          <Bar dataKey={stackKeyA} stackId="s" fill={SHIFT_A_COLOR} barSize={22} />
          <Bar dataKey={stackKeyB} stackId="s" fill={SHIFT_B_COLOR} barSize={22} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="displayTotal" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#111827' }} formatter={v => v > 0.001 ? v : ''} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderCategoryTable = (points) => {
    if (!points.length) return null;
    const displayLabels = points.map(p => shortenLabel(p.label, p.type));

    const rows = [
      { key: stackKeyA, label: 'Смена А', color: SHIFT_A_COLOR, shiftCode: 'A' },
      { key: stackKeyB, label: 'Смена B', color: SHIFT_B_COLOR, shiftCode: 'B' },
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
                <tr key={row.key} style={{ backgroundColor: 'white' }}>
                  <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', color: row.color, fontWeight: 700 }}>{row.label}</td>
                  {points.map((point, idx) => {
                    const val = point[row.key];
                    return (
                      <td 
                        key={idx} 
                        style={{ ...tdStyle, cursor: 'pointer', backgroundColor: reppsTypeBgColors[point.type], fontWeight: 700, color: row.color }}
                        onClick={() => val > 0 && openVinsModal(point.startDate, point.endDate, row.shiftCode, selectedModel, point.label)}
                        onMouseEnter={(e) => { if (val > 0) e.currentTarget.style.backgroundColor = '#BFDBFE'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = reppsTypeBgColors[point.type]; }}
                        title={val > 0 ? 'Клик — показать VIN' : ''}
                      >
                        {val || 0}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ backgroundColor: '#F3F4F6', fontWeight: 700 }}>
                <td style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left' }}>Всего</td>
                {points.map((point, idx) => {
                   const total = (Number(point[stackKeyA]) || 0) + (Number(point[stackKeyB]) || 0);
                   return <td key={idx} style={{ ...tdStyle, fontWeight: 700 }}>{total || 0}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderModelTable = (points) => {
    if (!points.length) return null;
    const displayLabels = points.map(p => shortenLabel(p.label, p.type));
    const modelsToShow = selectedModel === 'ALL' ? [...modelKeys, 'total'] : [selectedModel];

    return (
      <>
        <h4 style={tableHeaderStyle}>По моделям и сменам</h4>
        <div style={tableWrapStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={{ ...thStyle, width: 60, paddingLeft: 6, textAlign: 'left' }}>Мод.</th>
                <th style={{ ...thStyle, width: 30 }}>См.</th>
                {points.map((point, idx) => (
                  <th key={idx} style={{ ...thStyle, backgroundColor: reppsTypeBgColors[point.type] }}>{displayLabels[idx]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelsToShow.map(modelKey => {
                const isTotal = modelKey === 'total';
                return (
                  <React.Fragment key={modelKey}>
                    <tr style={{ backgroundColor: isTotal ? '#F3F4F6' : 'white' }}>
                      <td rowSpan={2} style={{ ...tdStyle, paddingLeft: 6, textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #E5E7EB' }}>{modelShortNames[modelKey] || modelKey}</td>
                      <td style={{ ...tdStyle, color: SHIFT_A_COLOR, fontWeight: 700, borderBottom: 'none' }}>А</td>
                      {points.map((point, idx) => {
                        const val = isTotal ? point.shiftA : point[`${modelKey}_A`];
                        const modelParam = isTotal ? 'ALL' : modelKey;
                        return (
                          <td 
                            key={idx} 
                            style={{ ...tdStyle, cursor: 'pointer', color: SHIFT_A_COLOR, borderBottom: 'none', backgroundColor: reppsTypeBgColors[point.type] }}
                            onClick={() => val > 0 && openVinsModal(point.startDate, point.endDate, 'A', modelParam, point.label)}
                            onMouseEnter={(e) => { if (val > 0) e.currentTarget.style.backgroundColor = '#BFDBFE'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = reppsTypeBgColors[point.type]; }}
                            title={val > 0 ? 'Клик — показать VIN' : ''}
                          >
                            {val || 0}
                          </td>
                        );
                      })}
                    </tr>
                    <tr style={{ backgroundColor: isTotal ? '#F3F4F6' : 'white' }}>
                      <td style={{ ...tdStyle, color: SHIFT_B_COLOR, fontWeight: 700, borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>B</td>
                      {points.map((point, idx) => {
                        const val = isTotal ? point.shiftB : point[`${modelKey}_B`];
                        const modelParam = isTotal ? 'ALL' : modelKey;
                        return (
                          <td 
                            key={idx} 
                            style={{ ...tdStyle, cursor: 'pointer', color: SHIFT_B_COLOR, borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', backgroundColor: reppsTypeBgColors[point.type] }}
                            onClick={() => val > 0 && openVinsModal(point.startDate, point.endDate, 'B', modelParam, point.label)}
                            onMouseEnter={(e) => { if (val > 0) e.currentTarget.style.backgroundColor = '#BFDBFE'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = reppsTypeBgColors[point.type]; }}
                            title={val > 0 ? 'Клик — показать VIN' : ''}
                          >
                            {val || 0}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderSection = (title, points, accent) => (
    <div key={title} style={sectionCardStyle}>
      <h3 style={{ ...sectionTitleStyle, color: accent }}>{title}</h3>
      {renderStackChart(points)}
      {renderCategoryTable(points)}
      <div style={dashDividerStyle} />
      {renderModelTable(points)}
    </div>
  );

  const categoryLabels = { A: 'Смена A', B: 'Смена B' };

  return (
    <div style={{ padding: '20px 30px 20px 16px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1500, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 20 }}>REPELEC Report</h1>

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>Период:</span>
            <button onClick={() => handlePeriodChange('all')} style={tabStyle(period === 'all')}>Все</button>
            <button onClick={() => handlePeriodChange('year')} style={tabStyle(period === 'year')}>Год</button>
            <button onClick={() => handlePeriodChange('month')} style={tabStyle(period === 'month')}>Месяц</button>
            <button onClick={() => handlePeriodChange('week')} style={tabStyle(period === 'week')}>Неделя</button>
            <button onClick={() => handlePeriodChange('day')} style={tabStyle(period === 'day')}>День</button>
          </div>

          {period !== 'all' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563' }}>
                Кол-во:
                <input type="number" min="1" max="50" value={count} onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)} style={{ ...inputStyle, width: 80 }} />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>От:</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4B5563' }}>По:</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}

          <label style={{ fontSize: 14, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
            Модель:
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={inputStyle}>
              {availableModels.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Все' : m}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#4B5563', marginLeft: 'auto' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, backgroundColor: SHIFT_A_COLOR, borderRadius: 3 }} /> Смена A
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, backgroundColor: SHIFT_B_COLOR, borderRadius: 3 }} /> Смена B
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}><p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Загрузка данных...</p></div>
      ) : period === 'all' ? (
        <div style={cardStyle}>
          <h2 style={reportHeaderStyle}>Авто в REPELEC по сменам</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 2.3fr)', gap: 16, alignItems: 'start' }}>
            {renderSection('📅 3 месяца', groupedByType.months, '#0EA5E9')}
            {renderSection('📆 4 недели',  groupedByType.weeks,  '#14B8A6')}
            {renderSection('📊 14 дней',   groupedByType.days,   '#F59E0B')}
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <h2 style={reportHeaderStyle}>Авто в REPELEC по сменам</h2>
          {renderStackChart(chartData)}
          {renderCategoryTable(chartData)}
          <div style={dashDividerStyle} />
          {renderModelTable(chartData)}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }} onClick={closeModal}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, width: '100%', maxWidth: '98vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                  {modalMeta.label} · {categoryLabels[modalMeta.shift] || modalMeta.shift}
                  {modalMeta.model !== 'ALL' && ` · ${modalMeta.model}`}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Всего VIN: {modalVins.length}</p>
              </div>
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={exportErrorsToExcel} 
                  style={{ 
                    background: '#059669', color: '#FFF', border: 'none', borderRadius: 6, 
                    padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  📊 Экспорт в Excel
                </button>
                <button onClick={closeModal} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>×</button>
              </div>
            </div>

            {modalLoading ? (
              <p style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Загрузка...</p>
            ) : modalVins.length === 0 ? (
              <p style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Нет данных</p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #E5E7EB', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ ...modalThStyle, width: 165 }}>VIN</th>
                      <th style={{ ...modalThStyle, width: 110 }}>Модель</th>
                      <th style={{ ...modalThStyle, width: 140 }}>Время REPELEC</th>
                      <th style={{ ...modalThStyle, width: 140 }}>Время CP72</th>
                      
                      <th style={{ ...modalThStyle, background: '#F3E8FF', color: '#6B21A8', width: 140 }}>Станция BMS</th>
                      <th style={{ ...modalThStyle, background: '#F3E8FF', color: '#6B21A8', width: 140 }}>Модуль BMS</th>
                      <th style={{ ...modalThStyle, background: '#F3E8FF', color: '#6B21A8', width: 100 }}>Результат BMS</th>
                      <th style={{ ...modalThStyle, background: '#F3E8FF', color: '#6B21A8' }}>Описание ошибки BMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalVins.map((item, idx) => {
                      const bmsList = item.bms_defects || [];
                      const rowCount = Math.max(bmsList.length, 1);

                      return Array.from({ length: rowCount }).map((_, i) => {
                        const bms = bmsList[i];
                        return (
                          <tr key={`${idx}-${i}`} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: i === rowCount - 1 ? '2px solid #E5E7EB' : '1px solid #F0F0F5' }}>
                            {i === 0 && (
                              <>
                                <td rowSpan={rowCount} style={{ ...modalTdStyle, fontFamily: 'monospace', fontWeight: 600, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                  {item.vin}
                                </td>
                                <td rowSpan={rowCount} style={{ ...modalTdStyle, verticalAlign: 'middle' }}>
                                  {item.model}
                                </td>
                                <td rowSpan={rowCount} style={{ ...modalTdStyle, fontSize: 12, verticalAlign: 'middle' }}>
                                  {formatDateTime(item.repelec_time)}
                                </td>
                                <td rowSpan={rowCount} style={{ ...modalTdStyle, fontSize: 12, verticalAlign: 'middle', fontWeight: 600 }}>
                                  {formatDateTime(item.cp72_time)}
                                </td>
                              </>
                            )}

                            {bms ? (
                              <>
                                <td style={{ ...modalTdStyle, color: '#6B21A8', fontWeight: 600, backgroundColor: '#FAF5FF' }}>{bms.test_station}</td>
                                <td style={{ ...modalTdStyle, color: '#6B21A8', backgroundColor: '#FAF5FF' }}>{bms.module_name}</td>
                                <td style={{ ...modalTdStyle, color: '#DC2626', fontWeight: 700, backgroundColor: '#FAF5FF' }}>{bms.result}</td>
                                <td style={{ ...modalTdStyle, color: '#6B21A8', backgroundColor: '#FAF5FF' }}>{bms.fault_content}</td>
                              </>
                            ) : (
                              <td colSpan={4} style={{ ...modalTdStyle, textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                                Нет данных BMS
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })}
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