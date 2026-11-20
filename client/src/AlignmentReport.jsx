import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';

const API_BASE = ''; 

// ===== СТИЛИ =====
const cardStyle = { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid #F0F0F5' };
const labelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4B5563', fontWeight: 500 };
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#F9FAFB' };
const buttonStyle = { padding: '8px 20px', borderRadius: 8, border: 'none', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' };
const tabStyle = (active) => ({ padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15, background: active ? '#2563EB' : '#F3F4F6', color: active ? '#FFFFFF' : '#6B7280', cursor: 'pointer', boxShadow: active ? '0 4px 12px rgba(37,99,235,0.25)' : 'none', transition: 'all 0.2s' });

const selectStyle = {
  padding: '8px 36px 8px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 14,
  background: '#F9FAFB',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px top 50%',
  backgroundSize: '10px auto',
  cursor: 'pointer',
  fontWeight: 500,
  color: '#374151',
  minWidth: '220px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};

// ===== ХЕЛПЕРЫ =====
const parseVal = (val) => {
  if (val === null || val === undefined || val === '[NULL]' || val === '') return null;
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(num) ? null : num;
};

const formatAngle = (val) => {
  const num = parseVal(val);
  if (num === null) return '- - -';
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const deg = Math.floor(absVal);
  let min = Math.round((absVal - deg) * 60);
  let finalDeg = deg;
  if (min === 60) { finalDeg += 1; min = 0; }
  const sign = isNegative ? '-' : '+';
  return `${sign}${finalDeg}°${String(min).padStart(2, '0')}'`;
};

const getDiff = (val1, val2) => {
  const num1 = parseVal(val1);
  const num2 = parseVal(val2);
  if (num1 === null || num2 === null) return null;
  return num1 - num2; 
};

// Умный выбор значения: берем After, если его нет - берем Before
const getSmartVal = (after, before) => {
  const a = parseVal(after);
  if (a !== null) return a;
  const b = parseVal(before);
  if (b !== null) return b;
  return 0;
};

// ─── IoT: имена NCATable_* (как в Excel) ───
const IoT = {
  f_camber_l:    'NCATable_NCA_Camber_LF',
  f_camber_r:    'NCATable_NCA_Camber_RF',
  f_camber_diff: 'NCATable_NCA_Camber_Fcross',
  f_toe_l:       'NCATable_NCA_Toe_LF',
  f_toe_r:       'NCATable_NCA_Toe_RF',
  f_toe_total:   'NCATable_NCA_Toe_Fcross',
  f_caster_l:    'NCATable_NCA_Caster_LF',
  f_caster_r:    'NCATable_NCA_Caster_RF',
  f_caster_diff: 'NCATable_NCA_Caster_Fcross',
  r_camber_l:    'NCATable_NCA_Camber_LR',
  r_camber_r:    'NCATable_NCA_Camber_RR',
  r_camber_diff: 'NCATable_NCA_Camber_Rcross',
  r_toe_l:       'NCATable_NCA_Toe_LR',
  r_toe_r:       'NCATable_NCA_Toe_RR',
  r_toe_total:   'NCATable_NCA_Toe_Rcross',
  r_thrust:      'NCATable_NCA_SWA',
};

const getIotVal = (iotMap, name) => {
  if (!iotMap || !name) return null;
  const lower = name.toLowerCase();
  for (const k of Object.keys(iotMap)) {
    if (k.toLowerCase() === lower) return iotMap[k];
  }
  return null;
};

const fmtIot = (val) => {
  if (val === null || val === undefined) return '- - -';
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null') return '- - -';
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') || '0';
  }
  return s;
};

// ─── Форматирование IoT в Градусы/Минуты (как у Hunter) ───
const toDMS = (val) => {
  const num = parseVal(val);
  if (num === null) return '- - -';
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const deg = Math.floor(absVal);
  let min = Math.round((absVal - deg) * 60);
  let finalDeg = deg;
  if (min === 60) { finalDeg += 1; min = 0; }
  const sign = isNegative ? '-' : '+';
  return `${sign}${finalDeg}°${String(min).padStart(2, '0')}'`;
};


export default function AlignmentReport() {
  const [activeSubTab, setActiveSubTab] = useState('table');

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>📐 Отчет по развалу-схождению</h2>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveSubTab('table')} style={tabStyle(activeSubTab === 'table')}>📋 Таблица отчета</button>
        <button onClick={() => setActiveSubTab('models')} style={tabStyle(activeSubTab === 'models')}>📊 Аналитика по моделям</button>
        <button onClick={() => setActiveSubTab('vin')} style={tabStyle(activeSubTab === 'vin')}>📊 Аналитика по VIN</button>
      </div>

      {activeSubTab === 'table' && <TableView />}
      {activeSubTab === 'models' && <ChartsViewModels />}
      {activeSubTab === 'vin' && <ChartsViewVIN />}
    </div>
  );
}

// ======================= ОБЩИЙ КОМПОНЕНТ ГРАФИКОВ =======================
function AlignmentCharts({ chartData, showVolume = false }) {
  
  const renderChartCard = (title, children) => (
    <div style={{ border: '1px solid #E5E7EB', padding: '20px', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
      <h4 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151', fontSize: 16, fontWeight: 700 }}>{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        {children}
      </ResponsiveContainer>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* РАЗВАЛ */}
      <div>
        <h3 style={{ fontSize: 18, color: '#1F2937', marginBottom: 16, borderBottom: '2px solid #E5E7EB', paddingBottom: 8 }}>Развал (Средний)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {renderChartCard('Передний мост', 
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[-2, 1]} tickFormatter={(val) => formatAngle(val)} width={65} />
              <Tooltip formatter={(val) => formatAngle(val)} />
              <Legend />
              <ReferenceLine y={-1.166} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={0.333} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="f_camber_l" name="Левый" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="f_camber_r" name="Правый" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
          {renderChartCard('Задний мост', 
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[-2, 0]} tickFormatter={(val) => formatAngle(val)} width={65} />
              <Tooltip formatter={(val) => formatAngle(val)} />
              <Legend />
              <ReferenceLine y={-1.2} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={-0.2} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="r_camber_l" name="Левый" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="r_camber_r" name="Правый" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
        </div>
      </div>

      {/* РАЗНИЦА РАЗВАЛА */}
      <div>
        <h3 style={{ fontSize: 18, color: '#1F2937', marginBottom: 16, borderBottom: '2px solid #E5E7EB', paddingBottom: 8 }}>Разница Развала</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {renderChartCard('Передний мост', 
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[-1, 1]} tickFormatter={(val) => formatAngle(val)} width={65} />
              <Tooltip formatter={(val) => formatAngle(val)} />
              <ReferenceLine y={0} stroke="#10b981" strokeWidth={2} />
              <ReferenceLine y={-0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="f_camber_diff" name="Разница" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
          {renderChartCard('Задний мост', 
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[-1, 1]} tickFormatter={(val) => formatAngle(val)} width={65} />
              <Tooltip formatter={(val) => formatAngle(val)} />
              <ReferenceLine y={0} stroke="#10b981" strokeWidth={2} />
              <ReferenceLine y={-0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="r_camber_diff" name="Разница" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
        </div>
      </div>

      {/* СХОЖДЕНИЕ */}
      <div>
        <h3 style={{ fontSize: 18, color: '#1F2937', marginBottom: 16, borderBottom: '2px solid #E5E7EB', paddingBottom: 8 }}>Схождение</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {renderChartCard('Передний мост', 
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[-0.5, 0.5]} tickFormatter={(val) => formatAngle(val)} width={65} />
              <Tooltip formatter={(val) => formatAngle(val)} />
              <Legend />
              <ReferenceLine y={0} stroke="#10b981" strokeWidth={2} />
              <ReferenceLine y={-0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="f_toe_l" name="Левый" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="f_toe_r" name="Правый" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="f_toe_total" name="Суммарное" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
          {renderChartCard('Задний мост', 
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[-0.5, 0.5]} tickFormatter={(val) => formatAngle(val)} width={65} />
              <Tooltip formatter={(val) => formatAngle(val)} />
              <Legend />
              <ReferenceLine y={0} stroke="#10b981" strokeWidth={2} />
              <ReferenceLine y={-0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="r_toe_l" name="Левый" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="r_toe_r" name="Правый" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="r_toe_total" name="Суммарное" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
        </div>
      </div>

      {/* ОБЪЕМ (только для моделей) */}
      {showVolume && (
        <div>
          <h3 style={{ fontSize: 18, color: '#1F2937', marginBottom: 16, borderBottom: '2px solid #E5E7EB', paddingBottom: 8 }}>Объем прошедших авто</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            {renderChartCard('Количество машин по дням', 
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis width={40} />
                <Tooltip />
                <Area type="monotone" dataKey="cars" name="Кол-во машин" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
              </AreaChart>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ======================= ВКЛАДКА: АНАЛИТИКА ПО МОДЕЛЯМ =======================
function ChartsViewModels() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`${API_BASE}/api/alignment-models`)
      .then(r => r.json())
      .then(data => {
        setModels(data);
        if (data.length > 0) setSelectedModel(data[0]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedModel) loadCharts();
  }, [selectedModel]);

  const loadCharts = async () => {
    if (!selectedModel || !startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/alignment-charts?model=${selectedModel}&startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      
      const prepared = json.map(item => {
        const [y, m, d] = item.date.split('-');
        const fl = parseVal(item.avg_f_camber_l) ?? 0;
        const fr = parseVal(item.avg_f_camber_r) ?? 0;
        const rl = parseVal(item.avg_r_camber_l) ?? 0;
        const rr = parseVal(item.avg_r_camber_r) ?? 0;

        return {
          date: `${d}.${m}`,
          f_camber_l: fl,
          f_camber_r: fr,
          f_camber_diff: fl - fr,
          f_toe_l: parseVal(item.avg_f_toe_l) ?? 0,
          f_toe_r: parseVal(item.avg_f_toe_r) ?? 0,
          f_toe_total: parseVal(item.avg_f_toe_total) ?? 0,
          
          r_camber_l: rl,
          r_camber_r: rr,
          r_camber_diff: rl - rr,
          r_toe_l: parseVal(item.avg_r_toe_l) ?? 0,
          r_toe_r: parseVal(item.avg_r_toe_r) ?? 0,
          r_toe_total: parseVal(item.avg_r_toe_total) ?? 0,
          
          cars: item.cars_count
        };
      });
      setChartData(prepared);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12 }}>
        <label style={labelStyle}>Модель:
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={selectStyle}>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label style={labelStyle}>С даты:
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>По дату:
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
        </label>
        <button onClick={loadCharts} disabled={loading || !selectedModel || !startDate || !endDate} style={{ ...buttonStyle, background: '#2563EB' }}>
          {loading ? '⏳ Загрузка...' : 'Построить графики'}
        </button>
      </div>

      {chartData.length > 0 ? (
        <AlignmentCharts chartData={chartData} showVolume={true} />
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
          {loading ? 'Загрузка...' : 'Нет данных для выбранного периода'}
        </div>
      )}
    </div>
  );
}

// ======================= ВКЛАДКА: АНАЛИТИКА ПО VIN =======================
function ChartsViewVIN() {
  const [vin, setVin] = useState('');
  const [searchedVin, setSearchedVin] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadVINData = async () => {
    if (!vin.trim()) return;
    setLoading(true);
    setError(null);
    setChartData([]);
    setSearchedVin('');

    try {
      const res = await fetch(`${API_BASE}/api/alignment-report?vin=${vin.trim()}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();
      
      if (json.length === 0) {
        setError('Отчеты не найдены (проверьте VIN)');
      } else {
        setSearchedVin(json[0].requestedVin || json[0].vin || vin);

        const dateCounts = {};
        json.forEach(item => {
          const d = item.begin_date.split(' ')[0];
          dateCounts[d] = (dateCounts[d] || 0) + 1;
        });

        const prepared = json.map(item => {
          const datePart = item.begin_date.split(' ')[0];
          const timePart = item.begin_date.split(' ')[1]?.substring(0, 5) || '';
          const dateStr = dateCounts[datePart] > 1 ? `${datePart} ${timePart}` : datePart;

          const fl = getSmartVal(item.f_camber_l_after, item.f_camber_l_before);
          const fr = getSmartVal(item.f_camber_r_after, item.f_camber_r_before);
          const rl = getSmartVal(item.r_camber_l_after, item.r_camber_l_before);
          const rr = getSmartVal(item.r_camber_r_after, item.r_camber_r_before);

          return {
            date: dateStr,
            f_camber_l: fl,
            f_camber_r: fr,
            f_camber_diff: fl - fr,
            f_toe_l: getSmartVal(item.f_toe_l_after, item.f_toe_l_before),
            f_toe_r: getSmartVal(item.f_toe_r_after, item.f_toe_r_before),
            f_toe_total: getSmartVal(item.f_toe_total_after, item.f_toe_total_before),
            
            r_camber_l: rl,
            r_camber_r: rr,
            r_camber_diff: rl - rr,
            r_toe_l: getSmartVal(item.r_toe_l_after, item.r_toe_l_before),
            r_toe_r: getSmartVal(item.r_toe_r_after, item.r_toe_r_before),
            r_toe_total: getSmartVal(item.r_toe_total_after, item.r_toe_total_before),
          };
        }).reverse();

        setChartData(prepared);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, alignItems: 'center' }}>
        <label style={labelStyle}>🔍 VIN для анализа:
          <input 
            type="text" 
            value={vin} 
            onChange={(e) => setVin(e.target.value.toUpperCase())} 
            onKeyDown={(e) => { if (e.key === 'Enter') loadVINData(); }} 
            placeholder="Введите VIN" 
            style={{ ...inputStyle, width: 300 }} 
          />
        </label>
        <button onClick={loadVINData} disabled={!vin.trim() || loading} style={{ ...buttonStyle, background: '#2563EB', opacity: vin.trim() ? 1 : 0.6 }}>
          {loading ? '⏳ Загрузка...' : 'Построить графики по VIN'}
        </button>
        {error && <span style={{ color: '#DC2626', fontSize: 14 }}>❌ {error}</span>}
      </div>

      {searchedVin && (
        <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, color: '#1F2937', backgroundColor: '#EFF6FF', padding: '10px 16px', borderRadius: 8, borderLeft: '4px solid #2563EB' }}>
          📊 Данные по VIN: {searchedVin}
        </div>
      )}

      {chartData.length > 0 ? (
        <AlignmentCharts chartData={chartData} showVolume={false} />
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
          {loading ? 'Загрузка...' : 'Введите VIN и нажмите "Построить графики"'}
        </div>
      )}
    </div>
  );
}

// ======================= ВКЛАДКА: ТАБЛИЦА =======================
function TableView() {
  const [vin, setVin] = useState('');
  const [reportsList, setReportsList] = useState([]);
  const [reportIndex, setReportIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Переключатель формата IoT (по умолчанию включен - DMS)
  const [isIotDms, setIsIotDms] = useState(true);

  const data = reportsList[reportIndex];

  const loadData = async () => {
    if (!vin.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/alignment-report?vin=${vin.trim()}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const json = await res.json();
      
      if (json.length === 0) {
        setError('Отчеты не найдены (проверьте VIN)');
        setReportsList([]);
      } else {
        setReportsList(json);
        setReportIndex(0); 
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data) return;
    
    // Вспомогательная функция для выбора формата IoT при экспорте
    const getIotDisplay = (val) => isIotDms ? toDMS(val) : fmtIot(val);

    const exportData = [
      { 'Наименование': 'Передний мост', 'Мин': '', 'Макс': '', 'Начальное': '', 'Конечное': '', 'Значение IoT': '', 'Наименование IoT': '' },
      { 'Наименование': 'Развал: левый', 'Мин': formatAngle(data.f_camber_l_min), 'Макс': formatAngle(data.f_camber_l_max), 'Начальное': formatAngle(data.f_camber_l_before), 'Конечное': formatAngle(data.f_camber_l_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_camber_l)), 'Наименование IoT': IoT.f_camber_l },
      { 'Наименование': 'Развал: правый', 'Мин': formatAngle(data.f_camber_l_min), 'Макс': formatAngle(data.f_camber_l_max), 'Начальное': formatAngle(data.f_camber_r_before), 'Конечное': formatAngle(data.f_camber_r_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_camber_r)), 'Наименование IoT': IoT.f_camber_r },
      { 'Наименование': 'Развал: разница', 'Мин': '-0°30\'', 'Макс': '+0°30\'', 'Начальное': formatAngle(getDiff(data.f_camber_l_before, data.f_camber_r_before)), 'Конечное': formatAngle(getDiff(data.f_camber_l_after, data.f_camber_r_after)), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_camber_diff)), 'Наименование IoT': IoT.f_camber_diff },
      { 'Наименование': 'Схождение: левое', 'Мин': formatAngle(data.f_toe_l_min), 'Макс': formatAngle(data.f_toe_l_max), 'Начальное': formatAngle(data.f_toe_l_before), 'Конечное': formatAngle(data.f_toe_l_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_toe_l)), 'Наименование IoT': IoT.f_toe_l },
      { 'Наименование': 'Схождение: правое', 'Мин': formatAngle(data.f_toe_l_min), 'Макс': formatAngle(data.f_toe_l_max), 'Начальное': formatAngle(data.f_toe_r_before), 'Конечное': formatAngle(data.f_toe_r_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_toe_r)), 'Наименование IoT': IoT.f_toe_r },
      { 'Наименование': 'Схождение: суммарное', 'Мин': formatAngle(data.f_toe_total_min), 'Макс': formatAngle(data.f_toe_total_max), 'Начальное': formatAngle(data.f_toe_total_before), 'Конечное': formatAngle(data.f_toe_total_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_toe_total)), 'Наименование IoT': IoT.f_toe_total },
      { 'Наименование': 'Продольный наклон шкворня: левый', 'Мин': formatAngle(data.f_caster_l_min), 'Макс': formatAngle(data.f_caster_l_max), 'Начальное': formatAngle(data.f_caster_l_before), 'Конечное': formatAngle(data.f_caster_l_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_caster_l)), 'Наименование IoT': IoT.f_caster_l },
      { 'Наименование': 'Продольный наклон шкворня: правый', 'Мин': formatAngle(data.f_caster_l_min), 'Макс': formatAngle(data.f_caster_l_max), 'Начальное': formatAngle(data.f_caster_r_before), 'Конечное': formatAngle(data.f_caster_r_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_caster_r)), 'Наименование IoT': IoT.f_caster_r },
      { 'Наименование': 'Продольный наклон шкворня: разница', 'Мин': '- - -', 'Макс': '- - -', 'Начальное': formatAngle(getDiff(data.f_caster_l_before, data.f_caster_r_before)), 'Конечное': formatAngle(getDiff(data.f_caster_l_after, data.f_caster_r_after)), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.f_caster_diff)), 'Наименование IoT': IoT.f_caster_diff },
      { 'Наименование': 'Поперечный наклон шкворня: левый', 'Мин': formatAngle(data.f_kpi_l_min), 'Макс': formatAngle(data.f_kpi_l_max), 'Начальное': formatAngle(data.f_kpi_l_before), 'Конечное': formatAngle(data.f_kpi_l_after), 'Значение IoT': '', 'Наименование IoT': '' },
      { 'Наименование': 'Поперечный наклон шкворня: правый', 'Мин': formatAngle(data.f_kpi_l_min), 'Макс': formatAngle(data.f_kpi_l_max), 'Начальное': formatAngle(data.f_kpi_r_before), 'Конечное': formatAngle(data.f_kpi_r_after), 'Значение IoT': '', 'Наименование IoT': '' },
      { 'Наименование': 'Поперечный наклон шкворня: разница', 'Мин': '- - -', 'Макс': '- - -', 'Начальное': formatAngle(getDiff(data.f_kpi_l_before, data.f_kpi_r_before)), 'Конечное': formatAngle(getDiff(data.f_kpi_l_after, data.f_kpi_r_after)), 'Значение IoT': '', 'Наименование IoT': '' },
      { 'Наименование': 'Задний мост', 'Мин': '', 'Макс': '', 'Начальное': '', 'Конечное': '', 'Значение IoT': '', 'Наименование IoT': '' },
      { 'Наименование': 'Развал: левый', 'Мин': formatAngle(data.r_camber_l_min), 'Макс': formatAngle(data.r_camber_l_max), 'Начальное': formatAngle(data.r_camber_l_before), 'Конечное': formatAngle(data.r_camber_l_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.r_camber_l)), 'Наименование IoT': IoT.r_camber_l },
      { 'Наименование': 'Развал: правый', 'Мин': formatAngle(data.r_camber_l_min), 'Макс': formatAngle(data.r_camber_l_max), 'Начальное': formatAngle(data.r_camber_r_before), 'Конечное': formatAngle(data.r_camber_r_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.r_camber_r)), 'Наименование IoT': IoT.r_camber_r },
      { 'Наименование': 'Развал: разница', 'Мин': '-0°30\'', 'Макс': '+0°30\'', 'Начальное': formatAngle(getDiff(data.r_camber_l_before, data.r_camber_r_before)), 'Конечное': formatAngle(getDiff(data.r_camber_l_after, data.r_camber_r_after)), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.r_camber_diff)), 'Наименование IoT': IoT.r_camber_diff },
      { 'Наименование': 'Схождение: левое', 'Мин': formatAngle(data.r_toe_l_min), 'Макс': formatAngle(data.r_toe_l_max), 'Начальное': formatAngle(data.r_toe_l_before), 'Конечное': formatAngle(data.r_toe_l_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.r_toe_l)), 'Наименование IoT': IoT.r_toe_l },
      { 'Наименование': 'Схождение: правое', 'Мин': formatAngle(data.r_toe_l_min), 'Макс': formatAngle(data.r_toe_l_max), 'Начальное': formatAngle(data.r_toe_r_before), 'Конечное': formatAngle(data.r_toe_r_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.r_toe_r)), 'Наименование IoT': IoT.r_toe_r },
      { 'Наименование': 'Схождение: суммарное', 'Мин': formatAngle(data.r_toe_total_min), 'Макс': formatAngle(data.r_toe_total_max), 'Начальное': formatAngle(data.r_toe_total_before), 'Конечное': formatAngle(data.r_toe_total_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.r_toe_total)), 'Наименование IoT': IoT.r_toe_total },
      { 'Наименование': 'Угол движения', 'Мин': '- - -', 'Макс': '- - -', 'Начальное': formatAngle(data.r_thrust_angle_before), 'Конечное': formatAngle(data.r_thrust_angle_after), 'Значение IoT': getIotDisplay(getIotVal(data.iot, IoT.r_thrust)), 'Наименование IoT': IoT.r_thrust },
    ];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Развал');
    XLSX.writeFile(wb, `Развал_${data.requestedVin || data.vin}.xlsx`);
  };

  const TableRow = ({ label, before, after, min, max, iotValue, iotName }) => {
    const beforeNum = parseVal(before);
    const minNum = parseVal(min);
    const maxNum = parseVal(max);
    
    const isOk = beforeNum !== null && minNum !== null && maxNum !== null 
      ? (beforeNum >= minNum && beforeNum <= maxNum) 
      : null;

    return (
      <tr style={{ borderBottom: '1px solid #000', textAlign: 'center', fontSize: '15px', fontFamily: '"Times New Roman", Times, serif' }}>
        <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #000', paddingRight: 15 }}>{label}</td>
        
        {/* Hunter */}
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{min !== null && min !== undefined ? formatAngle(min) : '- - -'}</td>
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{max !== null && max !== undefined ? formatAngle(max) : '- - -'}</td>
        <td style={{ padding: '6px', borderRight: '1px solid #000', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            {isOk !== null && (
              <span style={{ fontSize: '16px', position: 'absolute', left: '10px' }}>
                {isOk ? '✅' : '❌'}
              </span>
            )}
            <span>{formatAngle(before)}</span>
          </div>
        </td>
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>{formatAngle(after)}</td>

        {/* IoT */}
        <td style={{ padding: '6px', borderRight: '1px solid #000' }}>
          {isIotDms ? toDMS(iotValue) : fmtIot(iotValue)}
        </td>
        {/* Шрифт IoT приведен к общему стилю Times New Roman */}
        <td style={{ padding: '6px', fontFamily: '"Times New Roman", Times, serif' }}>
          {iotName || '- - -'}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={labelStyle}>🔍 VIN:
          <input 
            type="text" 
            value={vin} 
            onChange={(e) => setVin(e.target.value.toUpperCase())} 
            onKeyDown={(e) => { if (e.key === 'Enter') loadData(); }} 
            placeholder="Полный или часть (TG049519)" 
            style={{ ...inputStyle, width: 350 }} 
          />
        </label>
        <button onClick={loadData} disabled={!vin.trim() || loading} style={{ ...buttonStyle, background: '#2563EB', opacity: vin.trim() ? 1 : 0.6 }}>
          {loading ? '⏳ Загрузка...' : '🔍 Найти'}
        </button>
        {error && <span style={{ color: '#DC2626', fontSize: 14 }}>❌ {error}</span>}
        
        {reportsList.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 14, color: '#4B5563', fontWeight: 500 }}>Выберите замер:</span>
            <select 
              value={reportIndex} 
              onChange={(e) => setReportIndex(Number(e.target.value))} 
              style={selectStyle}
            >
              {reportsList.map((r, i) => (
                <option key={r.report_id} value={i}>
                  {r.begin_date} (ID: {r.report_id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {data && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, justifyContent: 'flex-end', alignItems: 'center' }}>
            
            {/* ПЕРЕКЛЮЧАТЕЛЬ ФОРМАТА IoT */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#4B5563', fontWeight: 500, marginRight: 'auto' }}>
              <input 
                type="checkbox" 
                checked={isIotDms} 
                onChange={(e) => setIsIotDms(e.target.checked)} 
                style={{ width: 18, height: 18, cursor: 'pointer' }} 
              />
              IoT: Градусы° Минуты'
            </label>

            <button onClick={() => window.print()} style={{ ...buttonStyle, background: '#DC2626' }}>📄 Экспорт в PDF (Печать)</button>
            <button onClick={exportToExcel} style={{ ...buttonStyle, background: '#059669' }}>📊 Экспорт в Excel</button>
          </div>

          <div id="print-section" style={{ border: '2px solid #000', maxWidth: '1000px', margin: '0 auto', padding: 20 }}>
            <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: 15, fontFamily: '"Times New Roman", Times, serif' }}>
              VIN: {data.requestedVin || data.vin} | Модель: {data.full_model_name ? data.full_model_name.replace('AGM>', '').trim() : '-'} | Дата: {data.begin_date}
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
              <thead style={{ fontSize: '15px', fontFamily: '"Times New Roman", Times, serif' }}>
                <tr>
                  <th rowSpan={3} style={{ border: '1px solid #000', padding: '8px', width: '25%', textAlign: 'left' }}>Наименование:</th>
                  <th colSpan={4} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Hunter</th>
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>IoT</th>
                </tr>
                <tr>
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'normal' }}>Нормативы</th>
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'normal' }}>Измерение</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', width: '13%', fontWeight: 'normal' }}>Значение IoT</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', width: '18%', fontWeight: 'normal' }}>Наименование IoT</th>
                </tr>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '11%', fontWeight: 'normal' }}>Мин</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '11%', fontWeight: 'normal' }}>Макс.</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '11%', fontWeight: 'normal' }}>Начальное</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '11%', fontWeight: 'normal' }}>Конечное</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={7} style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px', backgroundColor: '#e5e7eb', borderBottom: '1px solid #000', fontFamily: '"Times New Roman", Times, serif', fontSize: '16px' }}>Передний мост</td></tr>
                
                <TableRow label="Развал: левый" before={data.f_camber_l_before} after={data.f_camber_l_after} min={data.f_camber_l_min} max={data.f_camber_l_max} iotName={IoT.f_camber_l} iotValue={getIotVal(data.iot, IoT.f_camber_l)} />
                <TableRow label="Развал: правый" before={data.f_camber_r_before} after={data.f_camber_r_after} min={data.f_camber_l_min} max={data.f_camber_l_max} iotName={IoT.f_camber_r} iotValue={getIotVal(data.iot, IoT.f_camber_r)} />
                <TableRow label="Развал: разница" before={getDiff(data.f_camber_l_before, data.f_camber_r_before)} after={getDiff(data.f_camber_l_after, data.f_camber_r_after)} min={-0.5} max={0.5} iotName={IoT.f_camber_diff} iotValue={getIotVal(data.iot, IoT.f_camber_diff)} />
                
                <TableRow label="Схождение: левое" before={data.f_toe_l_before} after={data.f_toe_l_after} min={data.f_toe_l_min} max={data.f_toe_l_max} iotName={IoT.f_toe_l} iotValue={getIotVal(data.iot, IoT.f_toe_l)} />
                <TableRow label="Схождение: правое" before={data.f_toe_r_before} after={data.f_toe_r_after} min={data.f_toe_l_min} max={data.f_toe_l_max} iotName={IoT.f_toe_r} iotValue={getIotVal(data.iot, IoT.f_toe_r)} />
                <TableRow label="Схождение: суммарное" before={data.f_toe_total_before} after={data.f_toe_total_after} min={data.f_toe_total_min} max={data.f_toe_total_max} iotName={IoT.f_toe_total} iotValue={getIotVal(data.iot, IoT.f_toe_total)} />
                
                <TableRow label="Продольный наклон шкворня: левый" before={data.f_caster_l_before} after={data.f_caster_l_after} min={data.f_caster_l_min} max={data.f_caster_l_max} iotName={IoT.f_caster_l} iotValue={getIotVal(data.iot, IoT.f_caster_l)} />
                <TableRow label="Продольный наклон шкворня: правый" before={data.f_caster_r_before} after={data.f_caster_r_after} min={data.f_caster_l_min} max={data.f_caster_l_max} iotName={IoT.f_caster_r} iotValue={getIotVal(data.iot, IoT.f_caster_r)} />
                <TableRow label="Продольный наклон шкворня: разница" before={getDiff(data.f_caster_l_before, data.f_caster_r_before)} after={getDiff(data.f_caster_l_after, data.f_caster_r_after)} min={null} max={null} iotName={IoT.f_caster_diff} iotValue={getIotVal(data.iot, IoT.f_caster_diff)} />
                
                <TableRow label="Поперечный наклон шкворня: левый" before={data.f_kpi_l_before} after={data.f_kpi_l_after} min={data.f_kpi_l_min} max={data.f_kpi_l_max} iotName="" iotValue="" />
                <TableRow label="Поперечный наклон шкворня: правый" before={data.f_kpi_r_before} after={data.f_kpi_r_after} min={data.f_kpi_l_min} max={data.f_kpi_l_max} iotName="" iotValue="" />
                <TableRow label="Поперечный наклон шкворня: разница" before={getDiff(data.f_kpi_l_before, data.f_kpi_r_before)} after={getDiff(data.f_kpi_l_after, data.f_kpi_r_after)} min={null} max={null} iotName="" iotValue="" />

                <tr><td colSpan={7} style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px', backgroundColor: '#e5e7eb', borderBottom: '1px solid #000', borderTop: '1px solid #000', fontFamily: '"Times New Roman", Times, serif', fontSize: '16px' }}>Задний мост</td></tr>
                
                <TableRow label="Развал: левый" before={data.r_camber_l_before} after={data.r_camber_l_after} min={data.r_camber_l_min} max={data.r_camber_l_max} iotName={IoT.r_camber_l} iotValue={getIotVal(data.iot, IoT.r_camber_l)} />
                <TableRow label="Развал: правый" before={data.r_camber_r_before} after={data.r_camber_r_after} min={data.r_camber_l_min} max={data.r_camber_l_max} iotName={IoT.r_camber_r} iotValue={getIotVal(data.iot, IoT.r_camber_r)} />
                <TableRow label="Развал: разница" before={getDiff(data.r_camber_l_before, data.r_camber_r_before)} after={getDiff(data.r_camber_l_after, data.r_camber_r_after)} min={-0.5} max={0.5} iotName={IoT.r_camber_diff} iotValue={getIotVal(data.iot, IoT.r_camber_diff)} />
                
                <TableRow label="Схождение: левое" before={data.r_toe_l_before} after={data.r_toe_l_after} min={data.r_toe_l_min} max={data.r_toe_l_max} iotName={IoT.r_toe_l} iotValue={getIotVal(data.iot, IoT.r_toe_l)} />
                <TableRow label="Схождение: правое" before={data.r_toe_r_before} after={data.r_toe_r_after} min={data.r_toe_l_min} max={data.r_toe_l_max} iotName={IoT.r_toe_r} iotValue={getIotVal(data.iot, IoT.r_toe_r)} />
                <TableRow label="Схождение: суммарное" before={data.r_toe_total_before} after={data.r_toe_total_after} min={data.r_toe_total_min} max={data.r_toe_total_max} iotName={IoT.r_toe_total} iotValue={getIotVal(data.iot, IoT.r_toe_total)} />
                
                <TableRow label="Угол движения" before={data.r_thrust_angle_before} after={data.r_thrust_angle_after} min={null} max={null} iotName={IoT.r_thrust} iotValue={getIotVal(data.iot, IoT.r_thrust)} />
              </tbody>
            </table>
          </div>

          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-section, #print-section * { visibility: visible; }
              #print-section { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}