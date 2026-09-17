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
function getTodayStr() { return toLocalDateStr(new Date()); }
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
  marginBottom: '14px',
  flexWrap: 'wrap',
  gap: 12,
  flexShrink: 0,
};

const titleStyle = {
  fontSize: '1.8rem',
  fontWeight: 900,
  color: '#0F172A',
  margin: 0,
  letterSpacing: '-0.02em',
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: 14,
  border: '1px solid #E2E8F0',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const inputStyle = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  fontSize: 13,
  background: '#FFFFFF',
  outline: 'none',
};

const mainTabStyle = (active) => ({
  padding: '9px 18px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  background: active ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#F1F5F9',
  color: active ? '#FFFFFF' : '#475569',
  transition: 'all 0.15s',
  boxShadow: active ? '0 4px 10px rgba(37,99,235,0.25)' : 'none',
});

const filterBarStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
  marginBottom: 10,
  padding: 10,
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

/* Цвета шапки */
const HEADER_GRAD_MAIN = 'linear-gradient(180deg,#1E3A8A 0%,#1E40AF 100%)';
const HEADER_GRAD_DAY  = 'linear-gradient(180deg,#2563EB 0%,#1D4ED8 100%)';
const HEADER_GRAD_CW   = 'linear-gradient(180deg,#6D28D9 0%,#7C3AED 100%)';
const HEADER_GRAD_TOT  = 'linear-gradient(180deg,#047857 0%,#10B981 100%)';

const thBaseStyle = {
  padding: '8px 6px',
  textAlign: 'center',
  fontWeight: 700,
  color: '#FFFFFF',
  fontSize: 11,
  position: 'sticky',
  top: 0,
  zIndex: 5,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  borderRight: '1px solid rgba(255,255,255,0.15)',
  borderBottom: '1px solid rgba(0,0,0,0.15)',
};

const thMainLeftStyle = {
  ...thBaseStyle,
  textAlign: 'left',
  background: HEADER_GRAD_MAIN,
  minWidth: 100,
  paddingLeft: 12,
};
const thHourStyle = {
  ...thBaseStyle,
  background: HEADER_GRAD_DAY,
  padding: '8px 3px',
  minWidth: 46,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '-0.02em',
};
const thDayStyle = {
  ...thBaseStyle,
  background: HEADER_GRAD_DAY,
  minWidth: 62,
  padding: '6px 4px',
};
const thCWStyle = {
  ...thBaseStyle,
  background: HEADER_GRAD_CW,
  minWidth: 62,
  padding: '6px 4px',
};
const thTotalStyle = {
  ...thBaseStyle,
  background: HEADER_GRAD_TOT,
  minWidth: 60,
  padding: '6px 8px',
};

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
const tdTotalCellStyle = {
  ...tdBaseStyle,
  fontWeight: 800,
  background: '#ECFDF5',
  color: '#047857',
};
const tdCWCellStyle = {
  ...tdBaseStyle,
  fontWeight: 700,
  background: '#F5F3FF',
  color: '#6D28D9',
};

const hoursBtnStyle = {
  fontSize: 10,
  padding: '2px 6px',
  marginTop: 3,
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.2)',
  color: '#FFFFFF',
  cursor: 'pointer',
  fontWeight: 700,
  lineHeight: 1,
};

const hourlyBtnActiveStyle = {
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid #1D4ED8',
  background: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
const hourlyBtnStyle = {
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#334155',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

/* ===================== КОМПОНЕНТ ===================== */
export default function RemzoneWorkStatusPage() {
  const [mode, setMode] = useState('daily');
  const [hourlyDate, setHourlyDate] = useState(getTodayStr());
  const [sortDay, setSortDay] = useState(null);
  const [sortWeek, setSortWeek] = useState(null);

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

  const daysList = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) days.push(addDays(periodStart, i));
    return days;
  }, [periodStart]);

  const prevWeekDays = daysList.slice(0, 7);
  const currWeekDays = daysList.slice(7, 14);
  const prevWeekNum = prevWeekDays[0] ? getWeekNumber(new Date(prevWeekDays[0] + 'T12:00:00')) : 0;
  const currWeekNum = currWeekDays[0] ? getWeekNumber(new Date(currWeekDays[0] + 'T12:00:00')) : 0;

  /* ================ ЗАГРУЗКА ================ */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const url = mode === 'daily'
          ? `${API_BASE}/api/remzone-work-status/daily?dateFrom=${dateFrom}&dateTo=${dateTo}`
          : `${API_BASE}/api/remzone-work-status/hourly?date=${hourlyDate}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const json = await res.json();
        if (!cancelled) setRows(json.rows || []);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [mode, dateFrom, dateTo, hourlyDate]);

  /* ================ ФИЛЬТР + СОРТИРОВКА ================ */
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.person_name || '').toLowerCase().includes(q) ||
      (r.person_account || '').toLowerCase().includes(q) ||
      (r.repair_account || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

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

  /* ================ ЭКСПОРТ ================ */
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

  /* ================ РЕНДЕР ================ */
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Remzone Work Status</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={mainTabStyle(mode === 'daily')} onClick={() => setMode('daily')}>📅 По дням</button>
          <button style={mainTabStyle(mode === 'hourly')} onClick={() => setMode('hourly')}>🕐 По часам (за день)</button>
          <button style={{ ...mainTabStyle(false), background: 'linear-gradient(135deg,#059669,#10B981)', color: '#FFF' }} onClick={handleExport}>📊 Экспорт</button>
        </div>
      </div>

      <div style={cardStyle}>
        {/* Фильтр-бар */}
        <div style={filterBarStyle}>
          {mode === 'daily' ? (
            <>
              <button style={navBtnStyle} onClick={() => setPeriodStart(addDays(periodStart, -14))}>◀ 2 недели</button>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>
                {formatDateDDMM(new Date(periodStart + 'T12:00:00'))} — {formatDateDDMM(new Date(dateTo + 'T12:00:00'))}
                <span style={{ marginLeft: 8, fontWeight: 500, color: '#64748B' }}>(CW{prevWeekNum} – CW{currWeekNum})</span>
              </div>
              <button style={navBtnStyle} onClick={() => setPeriodStart(addDays(periodStart, 14))}>2 недели ▶</button>
              <button
                style={{ ...navBtnStyle, background: '#EFF6FF', borderColor: '#93C5FD', color: '#1D4ED8' }}
                onClick={() => {
                  const mondayThisWeek = getMonday(new Date());
                  const mondayPrev = new Date(mondayThisWeek);
                  mondayPrev.setDate(mondayPrev.getDate() - 7);
                  setPeriodStart(toLocalDateStr(mondayPrev));
                }}
              >Текущие 2 недели</button>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginRight: 4 }}>День:</span>
              {daysList.map(d => (
                <button
                  key={d}
                  onClick={() => setHourlyDate(d)}
                  style={hourlyDate === d ? hourlyBtnActiveStyle : hourlyBtnStyle}
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
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Нет данных за выбранный период</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                {mode === 'daily' ? (
                  <tr>
                    <th style={{ ...thMainLeftStyle, minWidth: 90 }}>Акк. сотр. дораб.</th>
                    <th style={{ ...thMainLeftStyle, minWidth: 150 }}>Сотрудник дораб. в линии</th>

                    {prevWeekDays.map(d => {
                      const isSorted = sortDay === d;
                      return (
                        <th key={d} style={thDayStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                color: isSorted ? '#FDE047' : '#FFFFFF',
                                fontWeight: 700,
                              }}
                              onClick={() => handleDayHeaderClick(d)}
                              title="Сортировать по этому дню"
                            >
                              {formatDateDDMM(new Date(d + 'T12:00:00'))} {isSorted && '▼'}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
                              {getDayOfWeekShort(new Date(d + 'T12:00:00'))}
                            </div>
                            <button
                              style={hoursBtnStyle}
                              onClick={(e) => handleOpenHourly(d, e)}
                              title="Показать по часам"
                            >🕐</button>
                          </div>
                        </th>
                      );
                    })}

                    <th
                      style={{ ...thCWStyle, cursor: 'pointer', background: sortWeek === 'prev' ? 'linear-gradient(180deg,#4C1D95,#5B21B6)' : HEADER_GRAD_CW }}
                      onClick={() => handleWeekHeaderClick('prev')}
                      title="Сортировать по сумме недели"
                    >
                      CW{prevWeekNum} {sortWeek === 'prev' && '▼'}
                    </th>

                    {currWeekDays.map(d => {
                      const isSorted = sortDay === d;
                      return (
                        <th key={d} style={thDayStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                color: isSorted ? '#FDE047' : '#FFFFFF',
                                fontWeight: 700,
                              }}
                              onClick={() => handleDayHeaderClick(d)}
                              title="Сортировать по этому дню"
                            >
                              {formatDateDDMM(new Date(d + 'T12:00:00'))} {isSorted && '▼'}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
                              {getDayOfWeekShort(new Date(d + 'T12:00:00'))}
                            </div>
                            <button
                              style={hoursBtnStyle}
                              onClick={(e) => handleOpenHourly(d, e)}
                              title="Показать по часам"
                            >🕐</button>
                          </div>
                        </th>
                      );
                    })}

                    <th
                      style={{ ...thCWStyle, cursor: 'pointer', background: sortWeek === 'curr' ? 'linear-gradient(180deg,#4C1D95,#5B21B6)' : HEADER_GRAD_CW }}
                      onClick={() => handleWeekHeaderClick('curr')}
                      title="Сортировать по сумме недели"
                    >
                      CW{currWeekNum} {sortWeek === 'curr' && '▼'}
                    </th>

                    <th style={thTotalStyle}>Итого</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={thMainLeftStyle}>Акк. сотр. дораб.</th>
                    <th style={thMainLeftStyle}>Сотрудник дораб. в линии</th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} style={thHourStyle}>
                        {String(h).padStart(2, '0')}:00-{String(h + 1).padStart(2, '0')}:00
                      </th>
                    ))}
                    <th style={thTotalStyle}>Итого</th>
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

                        {prevWeekDays.map(d => {
                          const val = row.days?.[d] || 0;
                          return (
                            <td key={d} style={{ ...tdBaseStyle, color: val > 0 ? '#1E293B' : '#CBD5E1', fontWeight: val > 0 ? 600 : 400 }}>
                              {val > 0 ? val : '·'}
                            </td>
                          );
                        })}

                        <td style={tdCWCellStyle}>
                          {prevWeekDays.reduce((s, d) => s + (row.days?.[d] || 0), 0) || '·'}
                        </td>

                        {currWeekDays.map(d => {
                          const val = row.days?.[d] || 0;
                          return (
                            <td key={d} style={{ ...tdBaseStyle, color: val > 0 ? '#1E293B' : '#CBD5E1', fontWeight: val > 0 ? 600 : 400 }}>
                              {val > 0 ? val : '·'}
                            </td>
                          );
                        })}

                        <td style={tdCWCellStyle}>
                          {currWeekDays.reduce((s, d) => s + (row.days?.[d] || 0), 0) || '·'}
                        </td>

                        <td style={tdTotalCellStyle}>{row.total || 0}</td>
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
                                padding: '6px 3px',
                                color: val > 0 ? '#1E293B' : '#CBD5E1',
                                fontWeight: val > 0 ? 600 : 400,
                                minWidth: 46,
                              }}
                            >
                              {val > 0 ? val : '·'}
                            </td>
                          );
                        })}
                        <td style={tdTotalCellStyle}>{row.total || 0}</td>
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