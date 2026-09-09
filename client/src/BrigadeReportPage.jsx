import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';

const API_BASE = '';

/* ===================== БРЕНДБУК ===================== */
const BRAND = {
  bg: '#FFFFFF',
  cardBg: '#FFFFFF',
  primary: '#2563EB',
  accent: '#F59E0B',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  shadow: '0 4px 12px rgba(0,0,0,0.04)',
  radius: 16,
  radiusSmall: 8,
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
};

/* ===================== ОБЩИЕ СТИЛИ ===================== */
const containerStyle = {
  padding: '20px',
  fontFamily: BRAND.fontFamily,
  width: '100%',
  height: '100vh',
  boxSizing: 'border-box',
  backgroundColor: BRAND.bg,
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
  flexWrap: 'wrap',
  gap: '10px',
};

const titleStyle = {
  fontSize: '2.5rem',
  fontWeight: 900,
  color: BRAND.text,
  margin: 0,
};

const tabBarStyle = {
  display: 'flex',
  gap: '6px',
  background: '#E2E8F0',
  borderRadius: 12,
  padding: '6px',
  width: 'fit-content',
};

const tabStyle = (active) => ({
  padding: '10px 28px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: '1.4rem',
  background: active ? '#FFFFFF' : 'transparent',
  color: active ? BRAND.text : BRAND.textSecondary,
  cursor: 'pointer',
  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
  transition: 'all 0.2s',
});

const subTabStyle = (active) => ({
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  fontSize: '1.2rem',
  background: active ? BRAND.primary : '#E2E8F0',
  color: active ? '#FFFFFF' : BRAND.textSecondary,
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const cardStyle = {
  backgroundColor: BRAND.cardBg,
  borderRadius: BRAND.radius,
  padding: 20,
  boxShadow: BRAND.shadow,
  border: `1px solid ${BRAND.border}`,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: BRAND.radiusSmall,
  border: `1px solid ${BRAND.border}`,
  fontSize: 14,
  background: '#F9FAFB',
  outline: 'none',
};

const buttonStyle = {
  padding: '8px 20px',
  borderRadius: BRAND.radiusSmall,
  border: 'none',
  background: BRAND.primary,
  color: 'white',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: '#10B981',
};

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#FFFFFF',
  background: BRAND.primary,
  fontSize: '1.1rem',
  textTransform: 'uppercase',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 16px',
  borderBottom: `1px solid ${BRAND.border}`,
  color: BRAND.text,
  fontSize: '1rem',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.7)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: '20px',
};

const modalStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  width: '100%',
  maxWidth: '480px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '32px',
  fontFamily: BRAND.fontFamily,
  color: BRAND.text,
  boxSizing: 'border-box',
  border: '1px solid rgba(255,255,255,0.5)',
};

const wideModalStyle = {
  ...modalStyle,
  maxWidth: '720px',
};

/* ===================== МУЛЬТИСЕЛЕКТ ===================== */
function MultiSelect({ options, selected, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nonAllOptions = options.filter(o => o !== 'ALL');
  const allSelected = selected.length === nonAllOptions.length && nonAllOptions.length > 0;

  const handleToggle = (value) => {
    if (value === 'ALL') {
      if (allSelected) {
        onChange([]);
      } else {
        onChange(nonAllOptions);
      }
    } else {
      const updated = selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value];
      onChange(updated);
    }
  };

  const displayText = selected.length === 0 || allSelected
    ? placeholder
    : selected.join(', ');

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...inputStyle,
          width: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
          cursor: 'pointer',
          textAlign: 'left',
          padding: '8px 10px',
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 80,
          fontSize: 13,
        }}>
          {displayText}
        </span>
        <span style={{ fontSize: 10, color: BRAND.textSecondary }}>▼</span>
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: '#FFFFFF',
          borderRadius: BRAND.radiusSmall,
          boxShadow: BRAND.shadow,
          padding: 12,
          minWidth: 200,
          zIndex: 100,
          border: `1px solid ${BRAND.border}`,
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => handleToggle('ALL')}
            />
            Все
          </label>
          {nonAllOptions.map(option => (
            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => handleToggle(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== МОДАЛЬНОЕ ОКНО ПАРОЛЯ ===================== */
function PasswordModal({ isOpen, onClose, onSubmit, error, title = 'Введите пароль', subtitle = '' }) {
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(passwordInput);
    setPasswordInput('');
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#EFF6FF',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          marginBottom: '16px',
          color: BRAND.primary,
        }}>
          🔒
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '1.5rem' }}>{title}</h3>
        <p style={{ margin: '0 0 20px 0', color: BRAND.textSecondary, fontSize: '0.9rem' }}>{subtitle}</p>

        {error && <p style={{ color: '#EF4444', marginBottom: 10, fontSize: '0.9rem' }}>{error}</p>}
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Пароль"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: `1px solid ${BRAND.border}`,
            fontSize: '0.95rem',
            fontFamily: BRAND.fontFamily,
            color: BRAND.text,
            backgroundColor: '#F8FAFC',
            outline: 'none',
            transition: 'all 0.2s',
            boxSizing: 'border-box',
            marginBottom: '16px',
          }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: `1px solid ${BRAND.border}`,
              background: '#FFFFFF',
              color: BRAND.text,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: BRAND.primary,
              color: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
            }}
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== ОБУЧЕНИЕ (МОДАЛЬНОЕ ОКНО С ИНСТРУКЦИЯМИ) ===================== */
function HelpModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState('assign');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...wideModalStyle, maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: BRAND.text }}>❓ Как пользоваться</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: BRAND.textSecondary, lineHeight: 1 }}>×</button>
        </div>

        {/* Переключатель разделов */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setActiveSection('assign')}
            style={{ ...subTabStyle(activeSection === 'assign'), flex: 1 }}
          >
            🎯 Назначение бригад
          </button>
          <button
            onClick={() => setActiveSection('dictionary')}
            style={{ ...subTabStyle(activeSection === 'dictionary'), flex: 1 }}
          >
            📚 Справочник
          </button>
        </div>

        {/* Содержимое */}
        {activeSection === 'assign' ? (
          <div style={{ fontSize: '1.1rem', lineHeight: 1.6, color: BRAND.text }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 10 }}>Что это?</p>
            <p>Здесь показаны <b>дефекты без владельца</b> за выбранный период. Это дефекты, у которых ещё не назначена ответственная бригада.</p>
            <p style={{ marginTop: 10 }}>Этот раздел нужно регулярно проверять и назначать бригады, чтобы каждый дефект имел ответственного.</p>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginTop: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Пошагово:</p>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>Выберите даты и чекпоинты (если нужно).</li>
                <li>В таблице найдите дефект.</li>
                <li>В колонке «Бригада» выберите нужную бригаду из списка.</li>
                <li>Нажмите кнопку «Назначить».</li>
                <li>После назначения дефект исчезнет из этого списка.</li>
              </ol>
            </div>
            <p style={{ marginTop: 16, color: BRAND.textSecondary }}>💡 Если дефектов много, можно сначала импортировать справочник во вкладке «Справочник», тогда большинство дефектов автоматически получат владельца.</p>
          </div>
        ) : (
          <div style={{ fontSize: '1.1rem', lineHeight: 1.6, color: BRAND.text }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 10 }}>Что это?</p>
            <p>Здесь вы можете <b>добавлять, редактировать и удалять</b> записи, которые связывают дефект (модель + деталь + дефект) с ответственной бригадой.</p>
            <p style={{ marginTop: 10 }}>Это нужно для того, чтобы при построении отчёта каждый дефект автоматически попадал в нужную бригаду.</p>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginTop: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Как добавить вручную:</p>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>Выберите модель.</li>
                <li>Введите деталь (например, «Бампер»).</li>
                <li>Введите дефект (например, «Повреждение»).</li>
                <li>Выберите бригаду.</li>
                <li>Нажмите «Добавить».</li>
              </ol>
              <p style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Как импортировать из Excel:</p>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>Нажмите кнопку «Импорт».</li>
                <li>Выберите способ: загрузить файл или вставить текст.</li>
                <li>Файл должен содержать столбцы: <b>Модель, Деталь, Дефект, Бригада</b>.</li>
                <li>Для текста: каждая строка вида <code>Модель[TAB]Деталь[TAB]Дефект[TAB]Бригада</code>.</li>
              </ol>
            </div>
            <p style={{ marginTop: 16, color: BRAND.textSecondary }}>💡 После импорта или добавления записей они сразу начнут применяться в отчёте.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== ОБЩИЙ ОТЧЕТ (ГИСТОГРАММА) ===================== */
function BrigadeReport({ brigades, password, executeWithPassword }) {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(today.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [selectedCheckpoints, setSelectedCheckpoints] = useState([]);
  const [defectType, setDefectType] = useState('all');
  const [metric, setMetric] = useState('count');
  const [histogramData, setHistogramData] = useState([]);
  const [totalCars, setTotalCars] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [totalDefects, setTotalDefects] = useState(0);
  const [topBrigades, setTopBrigades] = useState([]);
  const [loading, setLoading] = useState(false);

  const availableCheckpoints = ['CP7', 'CP8', 'PIP', 'TL'];

  const loadData = async () => {
    setLoading(true);
    try {
      const allSelected = selectedCheckpoints.length === 0 || selectedCheckpoints.length === availableCheckpoints.length;
      const checkpointParam = allSelected ? 'ALL' : selectedCheckpoints.join(',');
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        checkpoint: checkpointParam,
        metric,
        defectType,
      });
      const res = await fetch(`${API_BASE}/api/brigade-report/data?${params}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const data = await res.json();
      setHistogramData(data.histogram);
      setTotalCars(data.totalCars);
      setUnassignedCount(data.unassignedCount);
      setTotalDefects(data.totalDefects);
      setTopBrigades(data.topBrigades || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo, selectedCheckpoints, metric, defectType]);

  // Топ 3 бригады по выбранной метрике
  const top3Brigades = useMemo(() => {
    if (!topBrigades.length) return [];
    const sorted = [...topBrigades].sort((a, b) => {
      const valA = metric === 'dpu' ? a.dpu : a.count;
      const valB = metric === 'dpu' ? b.dpu : b.count;
      return valB - valA;
    });
    return sorted.slice(0, 3);
  }, [topBrigades, metric]);

  // Для каждой бригады отбираем топ 5 MPP по метрике
  const topMppsByBrigade = (brigade) => {
    const mpps = [...brigade.mpps].sort((a, b) => {
      const valA = metric === 'dpu' ? a.dpu : a.count;
      const valB = metric === 'dpu' ? b.dpu : b.count;
      return valB - valA;
    });
    return mpps.slice(0, 5);
  };

  // Форматирование DPU с двумя знаками после запятой
  const formatDpu = (value) => {
    return Number(value).toFixed(2);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 15 }}>
      {/* Фильтры */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#F8FAFC',
        borderRadius: BRAND.radius,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Начало:
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Конец:
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Чекпоинты:
          <MultiSelect
            options={['ALL', ...availableCheckpoints]}
            selected={selectedCheckpoints}
            onChange={setSelectedCheckpoints}
            placeholder="Все"
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Тип дефекта:
          <select value={defectType} onChange={(e) => setDefectType(e.target.value)} style={inputStyle}>
            <option value="all">Все</option>
            <option value="offline">Offline</option>
            <option value="online">Online</option>
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => setMetric('count')}
            style={{
              ...buttonStyle,
              background: metric === 'count' ? BRAND.primary : '#E5E7EB',
              color: metric === 'count' ? '#FFFFFF' : '#374151',
            }}
          >
            Шт
          </button>
          <button
            onClick={() => setMetric('dpu')}
            style={{
              ...buttonStyle,
              background: metric === 'dpu' ? BRAND.primary : '#E5E7EB',
              color: metric === 'dpu' ? '#FFFFFF' : '#374151',
            }}
          >
            DPU per 1000
          </button>
        </div>
      </div>

      {/* Контейнер для гистограммы и таблицы */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, gap: 15 }}>
        {/* Гистограмма */}
        <div style={{ ...cardStyle, flex: 7 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: BRAND.text, marginBottom: '10px' }}>
            Дефекты по бригадам {metric === 'dpu' ? '(DPU per 1000)' : '(шт)'}
          </h2>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', fontSize: '1.5rem' }}>Загрузка...</div>
            ) : histogramData.length > 0 ? (
              <div style={{ height: Math.max(400, histogramData.length * 45) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={histogramData}
                    layout="vertical"
                    margin={{ top: 20, right: 70, left: 40, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 'dataMax']} tick={{ fontSize: 13 }} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 13 }} width={160} />
                    <Tooltip contentStyle={{ fontSize: '1.2rem' }}
                      formatter={(value) => metric === 'dpu' ? formatDpu(value) : value}
                    />
                    <Bar dataKey="value" fill={BRAND.primary} barSize={32}>
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(value) => metric === 'dpu' ? formatDpu(value) : value}
                        style={{ fontSize: '1.1rem', fontWeight: 700, fill: BRAND.text }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '30px', color: BRAND.textSecondary, fontSize: '1.3rem' }}>
                Нет данных
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px', justifyContent: 'center', fontSize: '1.1rem' }}>
            <div>Всего авто: <b>{totalCars}</b></div>
            <div>Всего дефектов: <b>{totalDefects}</b></div>
            <div>Дефектов без владельца: <b>{unassignedCount}</b></div>
          </div>
        </div>

        {/* Правая колонка: таблица топ бригад */}
        <div style={{ ...cardStyle, flex: 3, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: BRAND.text, marginBottom: '10px', flexShrink: 0 }}>
            Топ 3 бригады по {metric === 'dpu' ? 'DPU' : 'количеству'}
          </h2>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '10px' }}>Загрузка...</p>
            ) : top3Brigades.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Бригада / Дефект (MPP)</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>{metric === 'dpu' ? 'DPU' : 'Шт'}</th>
                  </tr>
                </thead>
                <tbody>
                  {top3Brigades.map((brigade) => {
                    const totalValue = metric === 'dpu' ? formatDpu(brigade.dpu) : brigade.count;
                    const mpps = topMppsByBrigade(brigade);
                    return (
                      <React.Fragment key={brigade.brigade}>
                        <tr style={{ backgroundColor: '#F0F5FF', fontWeight: 700 }}>
                          <td style={{ ...tdStyle, fontWeight: 700, color: BRAND.primary }}>
                            {brigade.brigade}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'center', color: BRAND.primary }}>
                            {totalValue}
                          </td>
                        </tr>
                        {mpps.map((mpp, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                            <td style={{ ...tdStyle, paddingLeft: '30px' }}>
                              {mpp.model} {mpp.part_name} {mpp.problem_type}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              {metric === 'dpu' ? formatDpu(mpp.dpu) : mpp.count}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', padding: '10px', color: BRAND.textSecondary }}>
                Нет данных
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== ОТЧЕТ ПО БРИГАДАМ (ТРЕНДЫ) ===================== */
function BrigadeTrendReport({ brigades, password, executeWithPassword }) {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(today.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [selectedCheckpoints, setSelectedCheckpoints] = useState([]);
  const [defectType, setDefectType] = useState('all');
  const [selectedBrigades, setSelectedBrigades] = useState([]);
  const [metric, setMetric] = useState('count'); // 'count' | 'dpu'
  const [trendData, setTrendData] = useState({ month: [], week: [], day: [] });
  const [loading, setLoading] = useState(false);

  const availableCheckpoints = ['CP7', 'CP8', 'PIP', 'TL'];

  const loadTrend = async () => {
    setLoading(true);
    try {
      const allCheckpointsSelected = selectedCheckpoints.length === 0 || selectedCheckpoints.length === availableCheckpoints.length;
      const checkpointParam = allCheckpointsSelected ? 'ALL' : selectedCheckpoints.join(',');

      const allBrigadesSelected = selectedBrigades.length === 0 || selectedBrigades.length === brigades.length;
      const brigadesParam = allBrigadesSelected ? 'ALL' : selectedBrigades.join(',');

      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        checkpoint: checkpointParam,
        defectType,
        brigades: brigadesParam,
        metric,
      });

      const res = await fetch(`${API_BASE}/api/brigade-report/trend?${params}`);
      if (!res.ok) throw new Error('Ошибка загрузки трендов');
      const data = await res.json();
      setTrendData(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadTrend();
    }
  }, [dateFrom, dateTo, selectedCheckpoints, selectedBrigades, defectType, metric]);

  // Функция для отображения значения с учётом метрики
  const formatValue = (value) => {
    return metric === 'dpu' ? Number(value).toFixed(2) : value;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 15 }}>
      {/* Фильтры */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#F8FAFC',
        borderRadius: BRAND.radius,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Начало:
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Конец:
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Чекпоинты:
          <MultiSelect
            options={['ALL', ...availableCheckpoints]}
            selected={selectedCheckpoints}
            onChange={setSelectedCheckpoints}
            placeholder="Все"
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Тип дефекта:
          <select value={defectType} onChange={(e) => setDefectType(e.target.value)} style={inputStyle}>
            <option value="all">Все</option>
            <option value="offline">Offline</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Бригады:
          <MultiSelect
            options={['ALL', ...brigades.map(b => b.name)]}
            selected={selectedBrigades}
            onChange={setSelectedBrigades}
            placeholder="Все"
          />
        </label>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => setMetric('count')}
            style={{
              ...buttonStyle,
              background: metric === 'count' ? BRAND.primary : '#E5E7EB',
              color: metric === 'count' ? '#FFFFFF' : '#374151',
            }}
          >
            Шт
          </button>
          <button
            onClick={() => setMetric('dpu')}
            style={{
              ...buttonStyle,
              background: metric === 'dpu' ? BRAND.primary : '#E5E7EB',
              color: metric === 'dpu' ? '#FFFFFF' : '#374151',
            }}
          >
            DPU per 1000
          </button>
        </div>
      </div>

      {/* Графики */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', fontSize: '1.5rem' }}>Загрузка...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, gap: 20, flexWrap: 'wrap' }}>
          {/* Месяцы */}
          <div style={{ flex: '1 1 300px', backgroundColor: '#FFFFFF', borderRadius: BRAND.radius, padding: 20, boxShadow: BRAND.shadow }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 10 }}>Последние 3 месяца</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData.month || []} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(value) => formatValue(value)} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4,4,0,0]}>
                  <LabelList dataKey="value" position="top" formatter={(value) => formatValue(value)} style={{ fontSize: 12, fill: BRAND.text }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Недели */}
          <div style={{ flex: '1 1 300px', backgroundColor: '#FFFFFF', borderRadius: BRAND.radius, padding: 20, boxShadow: BRAND.shadow }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 10 }}>Последние 4 недели</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData.week || []} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(value) => formatValue(value)} />
                <Bar dataKey="value" fill="#F59E0B" radius={[4,4,0,0]}>
                  <LabelList dataKey="value" position="top" formatter={(value) => formatValue(value)} style={{ fontSize: 12, fill: BRAND.text }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Дни */}
          <div style={{ flex: '2 1 400px', backgroundColor: '#FFFFFF', borderRadius: BRAND.radius, padding: 20, boxShadow: BRAND.shadow }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 10 }}>Последние 14 дней</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData.day || []} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(value) => formatValue(value)} />
                <Bar dataKey="value" fill="#10B981" radius={[4,4,0,0]}>
                  <LabelList dataKey="value" position="top" formatter={(value) => formatValue(value)} style={{ fontSize: 12, fill: BRAND.text }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== НАЗНАЧЕНИЕ БРИГАД ===================== */
function AssignBrigadesPanel({ brigades, password, executeWithPassword, refreshTrigger }) {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(today.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [selectedCheckpoints, setSelectedCheckpoints] = useState([]);
  const [defectType, setDefectType] = useState('all');
  const [unassignedDefects, setUnassignedDefects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rowBrigades, setRowBrigades] = useState({});

  const availableCheckpoints = ['CP7', 'CP8', 'PIP', 'TL'];

  const loadUnassigned = async () => {
    setLoading(true);
    try {
      const allSelected = selectedCheckpoints.length === 0 || selectedCheckpoints.length === availableCheckpoints.length;
      const checkpointParam = allSelected ? 'ALL' : selectedCheckpoints.join(',');
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        checkpoint: checkpointParam,
        defectType,
      });
      const res = await fetch(`${API_BASE}/api/brigade-report/unassigned-defects?${params}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const data = await res.json();
      setUnassignedDefects(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnassigned();
  }, [dateFrom, dateTo, selectedCheckpoints, defectType, refreshTrigger]);

  const handleAssign = (defect) => {
    const key = `${defect.model}|${defect.part_name}|${defect.problem_type}`;
    const brigadeName = rowBrigades[key] || '';
    if (!brigadeName) {
      alert('Выберите бригаду из списка');
      return;
    }
    executeWithPassword(async (pwd) => {
      try {
        const res = await fetch(`${API_BASE}/api/brigade-report/assign-owner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: defect.model,
            part_name: defect.part_name,
            problem_type: defect.problem_type,
            brigadeName,
            password: pwd,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Ошибка назначения');
        }
        loadUnassigned();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 15 }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#F8FAFC',
        borderRadius: BRAND.radius,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Начало:
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Конец:
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Чекпоинты:
          <MultiSelect
            options={['ALL', ...availableCheckpoints]}
            selected={selectedCheckpoints}
            onChange={setSelectedCheckpoints}
            placeholder="Все"
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Тип дефекта:
          <select value={defectType} onChange={(e) => setDefectType(e.target.value)} style={inputStyle}>
            <option value="all">Все</option>
            <option value="offline">Offline</option>
            <option value="online">Online</option>
          </select>
        </label>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: BRAND.text, marginBottom: '10px' }}>
          Дефекты без владельца
        </h2>
        <p style={{ fontSize: '0.9rem', color: BRAND.textSecondary, marginTop: 0, marginBottom: 10 }}>
          Выберите бригаду для каждого дефекта и нажмите «Назначить».
        </p>
        <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${BRAND.border}`, borderRadius: BRAND.radiusSmall }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px', fontSize: '1.2rem' }}>Загрузка...</p>
          ) : unassignedDefects.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Модель</th>
                  <th style={thStyle}>Деталь</th>
                  <th style={thStyle}>Дефект</th>
                  <th style={thStyle}>Кол-во</th>
                  <th style={thStyle}>Бригада</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {unassignedDefects.map((defect, idx) => {
                  const key = `${defect.model}|${defect.part_name}|${defect.problem_type}`;
                  const selectedBrigade = rowBrigades[key] || '';
                  return (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={tdStyle}>{defect.model}</td>
                      <td style={tdStyle}>{defect.part_name}</td>
                      <td style={tdStyle}>{defect.problem_type}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{defect.count}</td>
                      <td style={tdStyle}>
                        <select
                          value={selectedBrigade}
                          onChange={(e) => setRowBrigades(prev => ({ ...prev, [key]: e.target.value }))}
                          style={{ width: '100%', maxWidth: '200px', padding: '6px', fontSize: '0.9rem', borderRadius: BRAND.radiusSmall, border: `1px solid ${BRAND.border}` }}
                        >
                          <option value="">Выберите...</option>
                          {brigades.filter(b => b.name !== 'Бригада не найдена').map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleAssign(defect)}
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            background: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: BRAND.radiusSmall,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Назначить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', padding: '30px', color: BRAND.textSecondary, fontSize: '1.2rem' }}>
              Все дефекты имеют владельца 🎉
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== СПРАВОЧНИК ===================== */
function DictionaryPanel({ 
  dictionaryData, 
  models, 
  brigades, 
  password, 
  executeWithPassword, 
  onDataChanged, 
  manageUnlocked,
  onRequestBrigadePassword 
}) {
  const [filterModel, setFilterModel] = useState('ALL');
  const [filterBrigade, setFilterBrigade] = useState('ALL');
  const [search, setSearch] = useState('');
  const [newEntry, setNewEntry] = useState({ model: '', part_name: '', problem_type: '', brigadeName: '' });
  const [editEntry, setEditEntry] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMethod, setImportMethod] = useState('text');
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importPasswordModal, setImportPasswordModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [activeSection, setActiveSection] = useState('defects');
  const [newBrigadeName, setNewBrigadeName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Фильтрация с мемоизацией
  const filteredDictionary = useMemo(() => {
    return dictionaryData.filter(entry => {
      const matchModel = filterModel === 'ALL' || entry.model === filterModel;
      const matchBrigade = filterBrigade === 'ALL' || entry.brigade_name === filterBrigade;
      const searchLower = search.toLowerCase();
      const matchSearch = !search || entry.part_name.toLowerCase().includes(searchLower) || entry.problem_type.toLowerCase().includes(searchLower) || entry.model.toLowerCase().includes(searchLower);
      return matchModel && matchBrigade && matchSearch;
    });
  }, [dictionaryData, filterModel, filterBrigade, search]);

  const brigadeOptions = useMemo(() => {
    const set = new Set(dictionaryData.map(e => e.brigade_name).filter(Boolean));
    return Array.from(set).sort();
  }, [dictionaryData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterModel, filterBrigade, search]);

  const pageCount = Math.ceil(filteredDictionary.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleEntries = filteredDictionary.slice(startIndex, endIndex);

  const handleSaveEntry = (entry) => {
    executeWithPassword(async (pwd) => {
      try {
        const res = await fetch(`${API_BASE}/api/brigade-report/dictionary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: entry.model,
            part_name: entry.part_name,
            problem_type: entry.problem_type,
            brigadeName: entry.brigadeName,
            password: pwd,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Ошибка сохранения');
        }
        onDataChanged();
        setNewEntry({ model: '', part_name: '', problem_type: '', brigadeName: '' });
        setEditEntry(null);
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const handleDeleteEntry = (id) => {
    executeWithPassword(async (pwd) => {
      try {
        const res = await fetch(`${API_BASE}/api/brigade-report/dictionary/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Ошибка удаления');
        }
        onDataChanged();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const handleAddBrigade = () => {
    const name = newBrigadeName.trim();
    if (!name) {
      alert('Введите название бригады');
      return;
    }
    executeWithPassword(async (pwd) => {
      try {
        const res = await fetch(`${API_BASE}/api/brigade-report/brigades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, password: pwd }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Ошибка добавления');
        }
        setNewBrigadeName('');
        onDataChanged();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const handleDeleteBrigade = (id, name) => {
    if (!window.confirm(`Удалить бригаду "${name}"? Все связанные дефекты будут назначены "Бригада не найдена".`)) {
      return;
    }
    executeWithPassword(async (pwd) => {
      try {
        const res = await fetch(`${API_BASE}/api/brigade-report/brigades/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Ошибка удаления');
        }
        onDataChanged();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const executeImport = (entries) => {
    if (entries.length === 0) {
      alert('Нет данных для импорта');
      return;
    }
    fetch(`${API_BASE}/api/brigade-report/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, password: '4002' }),
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error || 'Ошибка импорта'); });
        return res.json();
      })
      .then(() => {
        alert(`Импортировано ${entries.length} записей`);
        setShowImportModal(false);
        setImportText('');
        setImportFile(null);
        onDataChanged();
      })
      .catch(err => alert(err.message));
  };

  const handleImportFromText = () => {
    const lines = importText.split('\n').filter(line => line.trim());
    const entries = lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 4) {
        return {
          model: parts[0].trim(),
          part_name: parts[1].trim(),
          problem_type: parts[2].trim(),
          brigadeName: parts[3].trim(),
        };
      }
      return null;
    }).filter(e => e && e.model && e.part_name && e.problem_type && e.brigadeName);
    executeImport(entries);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const entries = json.slice(1).map(row => ({
          model: row[0]?.trim(),
          part_name: row[1]?.trim(),
          problem_type: row[2]?.trim(),
          brigadeName: row[3]?.trim(),
        })).filter(e => e.model && e.part_name && e.problem_type && e.brigadeName);
        executeImport(entries);
      } catch (err) {
        alert('Ошибка чтения файла');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportExcel = () => {
    if (filteredDictionary.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }
    const exportData = filteredDictionary.map(entry => ({
      'Модель': entry.model,
      'Деталь': entry.part_name,
      'Дефект': entry.problem_type,
      'Бригада': entry.brigade_name || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Справочник');
    XLSX.writeFile(wb, `Справочник_дефектов_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 15 }}>
      {/* Вложенные вкладки */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setActiveSection('defects')}
          style={subTabStyle(activeSection === 'defects')}
        >
          🔧 Дефекты
        </button>
        <button
          onClick={() => {
            if (!manageUnlocked) {
              onRequestBrigadePassword();
            } else {
              setActiveSection('brigades');
            }
          }}
          style={subTabStyle(activeSection === 'brigades')}
        >
          👷 Управление бригадами
        </button>
      </div>

      {activeSection === 'defects' ? (
        <>
          {/* Блок фильтрации и поиска */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            padding: '15px',
            backgroundColor: '#FFFFFF',
            borderRadius: BRAND.radius,
            border: `1px solid ${BRAND.border}`,
          }}>
            <span style={{ fontWeight: 600, color: BRAND.textSecondary, fontSize: '1rem' }}>Фильтры и поиск:</span>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              style={{ ...inputStyle, minWidth: '150px' }}
            >
              <option value="ALL">Все модели</option>
              {models.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
            <select
              value={filterBrigade}
              onChange={(e) => setFilterBrigade(e.target.value)}
              style={{ ...inputStyle, minWidth: '180px' }}
            >
              <option value="ALL">Все бригады</option>
              {brigadeOptions.map(brigade => <option key={brigade} value={brigade}>{brigade}</option>)}
            </select>
            <input
              type="text"
              placeholder="Поиск по детали, дефекту, модели"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px', ...inputStyle }}
            />
            <button
              onClick={() => setImportPasswordModal(true)}
              style={{ ...buttonStyle, background: '#8B5CF6' }}
            >
              📥 Импорт
            </button>
            <button
              onClick={handleExportExcel}
              style={{ ...buttonStyle, background: '#059669' }}
            >
              📊 Экспорт
            </button>
          </div>

          {/* Блок добавления новой записи */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            padding: '15px',
            backgroundColor: '#FFFFFF',
            borderRadius: BRAND.radius,
            border: `1px solid ${BRAND.border}`,
          }}>
            <span style={{ fontWeight: 600, color: BRAND.textSecondary, fontSize: '1rem' }}>Новая связка дефект-бригада:</span>
            <select
              value={newEntry.model}
              onChange={(e) => setNewEntry({ ...newEntry, model: e.target.value })}
              style={{ ...inputStyle, minWidth: '150px' }}
            >
              <option value="">Модель</option>
              {models.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
            <input
              type="text"
              placeholder="Деталь"
              value={newEntry.part_name}
              onChange={(e) => setNewEntry({ ...newEntry, part_name: e.target.value })}
              style={{ ...inputStyle, flex: 1, minWidth: '150px' }}
            />
            <input
              type="text"
              placeholder="Дефект"
              value={newEntry.problem_type}
              onChange={(e) => setNewEntry({ ...newEntry, problem_type: e.target.value })}
              style={{ ...inputStyle, flex: 1, minWidth: '150px' }}
            />
            <select
              value={newEntry.brigadeName}
              onChange={(e) => setNewEntry({ ...newEntry, brigadeName: e.target.value })}
              style={{ ...inputStyle, minWidth: '150px' }}
            >
              <option value="">Бригада</option>
              {brigades.filter(b => b.name !== 'Бригада не найдена').map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
            <button
              onClick={() => handleSaveEntry(newEntry)}
              style={{ ...buttonStyle, background: BRAND.primary }}
            >
              Добавить
            </button>
          </div>

          {/* Таблица словаря */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: BRAND.text, marginBottom: '10px', flexShrink: 0 }}>
              Справочник дефектов и бригад
            </h2>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: `1px solid ${BRAND.border}`, borderRadius: BRAND.radiusSmall }}>
              {visibleEntries.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Модель</th>
                      <th style={thStyle}>Деталь</th>
                      <th style={thStyle}>Дефект</th>
                      <th style={thStyle}>Бригада</th>
                      <th style={thStyle}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEntries.map(entry => (
                      <tr key={entry.id} style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                        <td style={tdStyle}>{entry.model}</td>
                        <td style={tdStyle}>{entry.part_name}</td>
                        <td style={tdStyle}>{entry.problem_type}</td>
                        <td style={tdStyle}>
                          {editEntry && editEntry.id === entry.id ? (
                            <select
                              value={editEntry.brigadeName}
                              onChange={(e) => setEditEntry({ ...editEntry, brigadeName: e.target.value })}
                              style={{ padding: '5px', fontSize: '0.9rem', borderRadius: BRAND.radiusSmall, border: `1px solid ${BRAND.border}` }}
                            >
                              {brigades.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                          ) : (
                            entry.brigade_name || '—'
                          )}
                        </td>
                        <td style={tdStyle}>
                          {editEntry && editEntry.id === entry.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEntry(editEntry)}
                                style={{ marginRight: 5, padding: '5px 10px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                Сохранить
                              </button>
                              <button
                                onClick={() => setEditEntry(null)}
                                style={{ padding: '5px 10px', background: '#6B7280', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                Отмена
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditEntry({ id: entry.id, model: entry.model, part_name: entry.part_name, problem_type: entry.problem_type, brigadeName: entry.brigade_name })}
                                style={{ marginRight: 5, padding: '5px 10px', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                Изменить
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                style={{ padding: '5px 10px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                Удалить
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#F0F5FF', fontWeight: 700 }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>Итого:</td>
                      <td style={{ ...tdStyle }} colSpan={3}></td>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'center' }}>{filteredDictionary.length}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p style={{ textAlign: 'center', padding: '30px', color: BRAND.textSecondary, fontSize: '1.2rem' }}>
                  Нет записей
                </p>
              )}
            </div>

            {/* Пагинация */}
            {pageCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ ...buttonStyle, background: currentPage === 1 ? '#CBD5E1' : BRAND.primary }}
                >
                  ←
                </button>
                <span style={{ fontSize: '1rem' }}>
                  Страница {currentPage} из {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pageCount, prev + 1))}
                  disabled={currentPage === pageCount}
                  style={{ ...buttonStyle, background: currentPage === pageCount ? '#CBD5E1' : BRAND.primary }}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Вкладка управления бригадами */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 15 }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            padding: '15px',
            backgroundColor: '#FFFFFF',
            borderRadius: BRAND.radius,
            border: `1px solid ${BRAND.border}`,
          }}>
            <span style={{ fontWeight: 600, color: BRAND.textSecondary, fontSize: '1rem' }}>Добавить бригаду:</span>
            <input
              type="text"
              placeholder="Название бригады"
              value={newBrigadeName}
              onChange={(e) => setNewBrigadeName(e.target.value)}
              style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
            />
            <button
              onClick={handleAddBrigade}
              style={{ ...buttonStyle, background: '#10B981' }}
            >
              Добавить
            </button>
          </div>

          <div style={{ ...cardStyle, flex: 1 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: BRAND.text, marginBottom: '10px' }}>Список бригад</h2>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: `1px solid ${BRAND.border}`, borderRadius: BRAND.radiusSmall }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Название</th>
                    <th style={thStyle}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {brigades.map(brigade => (
                    <tr key={brigade.id} style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                      <td style={tdStyle}>{brigade.id}</td>
                      <td style={tdStyle}>{brigade.name}</td>
                      <td style={tdStyle}>
                        {brigade.name !== 'Бригада не найдена' && (
                          <button
                            onClick={() => handleDeleteBrigade(brigade.id, brigade.name)}
                            style={{ padding: '5px 10px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: '0.9rem' }}
                          >
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Модальные окна импорта и пароля для импорта */}
      {importPasswordModal && (
        <PasswordModal
          isOpen={importPasswordModal}
          onClose={() => setImportPasswordModal(false)}
          onSubmit={(pwd) => {
            if (pwd === '4002') {
              setImportPasswordModal(false);
              setShowImportModal(true);
              setImportError('');
            } else {
              setImportError('Неверный пароль');
            }
          }}
          error={importError}
          title="Пароль для импорта"
          subtitle="Введите специальный пароль для импорта справочника"
        />
      )}

      {showImportModal && (
        <div style={modalOverlayStyle} onClick={() => setShowImportModal(false)}>
          <div style={wideModalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.8rem', fontWeight: 700 }}>Импорт справочника</h2>
            <p style={{ fontSize: '0.9rem', color: BRAND.textSecondary, marginBottom: 15 }}>
              Выберите способ импорта: загрузите файл Excel или вставьте текст.
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
              <button
                onClick={() => setImportMethod('text')}
                style={{ ...buttonStyle, background: importMethod === 'text' ? BRAND.primary : '#E2E8F0', color: importMethod === 'text' ? '#FFF' : '#374151' }}
              >
                Вставить текст
              </button>
              <button
                onClick={() => setImportMethod('file')}
                style={{ ...buttonStyle, background: importMethod === 'file' ? BRAND.primary : '#E2E8F0', color: importMethod === 'file' ? '#FFF' : '#374151' }}
              >
                Загрузить файл
              </button>
            </div>

            {importMethod === 'text' ? (
              <>
                <p style={{ fontSize: '0.85rem', color: BRAND.textSecondary }}>
                  Каждая строка: <b>Модель[Tab]Деталь[Tab]Дефект[Tab]Бригада</b><br/>
                  Пример: <code>JELAND J6[Tab]Бампер[Tab]Повреждение[Tab]EG/SUB</code>
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  style={{ width: '100%', height: '250px', fontSize: '0.9rem', padding: '10px', borderRadius: BRAND.radiusSmall, border: `1px solid ${BRAND.border}`, fontFamily: 'monospace' }}
                  placeholder={'JELAND J6\tБампер\tПовреждение\tEG/SUB\nJELAND J7\tДверь\tВмятина\tBS Final Line'}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15, gap: 10 }}>
                  <button onClick={() => setShowImportModal(false)} style={{ ...buttonStyle, background: '#6B7280' }}>Отмена</button>
                  <button onClick={handleImportFromText} style={{ ...buttonStyle, background: '#8B5CF6' }}>Импортировать</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: BRAND.textSecondary }}>
                  Файл Excel должен иметь столбцы: <b>Модель, Деталь, Дефект, Бригада</b> (первая строка — заголовки).
                </p>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  style={{ fontSize: '0.9rem', marginBottom: 15 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setShowImportModal(false)} style={{ ...buttonStyle, background: '#6B7280' }}>Отмена</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== ВКЛАДКА ВЛАДЕЛЬЦЫ ДЕФЕКТОВ ===================== */
function DefectOwnersManager({ brigades, password, executeWithPassword }) {
  const [subTab, setSubTab] = useState('assign');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const [dictionaryData, setDictionaryData] = useState([]);
  const [models, setModels] = useState([]);
  const [brigadeList, setBrigadeList] = useState(brigades);
  const [brigadeManageUnlocked, setBrigadeManageUnlocked] = useState(
    sessionStorage.getItem('brigade_manage_unlocked') === 'true'
  );
  const [showBrigadePasswordModal, setShowBrigadePasswordModal] = useState(false);
  const [brigadePasswordError, setBrigadePasswordError] = useState('');

  const loadDictionary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brigade-report/dictionary`);
      if (res.ok) {
        const data = await res.json();
        setDictionaryData(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки словаря', err);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brigade-report/models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки моделей', err);
    }
  };

  const loadBrigades = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brigade-report/brigades`);
      if (res.ok) {
        const data = await res.json();
        setBrigadeList(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки бригад', err);
    }
  };

  useEffect(() => {
    loadDictionary();
    loadModels();
    loadBrigades();
  }, []);

  useEffect(() => {
    setBrigadeList(brigades);
  }, [brigades]);

  const handleRefresh = () => {
    loadDictionary();
    loadModels();
    loadBrigades();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBrigadePasswordSubmit = (pwd) => {
    if (pwd === '4002') {
      sessionStorage.setItem('brigade_manage_unlocked', 'true');
      setBrigadeManageUnlocked(true);
      setShowBrigadePasswordModal(false);
      setBrigadePasswordError('');
    } else {
      setBrigadePasswordError('Неверный пароль');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 15, alignItems: 'center' }}>
        <button
          onClick={() => setSubTab('assign')}
          style={subTabStyle(subTab === 'assign')}
        >
          🎯 Назначение бригад
        </button>
        <button
          onClick={() => setSubTab('dictionary')}
          style={subTabStyle(subTab === 'dictionary')}
        >
          📚 Справочник
        </button>
        <button
          onClick={() => setShowHelp(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `2px solid ${BRAND.primary}`,
            background: '#FFFFFF',
            color: BRAND.primary,
            fontSize: '1.2rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Помощь"
        >
          ?
        </button>
      </div>

      {subTab === 'assign' ? (
        <AssignBrigadesPanel
          brigades={brigadeList}
          password={password}
          executeWithPassword={executeWithPassword}
          refreshTrigger={refreshTrigger}
        />
      ) : (
        <DictionaryPanel
          dictionaryData={dictionaryData}
          models={models}
          brigades={brigadeList}
          password={password}
          executeWithPassword={executeWithPassword}
          onDataChanged={handleRefresh}
          manageUnlocked={brigadeManageUnlocked}
          onRequestBrigadePassword={() => setShowBrigadePasswordModal(true)}
        />
      )}

      {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}

      {showBrigadePasswordModal && (
        <PasswordModal
          isOpen={showBrigadePasswordModal}
          onClose={() => setShowBrigadePasswordModal(false)}
          onSubmit={handleBrigadePasswordSubmit}
          error={brigadePasswordError}
          title="Введите пароль"
          subtitle="Для доступа к управлению бригадами"
        />
      )}
    </div>
  );
}

/* ===================== ГЛАВНЫЙ КОМПОНЕНТ СТРАНИЦЫ ===================== */
export default function BrigadeReportPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [brigades, setBrigades] = useState([]);
  const [password, setPassword] = useState(sessionStorage.getItem('brigade_password') || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [passwordVerified, setPasswordVerified] = useState(!!password);

  const loadBrigades = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brigade-report/brigades`);
      if (!res.ok) throw new Error('Ошибка загрузки бригад');
      const data = await res.json();
      setBrigades(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBrigades();
  }, []);

  const executeWithPassword = (action) => {
    if (password) {
      action(password);
    } else {
      setPendingAction(() => action);
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = (pwd) => {
    if (pwd === '1234561') {
      sessionStorage.setItem('brigade_password', pwd);
      setPassword(pwd);
      setPasswordVerified(true);
      setShowPasswordModal(false);
      if (pendingAction) {
        pendingAction(pwd);
        setPendingAction(null);
      }
      setPasswordError('');
    } else {
      setPasswordError('Неверный пароль');
    }
  };

  const handleTabChange = (tab) => {
    if (tab === 'owners' && !password) {
      setPendingAction(() => (pwd) => {
        setPassword(pwd);
        setPasswordVerified(true);
        setActiveTab('owners');
      });
      setShowPasswordModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Бригадный отчет</h1>
        <div style={tabBarStyle}>
          <button
            style={tabStyle(activeTab === 'general')}
            onClick={() => handleTabChange('general')}
          >
            📊 Общий отчет
          </button>
          <button
            style={tabStyle(activeTab === 'brigade')}
            onClick={() => handleTabChange('brigade')}
          >
            📊 Отчет по бригадам
          </button>
          <button
            style={tabStyle(activeTab === 'owners')}
            onClick={() => handleTabChange('owners')}
          >
            👥 Владельцы дефектов
          </button>
        </div>
      </div>

      {activeTab === 'general' ? (
        <BrigadeReport
          brigades={brigades}
          password={password}
          executeWithPassword={executeWithPassword}
        />
      ) : activeTab === 'brigade' ? (
        <BrigadeTrendReport
          brigades={brigades}
          password={password}
          executeWithPassword={executeWithPassword}
        />
      ) : (
        <DefectOwnersManager
          brigades={brigades}
          password={password}
          executeWithPassword={executeWithPassword}
        />
      )}

      {showPasswordModal && (
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handlePasswordSubmit}
          error={passwordError}
          title="Введите пароль"
          subtitle="Для доступа к вкладке «Владельцы дефектов»"
        />
      )}
    </div>
  );
}