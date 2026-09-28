import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '';

/* ===================== СТИЛИ ===================== */
const containerStyle = {
  padding: '20px',
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
  flexShrink: 0,
};

const titleStyle = {
  fontSize: '2.5rem',
  fontWeight: 900,
  color: '#1E293B',
  margin: 0,
};

const filterGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const timeFilterButtonStyle = (active, activeColor) => ({
  padding: '12px 24px',
  borderRadius: '12px',
  border: 'none',
  fontWeight: 700,
  fontSize: '1.4rem',
  background: active ? activeColor : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.2s',
});

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  gap: '20px',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: 4,
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
  border: '1px solid #F1F5F9',
  minHeight: 0,
};

const cardTitleStyle = {
  fontSize: '1.6rem',
  fontWeight: 800,
  color: '#1E293B',
  margin: '0 0 12px 0',
};

const centerLabelStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  pointerEvents: 'none',
};

const tableWrapperStyle = {
  flex: 1,
  minHeight: 160,
  maxHeight: 320,
  overflowY: 'auto',
  marginTop: 14,
  border: '1px solid #E2E8F0',
  borderRadius: 12,
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

const th2 = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#475569',
  background: '#F8FAFC',
  borderBottom: '2px solid #E2E8F0',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  textTransform: 'uppercase',
};

const td2 = {
  padding: '8px 12px',
  fontSize: '0.9rem',
  color: '#1E293B',
  borderBottom: '1px solid #F1F5F9',
};

const emptyStyle = {
  textAlign: 'center',
  padding: 24,
  color: '#94A3B8',
  fontSize: '0.95rem',
};

/* ===================== КОНФИГ ВСЕХ DRR ===================== */
const DRR_CONFIGS = [
  {
    key: 'cp5',
    title: 'DRR CP5',
    dashboardUrl: '/api/drr-cp5-dashboard',
    vinsUrl: '/api/drr-cp5-vins',
    extra: { filter: 'all' },
  },
  {
    key: 'cp6',
    title: 'DRR CP6',
    dashboardUrl: '/api/drr-cp6-dashboard',
    vinsUrl: '/api/drr-cp6-vins',
    extra: {},
  },
  {
    key: 'pip',
    title: 'DRR PIP',
    dashboardUrl: '/api/drr-pip-dashboard',
    vinsUrl: '/api/drr-pip-vins',
    extra: {},
  },
  {
    key: 'cp7',
    title: 'DRR CP7',
    dashboardUrl: '/api/drr-cp7-dashboard',
    vinsUrl: '/api/drr-cp7-vins',
    extra: { filter: 'all' },
  },
  {
    key: 'adas',
    title: 'DRR ADAS',
    dashboardUrl: '/api/drr-tl-dashboard',
    vinsUrl: '/api/drr-tl-vins',
    extra: {},
  },
  {
    key: 'cpfinal',
    title: 'DRR CPFinal',
    dashboardUrl: '/api/drr-cpfinal-dashboard',
    vinsUrl: '/api/drr-cpfinal-vins',
    extra: {},
  },
];

/* ===================== ХЕЛПЕРЫ ВРЕМЕНИ ===================== */
const getMoscowTime = () => new Date(Date.now() + 3 * 60 * 60 * 1000);
const getMoscowMinutes = () => {
  const moscow = getMoscowTime();
  return moscow.getUTCHours() * 60 + moscow.getUTCMinutes();
};

const getDefaultTimeFilter = () => {
  const t = getMoscowMinutes();
  if (t >= 1 * 60 + 31 && t < 7 * 60 + 50) return 'night';
  if (t >= 7 * 60 + 50 && t < 16 * 60 + 41) return 'day';
  return 'evening';
};

const getTimeRange = (timeFilter) => {
  const nowMoscow = getMoscowTime();
  const y = nowMoscow.getUTCFullYear();
  const m = String(nowMoscow.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nowMoscow.getUTCDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const yesterday = new Date(nowMoscow);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;

  const t = getMoscowMinutes();

  if (timeFilter === 'all') return { start: `${todayStr} 00:00:00`, end: `${todayStr} 23:59:59` };
  if (timeFilter === 'day') {
    const dateToUse = t >= 7 * 60 + 50 ? todayStr : yesterdayStr;
    return { start: `${dateToUse} 07:50:00`, end: `${dateToUse} 16:40:00` };
  }
  if (timeFilter === 'evening') {
    const dateToUse = t >= 16 * 60 + 41 ? todayStr : yesterdayStr;
    const startDateObj = new Date(`${dateToUse}T00:00:00Z`);
    const endDateObj = new Date(startDateObj);
    endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
    const endStr = `${endDateObj.getUTCFullYear()}-${String(endDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(endDateObj.getUTCDate()).padStart(2, '0')}`;
    return { start: `${dateToUse} 16:41:00`, end: `${endStr} 01:30:00` };
  }
  if (timeFilter === 'night') {
    const dateToUse = t >= 1 * 60 + 31 ? todayStr : yesterdayStr;
    return { start: `${dateToUse} 01:31:00`, end: `${dateToUse} 07:50:00` };
  }
  return { start: `${todayStr} 00:00:00`, end: `${todayStr} 23:59:59` };
};

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getCurrentShiftInfo = () => {
  const nowMoscow = getMoscowTime();
  const t = getMoscowMinutes();
  let shiftDate = new Date(nowMoscow);
  let shiftType = 'night';

  if (t >= 7 * 60 + 50 && t <= 16 * 60 + 40) shiftType = 'day';
  else if (t >= 16 * 60 + 41 || t <= 1 * 60 + 30) {
    shiftType = 'evening';
    if (t <= 1 * 60 + 30) shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
  } else shiftType = 'night';

  const weekNumber = getWeekNumber(shiftDate);
  const isEvenWeek = weekNumber % 2 === 0;
  let shiftLetter = 'C';
  if (shiftType === 'night') shiftLetter = 'C';
  else if (shiftType === 'day') shiftLetter = isEvenWeek ? 'B' : 'A';
  else if (shiftType === 'evening') shiftLetter = isEvenWeek ? 'A' : 'B';

  return { weekNumber, shiftLetter, shiftType };
};

/* ===================== КОМПОНЕНТ КАРТОЧКИ ===================== */
function DrrCard({ title, dashboardUrl, vinsUrl, extra = {}, timeRange }) {
  const [data, setData] = useState({ total: 0, ok: 0, nok: 0, drrPercent: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const extraKey = JSON.stringify(extra);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const baseParams = new URLSearchParams({
          startTime: timeRange.start,
          endTime: timeRange.end,
          ...extra,
        });
        const vinsParams = new URLSearchParams({
          startTime: timeRange.start,
          endTime: timeRange.end,
          status: 'NOK',
          ...extra,
        });

        const [dRes, vRes] = await Promise.all([
          fetch(`${API_BASE}${dashboardUrl}?${baseParams.toString()}`).then(r => r.json()),
          fetch(`${API_BASE}${vinsUrl}?${vinsParams.toString()}`).then(r => r.json()),
        ]);

        if (!alive) return;

        const total = dRes.totalVins ?? 0;
        const ok = dRes.okVins ?? dRes.closedVins ?? 0;
        const nok = dRes.nokVins ?? Math.max(0, total - ok);
        const drrPercent = typeof dRes.drrPercent === 'number' ? dRes.drrPercent : 0;

        setData({ total, ok, nok, drrPercent });

        const grouped = {};
        (Array.isArray(vRes) ? vRes : []).forEach(v => {
          const key = v.material_desc || v.model || '—';
          grouped[key] = (grouped[key] || 0) + 1;
        });

        const result = Object.entries(grouped)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setRows(result);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [timeRange.start, timeRange.end, dashboardUrl, vinsUrl, extraKey]);

  const pieData = [
    { name: 'DRR', value: data.drrPercent },
    { name: 'NOK', value: Math.max(0, 100 - data.drrPercent) },
  ];

  const blockBase = {
    flex: 1,
    borderRadius: 10,
    padding: '10px 6px',
    textAlign: 'center',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  };

  const blockLabel = { fontSize: '0.72rem', fontWeight: 600, opacity: 0.9, lineHeight: 1 };
  const blockValue = { fontSize: '1.6rem', fontWeight: 900, lineHeight: 1.1 };

  const top3 = rows.slice(0, 3);

  return (
    <div style={cardStyle}>
      <h3 style={cardTitleStyle}>{title}</h3>

      {/* === Пончик === */}
      <div style={{ position: 'relative', width: '100%', height: 220, flexShrink: 0 }}>
        {loading ? (
          <div style={{ ...emptyStyle, paddingTop: 90 }}>Загрузка...</div>
        ) : error ? (
          <div style={{ ...emptyStyle, paddingTop: 90, color: '#DC2626' }}>Ошибка</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius="70%" outerRadius="95%"
                  paddingAngle={3}
                  stroke="#FFFFFF" strokeWidth={3}
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const count = name === 'DRR' ? data.ok : data.nok;
                    return [`${value.toFixed(1)}% (${count} VIN)`, name];
                  }}
                  contentStyle={{ fontSize: '0.9rem', borderRadius: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div style={centerLabelStyle}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
                {data.drrPercent.toFixed(1)}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* === 3 блока: Всего / OK / NOK === */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 14 }}>
        <div style={{ ...blockBase, backgroundColor: '#1E293B' }}>
          <div style={blockLabel}>Всего</div>
          <div style={blockValue}>{data.total}</div>
        </div>
        <div style={{ ...blockBase, backgroundColor: '#059669' }}>
          <div style={blockLabel}>OK</div>
          <div style={blockValue}>{data.ok}</div>
        </div>
        <div style={{ ...blockBase, backgroundColor: '#DC2626' }}>
          <div style={blockLabel}>NOK</div>
          <div style={blockValue}>{data.nok}</div>
        </div>
      </div>

      {/* === Таблица (топ-3) === */}
      <div style={tableWrapperStyle}>
        {loading ? (
          <div style={emptyStyle}>Загрузка...</div>
        ) : top3.length === 0 ? (
          <div style={emptyStyle}>Нет данных</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th2}>Модель</th>
                <th style={{ ...th2, textAlign: 'right' }}>NOK</th>
              </tr>
            </thead>
            <tbody>
              {top3.map((row, idx) => (
                <tr key={row.name} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                  <td style={td2}>{row.name}</td>
                  <td style={{ ...td2, textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ===================== ОСНОВНОЙ КОМПОНЕНТ ===================== */
export default function AllDrrDashboardPage() {
  const [timeFilter, setTimeFilter] = useState(getDefaultTimeFilter());
  const [isManualFilter, setIsManualFilter] = useState(false);
  const [shiftInfo, setShiftInfo] = useState(getCurrentShiftInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setShiftInfo(getCurrentShiftInfo());
      if (!isManualFilter) setTimeFilter(getDefaultTimeFilter());
    }, 60000);
    return () => clearInterval(interval);
  }, [isManualFilter]);

  const handleFilterClick = (f) => {
    setIsManualFilter(true);
    setTimeFilter(f);
  };

  const timeRange = getTimeRange(timeFilter);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>All DRR Dashboard</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* CW + смена */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '20px' }}>
            <div style={{
              background: '#FFFFFF', borderRadius: 20, padding: '12px 28px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.12)', border: '3px solid #fdfeff',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: '1.8rem', color: '#64748B', fontWeight: 800 }}>CW</span>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: '#1E293B', letterSpacing: 2, lineHeight: 1 }}>
                {shiftInfo.weekNumber}
              </span>
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: '#FFFFFF', color: '#1E293B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '3.5rem', lineHeight: 1,
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)', border: '4px solid #FFFFFF',
            }}>
              {shiftInfo.shiftLetter}
            </div>
          </div>

          <div style={{ width: 1, height: 60, backgroundColor: '#D1D5DB' }} />

          {/* Фильтры */}
          <div style={filterGroupStyle}>
            <button style={timeFilterButtonStyle(timeFilter === 'all', '#6B7280')} onClick={() => handleFilterClick('all')}>Сутки</button>
            <button style={timeFilterButtonStyle(timeFilter === 'day', '#F59E0B')} onClick={() => handleFilterClick('day')}>День</button>
            <button style={timeFilterButtonStyle(timeFilter === 'evening', '#3B82F6')} onClick={() => handleFilterClick('evening')}>Вечер</button>
            <button style={timeFilterButtonStyle(timeFilter === 'night', '#1F2937')} onClick={() => handleFilterClick('night')}>Ночь</button>
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        {DRR_CONFIGS.map(cfg => (
          <DrrCard
            key={cfg.key}
            title={cfg.title}
            dashboardUrl={cfg.dashboardUrl}
            vinsUrl={cfg.vinsUrl}
            extra={cfg.extra}
            timeRange={timeRange}
          />
        ))}
      </div>
    </div>
  );
}