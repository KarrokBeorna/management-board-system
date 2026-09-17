import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = '';

/* ===================== ХЕЛПЕРЫ ===================== */
function toLocalDateStr(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
function formatDateDDMM(date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getDayOfWeekShort(date) {
  return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date(date).getDay()];
}
function getTodayStr() {
  return toLocalDateStr(new Date());
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

/* ===================== СТИЛИ ===================== */
const containerStyle = {
  padding: '20px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  width: '100%',
  height: '100vh',
  boxSizing: 'border-box',
  backgroundColor: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
  flexWrap: 'wrap',
  gap: 12,
  flexShrink: 0,
};

const titleStyle = {
  fontSize: '1.9rem',
  fontWeight: 900,
  color: '#1E293B',
  margin: 0,
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: 16,
  border: '1px solid #E2E8F0',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const inputStyle = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 13,
  background: '#FFFFFF',
  outline: 'none',
};

const mainTabStyle = (active) => ({
  padding: '9px 20px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  background: active ? '#2563EB' : '#E5E7EB',
  color: active ? '#FFFFFF' : '#374151',
  transition: 'all 0.15s',
});

const filterBarStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
  marginBottom: 12,
  padding: 12,
  backgroundColor: '#F8FAFC',
  borderRadius: 10,
  flexShrink: 0,
};

const filterLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: '#475569',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const navBtnStyle = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
};

const tableWrapStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  background: '#FFFFFF',
};

const thBaseStyle = {
  padding: '6px 8px',
  textAlign: 'center',
  fontWeight: 700,
  color: '#FFFFFF',
  background: '#2563EB',
  fontSize: 11,
  position: 'sticky',
  zIndex: 5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid #1D4ED8',
  borderBottom: '1px solid #1D4ED8',
  boxSizing: 'border-box',
};

const thRow1Style = { ...thBaseStyle, top: 0, height: 30 };
const thRow2Style = { ...thBaseStyle, top: 30, height: 46 };

const thLeftBase = { ...thBaseStyle, textAlign: 'left', minWidth: 100 };

const thLeftRow1 = { ...thLeftBase, top: 0, height: 30 };
const thLeftRow2 = { ...thLeftBase, top: 30, height: 46 };

const tdBaseStyle = {
  padding: '6px 8px',
  borderBottom: '1px solid #F1F5F9',
  borderRight: '1px solid #F1F5F9',
  color: '#1E293B',
  fontSize: 12,
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const tdLeftStyle = { ...tdBaseStyle, textAlign: 'left', fontWeight: 600 };

const tdTotalStyle = {
  ...tdBaseStyle,
  fontWeight: 800,
  background: '#EFF6FF',
  color: '#1D4ED8',
};

const sortableHeaderInner = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  cursor: 'pointer',
  userSelect: 'none',
};

const hoursBtnStyle = {
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 4,
  border: 'none',
  background: 'rgba(255,255,255,0.25)',
  color: '#FFFFFF',
  cursor: 'pointer',
  fontWeight: 700,
};

/* ===================== КОМПОНЕНТ ===================== */
export default function RemzoneWorkStatusPage() {
  const [mode, setMode] = useState('daily'); // 'daily' | 'hourly'
  const [hourlyDate, setHourlyDate] = useState(getTodayStr());
  const [sortDay, setSortDay] = useState(null); // 'YYYY-MM-DD'
  const [sortWeek, setSortWeek] = useState(null); // 'prev' | 'curr'

  // Период — 2 недели (пн прошлой → вс текущей), с навигацией
  const [periodStart, setPeriodStart] = useState(() => {
    const mondayThisWeek = getMonday(new Date());
    const mondayPrev = new Date(mondayThisWeek);
    mondayPrev.setDate(mondayPrev.getDate() - 7);
    return toLocalDateStr(mondayPrev);
  });

  const dateFrom = periodStart;
  const dateTo = useMemo(() => addDays(periodStart, 13), [periodStart]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Список дней
  const daysList = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) days.push(addDays(periodStart, i));
    return days;
  }, [periodStart]);

  const prevWeekDays = daysList.slice(0, 7);
  const currWeekDays = daysList.slice(7, 14);
  const prevWeekNum = prevWeekDays[0] ? getWeekNumber(new Date(prevWeekDays[0] + 'T12:00:00')) : 0;
  const currWeekNum = currWeekDays[0] ? getWeekNumber(new Date(currWeekDays[0] + 'T12:00:00')) : 0;

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    try {
      let url;
      if (mode === 'daily') {
        url = `${API_BASE}/api/remzone-work-status/daily?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      } else {
        url = `${API_BASE}/api/remzone-work-status/hourly?date=${hourlyDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();
      setRows(json.rows || []);
    } catch (err) {
      alert(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode, dateFrom, dateTo, hourlyDate]);

  // Фильтр по поиску
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.person_name || '').toLowerCase().includes(q) ||
      (r.person_account || '').toLowerCase().includes(q) ||
      (r.repair_account || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Сортировка
  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    if (mode === 'daily') {
      if (sortDay) {
        copy.sort((a, b) => (b.days?.[sortDay] || 0) - (a.days?.[sortDay] || 0));
      } else if (sortWeek) {
        const days = sortWeek === 'prev' ? prevWeekDays : currWeekDays;
        copy.sort((a, b) => {
          const sa = days.reduce((s, d) => s + (a.days?.[d] || 0), 0);
          const sb = days.reduce((s, d) => s + (b.days?.[d] || 0), 0);
          return sb - sa;
        });
      } else {
        copy.sort((a, b) => (b.total || 0) - (a.total || 0));
      }
    } else {
      copy.sort((a, b) => (b.total || 0) - (a.total || 0));
    }
    return copy;
  }, [filteredRows, mode, sortDay, sortWeek, prevWeekDays, currWeekDays]);

  // Экспорт
  const handleExport = () => {
    if (sortedRows.length === 0) return;
    let exportData;

    if (mode === 'daily') {
      exportData = sortedRows.map(r => {
        const obj = {
          'Акк. сотр.': r.person_account || r.repair_account || '',
          'Сотрудник': r.person_name || r.repair_person || '',
        };
        daysList.forEach(d => { obj[formatDateDDMM(d)] = r.days?.[d] || 0; });
        obj['Итого'] = r.total;
        return obj;
      });
    } else {
      exportData = sortedRows.map(r => {
        const obj = {
          'Акк. сотр.': r.person_account || r.repair_account || '',
          'Сотрудник': r.person_name || r.repair_person || '',
        };
        for (let h = 0; h < 24; h++) {
          const lbl = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
          obj[lbl] = r.hours?.[h] || 0;
        }
        obj['Итого'] = r.total;
        return obj;
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remzone');
    XLSX.writeFile(wb, `Remzone_${mode}_${toLocalDateStr(new Date())}.xlsx`);
  };

  const handleDayHeaderClick = (dateStr) => {
    setSortWeek(null);
    setSortDay(prev => (prev === dateStr ? null : dateStr));
  };

  const handleWeekHeaderClick = (week) => {
    setSortDay(null);
    setSortWeek(prev => (prev === week ? null : week));
  };

  const handleOpenHourly = (dateStr, e) => {
    e.stopPropagation();
    setHourlyDate(dateStr);
    setMode('hourly');
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Remzone Work Status</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={mainTabStyle(mode === 'daily')} onClick={() => setMode('daily')}>
            📅 По дням
          </button>
          <button style={mainTabStyle(mode === 'hourly')} onClick={() => setMode('hourly')}>
            🕐 По часам (за день)
          </button>
          <button
            style={{ ...mainTabStyle(false), background: '#059669', color: '#FFF' }}
            onClick={handleExport}
          >
            📊 Экспорт
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        {/* Фильтр-бар */}
        <div style={filterBarStyle}>
          {mode === 'daily' ? (
            <>
              <button style={navBtnStyle} onClick={() => setPeriodStart(addDays(periodStart, -14))}>
                ◀ 2 недели
              </button>
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>
                {formatDateDDMM(new Date(periodStart + 'T12:00:00'))} — {formatDateDDMM(new Date(dateTo + 'T12:00:00'))}
                <span style={{ marginLeft: 8, fontWeight: 400, color: '#64748B' }}>
                  (CW{prevWeekNum} – CW{currWeekNum})
                </span>
              </div>
              <button style={navBtnStyle} onClick={() => setPeriodStart(addDays(periodStart, 14))}>
                2 недели ▶
              </button>
              <button
                style={{ ...navBtnStyle, background: '#EFF6FF', borderColor: '#93C5FD', color: '#1D4ED8' }}
                onClick={() => {
                  const mondayThisWeek = getMonday(new Date());
                  const mondayPrev = new Date(mondayThisWeek);
                  mondayPrev.setDate(mondayPrev.getDate() - 7);
                  setPeriodStart(toLocalDateStr(mondayPrev));
                }}
              >
                Текущие 2 недели
              </button>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1E293B', marginRight: 4 }}>
                День:
              </span>
              {daysList.map(d => (
                <button
                  key={d}
                  onClick={() => setHourlyDate(d)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: `1px solid ${hourlyDate === d ? '#1D4ED8' : '#CBD5E1'}`,
                    background: hourlyDate === d ? '#2563EB' : '#FFFFFF',
                    color: hourlyDate === d ? '#FFFFFF' : '#334155',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title={d}
                >
                  {formatDateDDMM(new Date(d + 'T12:00:00'))} {getDayOfWeekShort(new Date(d + 'T12:00:00'))}
                </button>
              ))}
            </>
          )}

          <label style={{ ...filterLabelStyle, marginLeft: 'auto' }}>
            Поиск:
            <input
              type="text"
              placeholder="ФИО, аккаунт"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, minWidth: 180 }}
            />
          </label>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Сотрудников: <b>{sortedRows.length}</b>
          </div>
        </div>

        {/* Таблица */}
        <div style={tableWrapStyle}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Загрузка...</div>
          ) : sortedRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Нет данных</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                {mode === 'daily' ? (
                  <>
                    <tr>
                      <th style={{ ...thLeftRow1, borderRight: '1px solid #1D4ED8' }}></th>
                      <th style={{ ...thLeftRow1, borderRight: '1px solid #1D4ED8' }}></th>
                      <th
                        style={{ ...thRow1Style, background: sortWeek === 'prev' ? '#1D4ED8' : '#3B82F6', cursor: 'pointer' }}
                        colSpan={7}
                        onClick={() => handleWeekHeaderClick('prev')}
                        title="Сортировать по сумме недели"
                      >
                        CW{prevWeekNum} {sortWeek === 'prev' && '▼'}
                      </th>
                      <th
                        style={{ ...thRow1Style, background: sortWeek === 'curr' ? '#1D4ED8' : '#2563EB', cursor: 'pointer' }}
                        colSpan={7}
                        onClick={() => handleWeekHeaderClick('curr')}
                        title="Сортировать по сумме недели"
                      >
                        CW{currWeekNum} {sortWeek === 'curr' && '▼'}
                      </th>
                      <th style={{ ...thRow1Style, background: '#1D4ED8' }}></th>
                    </tr>
                    <tr>
                      <th style={thLeftRow2}>Акк. сотр. дораб.</th>
                      <th style={thLeftRow2}>Сотрудник дораб. в линии</th>
                      {prevWeekDays.map(d => {
                        const isSorted = sortDay === d;
                        return (
                          <th key={d} style={thRow2Style}>
                            <div style={sortableHeaderInner} onClick={() => handleDayHeaderClick(d)}>
                              <div style={{ fontWeight: 700, color: isSorted ? '#FDE047' : '#FFFFFF' }}>
                                {formatDateDDMM(new Date(d + 'T12:00:00'))} {isSorted && '▼'}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
                                {getDayOfWeekShort(new Date(d + 'T12:00:00'))}
                              </div>
                              <button
                                style={hoursBtnStyle}
                                onClick={(e) => handleOpenHourly(d, e)}
                                title="Показать по часам"
                              >
                                🕐
                              </button>
                            </div>
                          </th>
                        );
                      })}
                      {currWeekDays.map(d => {
                        const isSorted = sortDay === d;
                        return (
                          <th key={d} style={thRow2Style}>
                            <div style={sortableHeaderInner} onClick={() => handleDayHeaderClick(d)}>
                              <div style={{ fontWeight: 700, color: isSorted ? '#FDE047' : '#FFFFFF' }}>
                                {formatDateDDMM(new Date(d + 'T12:00:00'))} {isSorted && '▼'}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
                                {getDayOfWeekShort(new Date(d + 'T12:00:00'))}
                              </div>
                              <button
                                style={hoursBtnStyle}
                                onClick={(e) => handleOpenHourly(d, e)}
                                title="Показать по часам"
                              >
                                🕐
                              </button>
                            </div>
                          </th>
                        );
                      })}
                      <th style={{ ...thRow2Style, background: '#1D4ED8' }}>Итого</th>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <th style={thLeftRow1}>Акк. сотр. дораб.</th>
                    <th style={thLeftRow1}>Сотрудник дораб. в линии</th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} style={{ ...thRow1Style, padding: '6px 4px', minWidth: 34 }}>
                        {String(h).padStart(2, '0')}
                      </th>
                    ))}
                    <th style={{ ...thRow1Style, background: '#1D4ED8' }}>Итого</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => {
                  const account = row.person_account || row.repair_account || '—';
                  const name = row.person_name || row.repair_person || '—';
                  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

                  if (mode === 'daily') {
                    return (
                      <tr key={idx} style={{ backgroundColor: bg }}>
                        <td style={tdLeftStyle}>{account}</td>
                        <td style={tdLeftStyle}>{name}</td>
                        {daysList.map(d => {
                          const val = row.days?.[d] || 0;
                          return (
                            <td
                              key={d}
                              style={{
                                ...tdBaseStyle,
                                color: val > 0 ? '#1E293B' : '#CBD5E1',
                                fontWeight: val > 0 ? 600 : 400,
                              }}
                            >
                              {val > 0 ? val : '·'}
                            </td>
                          );
                        })}
                        <td style={tdTotalStyle}>{row.total || 0}</td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={idx} style={{ backgroundColor: bg }}>
                        <td style={tdLeftStyle}>{account}</td>
                        <td style={tdLeftStyle}>{name}</td>
                        {Array.from({ length: 24 }, (_, h) => {
                          const val = row.hours?.[h] || 0;
                          return (
                            <td
                              key={h}
                              style={{
                                ...tdBaseStyle,
                                padding: '6px 4px',
                                color: val > 0 ? '#1E293B' : '#CBD5E1',
                                fontWeight: val > 0 ? 600 : 400,
                                minWidth: 34,
                              }}
                            >
                              {val > 0 ? val : '·'}
                            </td>
                          );
                        })}
                        <td style={tdTotalStyle}>{row.total || 0}</td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}