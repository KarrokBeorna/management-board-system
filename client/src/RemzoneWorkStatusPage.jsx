import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = '';

/* ===================== ХЕЛПЕРЫ ДЛЯ ДАТ ===================== */
function toLocalDateStr(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

/* ===================== СТИЛИ ===================== */
const containerStyle = {
  padding: '24px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  width: '100%',
  height: '100vh',
  boxSizing: 'border-box',
  backgroundColor: '#F8FAFC',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px',
  flexWrap: 'wrap',
  gap: 12,
  flexShrink: 0,
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: 900,
  color: '#1E293B',
  margin: 0,
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
  border: '1px solid #E2E8F0',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
};

const tabButtonStyle = (active) => ({
  padding: '10px 22px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  background: active ? '#2563EB' : '#E5E7EB',
  color: active ? '#FFFFFF' : '#374151',
  transition: 'all 0.2s',
});

const filterBarStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
  marginBottom: 16,
  padding: 14,
  backgroundColor: '#F1F5F9',
  borderRadius: 12,
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

const tableWrapStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
};

const thStyle = {
  padding: '10px 12px',
  textAlign: 'center',
  fontWeight: 700,
  color: '#FFFFFF',
  background: '#2563EB',
  fontSize: 12,
  position: 'sticky',
  top: 0,
  zIndex: 5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid #1D4ED8',
};

const thLeftStyle = {
  ...thStyle,
  textAlign: 'left',
  minWidth: 120,
};

const tdStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #F1F5F9',
  borderRight: '1px solid #F1F5F9',
  color: '#1E293B',
  fontSize: 13,
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const tdLeftStyle = {
  ...tdStyle,
  textAlign: 'left',
  fontWeight: 600,
};

const tdTotalStyle = {
  ...tdStyle,
  fontWeight: 800,
  background: '#EFF6FF',
  color: '#1D4ED8',
};

/* ===================== КОМПОНЕНТ ===================== */
export default function RemzoneWorkStatusPage() {
  const [mode, setMode] = useState('daily'); // 'daily' | 'hourly'

  // Для daily — период 2 недели
  const [dateFrom, setDateFrom] = useState(() => {
    const mondayThisWeek = getMonday(new Date());
    const mondayPrevWeek = new Date(mondayThisWeek);
    mondayPrevWeek.setDate(mondayPrevWeek.getDate() - 7);
    return toLocalDateStr(mondayPrevWeek);
  });
  const [dateTo, setDateTo] = useState(() => {
    const mondayThisWeek = getMonday(new Date());
    const sundayThisWeek = new Date(mondayThisWeek);
    sundayThisWeek.setDate(sundayThisWeek.getDate() + 6);
    return toLocalDateStr(sundayThisWeek);
  });

  // Для hourly — конкретный день
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      let url;
      if (mode === 'daily') {
        url = `${API_BASE}/api/remzone-work-status/daily?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      } else {
        url = `${API_BASE}/api/remzone-work-status/hourly?date=${selectedDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
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
  }, [mode, dateFrom, dateTo, selectedDate]);

  // Список дней для daily режима (2 недели)
  const daysList = useMemo(() => {
    if (mode !== 'daily') return [];
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [mode, dateFrom, dateTo]);

  // Разбивка дней на 2 недели
  const { prevWeekDays, currWeekDays, prevWeekNum, currWeekNum } = useMemo(() => {
    if (mode !== 'daily') return { prevWeekDays: [], currWeekDays: [], prevWeekNum: 0, currWeekNum: 0 };
    const prev = daysList.slice(0, 7);
    const curr = daysList.slice(7, 14);
    return {
      prevWeekDays: prev,
      currWeekDays: curr,
      prevWeekNum: prev[0] ? getWeekNumber(prev[0]) : 0,
      currWeekNum: curr[0] ? getWeekNumber(curr[0]) : 0,
    };
  }, [daysList, mode]);

  // Фильтрация по поиску
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (r.person_name || '').toLowerCase().includes(q) ||
      (r.person_account || '').toLowerCase().includes(q) ||
      (r.repair_account || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Экспорт в Excel
  const handleExport = () => {
    if (filteredRows.length === 0) return;

    let exportData;
    if (mode === 'daily') {
      exportData = filteredRows.map(r => {
        const row = {
          'Акк. сотр.': r.person_account || r.repair_account || '',
          'Сотрудник': r.person_name || r.repair_person || '',
        };
        daysList.forEach(d => {
          const ds = toLocalDateStr(d);
          row[formatDateDDMM(d)] = r.days?.[ds] || 0;
        });
        row['Итого'] = r.total;
        return row;
      });
    } else {
      exportData = filteredRows.map(r => {
        const row = {
          'Акк. сотр.': r.person_account || r.repair_account || '',
          'Сотрудник': r.person_name || r.repair_person || '',
        };
        for (let h = 0; h < 24; h++) {
          const label = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
          row[label] = r.hours?.[h] || 0;
        }
        row['Итого'] = r.total;
        return row;
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remzone');
    XLSX.writeFile(wb, `Remzone_Work_Status_${mode}_${getTodayStr()}.xlsx`);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Remzone Work Status</h1>

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tabButtonStyle(mode === 'daily')} onClick={() => setMode('daily')}>
            📅 По дням (2 недели)
          </button>
          <button style={tabButtonStyle(mode === 'hourly')} onClick={() => setMode('hourly')}>
            🕐 По часам (за день)
          </button>
          <button
            style={{ ...tabButtonStyle(false), background: '#059669', color: '#FFF' }}
            onClick={handleExport}
          >
            📊 Экспорт
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={filterBarStyle}>
          {mode === 'daily' ? (
            <>
              <label style={filterLabelStyle}>
                Начало:
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
              </label>
              <label style={filterLabelStyle}>
                Конец:
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
              </label>
            </>
          ) : (
            <label style={filterLabelStyle}>
              Дата:
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={inputStyle} />
            </label>
          )}

          <label style={filterLabelStyle}>
            Поиск:
            <input
              type="text"
              placeholder="ФИО, аккаунт"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, minWidth: 200 }}
            />
          </label>

          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#64748B' }}>
            Всего сотрудников: <b>{filteredRows.length}</b>
          </div>
        </div>

        <div style={tableWrapStyle}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Загрузка...</div>
          ) : filteredRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Нет данных</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {mode === 'daily' ? (
                  <tr>
                    <th style={thLeftStyle} rowSpan={2}>Акк. сотр. дораб.</th>
                    <th style={thLeftStyle} rowSpan={2}>Сотрудник дораб. в линии</th>
                    <th style={{ ...thStyle, background: '#3B82F6' }} colSpan={7}>CW{prevWeekNum}</th>
                    <th style={{ ...thStyle, background: '#2563EB' }} colSpan={7}>CW{currWeekNum}</th>
                    <th style={{ ...thStyle, background: '#1D4ED8' }} rowSpan={2}>Итого</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={thLeftStyle}>Акк. сотр. дораб.</th>
                    <th style={thLeftStyle}>Сотрудник дораб. в линии</th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} style={thStyle}>
                        {String(h).padStart(2, '0')}:00-{String(h + 1).padStart(2, '0')}:00
                      </th>
                    ))}
                    <th style={{ ...thStyle, background: '#1D4ED8' }}>Итого</th>
                  </tr>
                )}
                {mode === 'daily' && (
                  <tr>
                    {prevWeekDays.map((d, i) => (
                      <th key={`ph${i}`} style={thStyle}>
                        <div>{formatDateDDMM(d)}</div>
                        <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>{getDayOfWeekShort(d)}</div>
                      </th>
                    ))}
                    {currWeekDays.map((d, i) => (
                      <th key={`ch${i}`} style={thStyle}>
                        <div>{formatDateDDMM(d)}</div>
                        <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>{getDayOfWeekShort(d)}</div>
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const account = row.person_account || row.repair_account || '—';
                  const name = row.person_name || row.repair_person || '—';
                  const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

                  if (mode === 'daily') {
                    return (
                      <tr key={idx} style={{ backgroundColor: bg }}>
                        <td style={tdLeftStyle}>{account}</td>
                        <td style={tdLeftStyle}>{name}</td>
                        {daysList.map((d, i) => {
                          const ds = toLocalDateStr(d);
                          const val = row.days?.[ds] || 0;
                          return (
                            <td key={i} style={{ ...tdStyle, color: val > 0 ? '#1E293B' : '#CBD5E1', fontWeight: val > 0 ? 600 : 400 }}>
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
                            <td key={h} style={{ ...tdStyle, color: val > 0 ? '#1E293B' : '#CBD5E1', fontWeight: val > 0 ? 600 : 400 }}>
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