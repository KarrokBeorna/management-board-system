import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '';
const PIE_COLORS = ['#10B981', '#EF4444'];
const MARK_KEY = 'drr_shift_marks';

/* ===================== СТИЛИ ===================== */
const containerStyle = {
  padding: '20px',
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  width: '100%',
  minHeight: '100vh',
  boxSizing: 'border-box',
  backgroundColor: '#F8FAFC',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px',
  flexShrink: 0,
  flexWrap: 'wrap',
  gap: '12px',
};

const titleStyle = {
  fontSize: '2.2rem',
  fontWeight: 900,
  color: '#1E293B',
  margin: 0,
};

const inputStyle = {
  padding: '10px 16px',
  borderRadius: '10px',
  border: '1px solid #E2E8F0',
  fontSize: '1rem',
  background: '#FFFFFF',
  color: '#1E293B',
  cursor: 'pointer',
  outline: 'none',
};

const twoColStyle = {
  display: 'flex',
  gap: '16px',
  flex: 1,
  alignItems: 'flex-start',
};

const columnStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minWidth: 0,
};

const columnHeaderStyle = (color) => ({
  background: color,
  color: '#FFFFFF',
  padding: '12px 20px',
  borderRadius: '12px',
  fontWeight: 900,
  fontSize: '1.4rem',
  textAlign: 'center',
  letterSpacing: '1px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
});

const reportBlockStyle = {
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '16px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  border: '1px solid #F1F5F9',
};

const reportTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: 800,
  color: '#1E293B',
  marginBottom: '10px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const thStyleSmall = {
  padding: '6px 10px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#475569',
  background: '#F8FAFC',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  borderBottom: '2px solid #E2E8F0',
  position: 'sticky',
  top: 0,
  zIndex: 5,
};

const tdStyleSmall = {
  padding: '6px 10px',
  borderBottom: '1px solid #F1F5F9',
  color: '#1E293B',
  fontSize: '0.85rem',
};

/* ===================== ХЕЛПЕРЫ ===================== */
const toLocalDateStr = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMoscowTime = () => new Date(Date.now() + 3 * 60 * 60 * 1000);

const todayMoscowStr = () => toLocalDateStr(getMoscowTime());

const nowMoscowStr = () => {
  const d = getMoscowTime();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
};

const getISOWeek = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00Z');
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
};

const getShiftRange = (dateStr, shiftType) => {
  if (shiftType === 'day') return { start: `${dateStr} 07:50:00`, end: `${dateStr} 16:40:00` };
  if (shiftType === 'night') return { start: `${dateStr} 01:31:00`, end: `${dateStr} 07:50:00` };
  if (shiftType === 'evening') {
    const next = new Date(dateStr + 'T12:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
    return { start: `${dateStr} 16:41:00`, end: `${nextStr} 01:30:00` };
  }
  return null;
};

// Определение A/B для даты. Чётная неделя: A=вечер, B=день. Нечётная: A=день, B=вечер.
const getShiftsForDate = (dateStr) => {
  const weekNum = getISOWeek(dateStr);
  const isEven = weekNum % 2 === 0;
  const aType = isEven ? 'evening' : 'day';
  const bType = isEven ? 'day' : 'evening';
  return {
    weekNumber: weekNum,
    a: { letter: 'A', type: aType, ...getShiftRange(dateStr, aType) },
    b: { letter: 'B', type: bType, ...getShiftRange(dateStr, bType) },
  };
};

const normalizeReport = (reportName, dash) => {
  if (!dash) return { drrPercent: 0, okVins: 0, nokVins: 0, totalVins: 0 };
  if (reportName === 'cpfinal') {
    return {
      drrPercent: dash.drrPercent || 0,
      okVins: dash.okVins || 0,
      nokVins: dash.nokVins || 0,
      totalVins: dash.totalVins || 0,
    };
  }
  return {
    drrPercent: dash.drrPercent || 0,
    okVins: dash.closedVins || 0,
    nokVins: dash.nokVins || ((dash.totalVins || 0) - (dash.closedVins || 0)),
    totalVins: dash.totalVins || 0,
  };
};

const loadAllReports = async (start, end) => {
  const params = new URLSearchParams({ startTime: start, endTime: end });
  const [cp7, cp7top, adas, adasTop, cpfinal, cpfinalTop] = await Promise.all([
    fetch(`${API_BASE}/api/drr-cp7-dashboard?${params}`).then(r => r.json()),
    fetch(`${API_BASE}/api/drr-cp7-top-defects?${params}`).then(r => r.json()),
    fetch(`${API_BASE}/api/drr-tl-dashboard?${params}`).then(r => r.json()),
    fetch(`${API_BASE}/api/drr-tl-top-defects?${params}`).then(r => r.json()),
    fetch(`${API_BASE}/api/drr-cpfinal-dashboard?${params}`).then(r => r.json()),
    fetch(`${API_BASE}/api/drr-cpfinal-top-defects?${params}`).then(r => r.json()),
  ]);
  return {
    cp7: { dash: normalizeReport('cp7', cp7), top: Array.isArray(cp7top) ? cp7top.slice(0, 10) : [] },
    adas: { dash: normalizeReport('adas', adas), top: Array.isArray(adasTop) ? adasTop.slice(0, 10) : [] },
    cpfinal: { dash: normalizeReport('cpfinal', cpfinal), top: Array.isArray(cpfinalTop) ? cpfinalTop.slice(0, 10) : [] },
  };
};

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
};

/* ===================== КОМПОНЕНТЫ ===================== */

function PieBlock({ drrPercent, okVins, totalVins }) {
  const data = [
    { name: 'DRR', value: drrPercent },
    { name: 'NOK', value: Math.max(0, 100 - drrPercent) },
  ];
  return (
    <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="98%"
            paddingAngle={3}
            stroke="#FFFFFF"
            strokeWidth={3}
          >
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ fontSize: '1rem' }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
          {drrPercent.toFixed(1)}%
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 4 }}>
          {okVins}/{totalVins}
        </div>
      </div>
    </div>
  );
}

function DefectsTable({ topDefects, markKeyPrefix, marks, onToggleMark }) {
  if (!topDefects || topDefects.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '0.85rem' }}>
        Нет дефектов
      </p>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyleSmall}>MPP</th>
          <th style={{ ...thStyleSmall, textAlign: 'center', width: 70 }}>Кол-во</th>
        </tr>
      </thead>
      <tbody>
        {topDefects.map((d, i) => {
          const key = `${markKeyPrefix}_${d.mpp}`;
          const marked = !!marks[key];
          return (
            <tr
              key={i}
              onClick={() => onToggleMark(key)}
              style={{
                cursor: 'pointer',
                backgroundColor: marked ? '#FEF3C7' : (i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'),
                transition: 'background-color 0.15s',
              }}
              title="Нажмите, чтобы выделить/снять выделение"
            >
              <td style={tdStyleSmall}>{d.mpp}</td>
              <td style={{ ...tdStyleSmall, textAlign: 'center', fontWeight: 700, color: i < 3 ? '#DC2626' : '#1E293B' }}>
                {d.defectCount}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReportBlock({ title, reportName, blockData, markKeyPrefix, marks, onToggleMark, emptyMessage }) {
  const isEmpty = !blockData || blockData.dash.totalVins === 0;

  if (isEmpty) {
    return (
      <div style={reportBlockStyle}>
        <div style={reportTitleStyle}>{title}</div>
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
          {emptyMessage || 'Нет данных'}
        </div>
      </div>
    );
  }

  return (
    <div style={reportBlockStyle}>
      <div style={reportTitleStyle}>
        <span>{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <PieBlock
          drrPercent={blockData.dash.drrPercent}
          okVins={blockData.dash.okVins}
          totalVins={blockData.dash.totalVins}
        />
        <div style={{ flex: 1, maxHeight: 170, overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: 8 }}>
          <DefectsTable
            topDefects={blockData.top}
            markKeyPrefix={markKeyPrefix}
            marks={marks}
            onToggleMark={onToggleMark}
          />
        </div>
      </div>
    </div>
  );
}

function ShiftColumn({ shiftInfo, columnLabel, color, marks, onToggleMark }) {
  const isEmptyColumn = !shiftInfo || !shiftInfo.started || !shiftInfo.data;

  return (
    <div style={columnStyle}>
      <div style={columnHeaderStyle(color)}>{columnLabel}</div>

      {isEmptyColumn ? (
        <div style={{ ...reportBlockStyle, padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
          Нет данных — смена ещё не началась
        </div>
      ) : (
        <>
          <ReportBlock
            title="DRR CP7"
            reportName="cp7"
            blockData={shiftInfo.data.cp7}
            markKeyPrefix={`${shiftInfo.letter || columnLabel}_cp7`}
            marks={marks}
            onToggleMark={onToggleMark}
          />
          <ReportBlock
            title="DRR ADAS"
            reportName="adas"
            blockData={shiftInfo.data.adas}
            markKeyPrefix={`${shiftInfo.letter || columnLabel}_adas`}
            marks={marks}
            onToggleMark={onToggleMark}
          />
          <ReportBlock
            title="DRR CPFinal"
            reportName="cpfinal"
            blockData={shiftInfo.data.cpfinal}
            markKeyPrefix={`${shiftInfo.letter || columnLabel}_cpfinal`}
            marks={marks}
            onToggleMark={onToggleMark}
          />
        </>
      )}
    </div>
  );
}

/* ===================== ГЛАВНЫЙ КОМПОНЕНТ ===================== */
export default function DrrShiftDashboardPage() {
  const [periodMode, setPeriodMode] = useState('live'); // 'live' | 'archive'
  const [selectedDate, setSelectedDate] = useState(todayMoscowStr());
  const [viewType, setViewType] = useState('shifts'); // 'shifts' | 'all'

  const [shiftData, setShiftData] = useState({ a: null, b: null });
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [marks, setMarks] = useState({});

  // Маркировка: хранение с привязкой к текущей дате
  useEffect(() => {
    const today = todayMoscowStr();
    const stored = localStorage.getItem(MARK_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.date === today && parsed.marks) {
          setMarks(parsed.marks);
        } else {
          localStorage.removeItem(MARK_KEY);
        }
      } catch {
        localStorage.removeItem(MARK_KEY);
      }
    }
  }, []);

  // Сохраняем при изменении
  useEffect(() => {
    const today = todayMoscowStr();
    // сохраняем только если что-то отмечено, иначе чистим
    if (Object.keys(marks).length > 0) {
      localStorage.setItem(MARK_KEY, JSON.stringify({ date: today, marks }));
    } else {
      localStorage.removeItem(MARK_KEY);
    }
  }, [marks]);

  const onToggleMark = (key) => {
    setMarks(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  // Загрузка
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseDate = periodMode === 'live' ? todayMoscowStr() : selectedDate;

      if (viewType === 'all') {
        const start = `${baseDate} 00:00:00`;
        const end = `${baseDate} 23:59:59`;
        const data = await loadAllReports(start, end);
        setAllData({ date: baseDate, ...data });
      } else {
        const shifts = getShiftsForDate(baseDate);
        let aStarted = true, bStarted = true;

        if (periodMode === 'live') {
          const now = nowMoscowStr();
          aStarted = now >= shifts.a.start;
          bStarted = now >= shifts.b.start;
        }

        const [aData, bData] = await Promise.all([
          aStarted ? loadAllReports(shifts.a.start, shifts.a.end) : Promise.resolve(null),
          bStarted ? loadAllReports(shifts.b.start, shifts.b.end) : Promise.resolve(null),
        ]);

        setShiftData({
          a: { ...shifts.a, started: aStarted, data: aData },
          b: { ...shifts.b, started: bStarted, data: bData },
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodMode, selectedDate, viewType]);

  // Автообновление в Live (каждые 60 секунд)
  useEffect(() => {
    if (periodMode !== 'live') return;
    const id = setInterval(loadData, 60000);
    return () => clearInterval(id);
  }, [periodMode, viewType]);

  // Опции для дат (14 дней)
  const dateOptions = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(getMoscowTime());
    d.setUTCDate(d.getUTCDate() - i);
    dateOptions.push(toLocalDateStr(d));
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>DRR Shift Dashboard</h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={periodMode}
            onChange={(e) => setPeriodMode(e.target.value)}
            style={inputStyle}
          >
            <option value="live">Live (текущие сутки)</option>
            <option value="archive">Архив (по датам)</option>
          </select>

          {periodMode === 'archive' && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={inputStyle}
            >
              {dateOptions.map(d => (
                <option key={d} value={d}>{formatDateShort(d)}</option>
              ))}
            </select>
          )}

          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            style={inputStyle}
          >
            <option value="shifts">Смены A / B</option>
            <option value="all">Сутки</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '1.5rem', textAlign: 'center', padding: '60px', color: '#64748B' }}>
          Загрузка данных...
        </div>
      ) : error ? (
        <div style={{ fontSize: '1.5rem', textAlign: 'center', padding: '60px', color: '#DC2626' }}>
          ❌ {error}
        </div>
      ) : viewType === 'all' ? (
        /* ---- РЕЖИМ СУТОК: одна колонка ---- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allData && (
            <>
              <ReportBlock
                title="DRR CP7"
                reportName="cp7"
                blockData={allData.cp7}
                markKeyPrefix="ALL_cp7"
                marks={marks}
                onToggleMark={onToggleMark}
              />
              <ReportBlock
                title="DRR ADAS"
                reportName="adas"
                blockData={allData.adas}
                markKeyPrefix="ALL_adas"
                marks={marks}
                onToggleMark={onToggleMark}
              />
              <ReportBlock
                title="DRR CPFinal"
                reportName="cpfinal"
                blockData={allData.cpfinal}
                markKeyPrefix="ALL_cpfinal"
                marks={marks}
                onToggleMark={onToggleMark}
              />
            </>
          )}
        </div>
      ) : (
        /* ---- РЕЖИМ СМЕН: две колонки ---- */
        <div style={twoColStyle}>
          <ShiftColumn
            shiftInfo={shiftData.a}
            columnLabel="СМЕНА A"
            color="#2563EB"
            marks={marks}
            onToggleMark={onToggleMark}
          />
          <ShiftColumn
            shiftInfo={shiftData.b}
            columnLabel="СМЕНА B"
            color="#F59E0B"
            marks={marks}
            onToggleMark={onToggleMark}
          />
        </div>
      )}
    </div>
  );
}