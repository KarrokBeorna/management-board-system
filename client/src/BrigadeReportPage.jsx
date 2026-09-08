import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const API_BASE = '';

// ====== Стили (аналогично DrrCp7DashboardPage, сокращённо) ======
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
  flexWrap: 'wrap',
  gap: '10px',
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
  flexWrap: 'wrap',
};

const filterButtonStyle = (active) => ({
  padding: '12px 24px',
  borderRadius: '12px',
  border: 'none',
  fontWeight: 700,
  fontSize: '1.4rem',
  background: active ? '#2563EB' : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.2s',
});

const timeFilterButtonStyle = (active, activeColor) => ({
  ...filterButtonStyle(active),
  background: active ? activeColor : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
});

const metricButtonStyle = (active) => ({
  ...filterButtonStyle(active),
  background: active ? '#10B981' : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
});

const thStyle = {
  padding: '18px 24px',
  textAlign: 'left',
  fontWeight: 800,
  color: '#FFFFFF',
  background: '#2563EB',
  fontSize: '1.6rem',
  textTransform: 'uppercase',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const tdStyle = {
  padding: '14px 24px',
  borderBottom: '1px solid #F1F5F9',
  color: '#1E293B',
  fontSize: '1.6rem',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const modalContentStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  width: '90%',
  maxWidth: 800,
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
};

// Компонент вкладки "Отчет по бригадам"
function BrigadeReport({ brigades, password, executeWithPassword }) {
  const [timeFilter, setTimeFilter] = useState('all');
  const [metric, setMetric] = useState('count');
  const [histogramData, setHistogramData] = useState([]);
  const [topDefects, setTopDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowBrigades, setRowBrigades] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ timeFilter, metric });
      const res = await fetch(`${API_BASE}/api/brigade-report/data?${params}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных');
      const data = await res.json();
      setHistogramData(data.histogram);
      setTopDefects(data.topDefectsWithoutOwner);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter, metric]);

  const handleAssign = (defect) => {
    const key = `${defect.model}|${defect.part_name}|${defect.problem_type}`;
    const brigadeName = rowBrigades[key] || '';
    if (!brigadeName) {
      alert('Выберите бригаду');
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
        loadData();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const renderDefectRow = (defect, idx) => {
    const key = `${defect.model}|${defect.part_name}|${defect.problem_type}`;
    const selectedBrigade = rowBrigades[key] || '';
    return (
      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
        <td style={tdStyle}>{defect.mpp}</td>
        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, fontSize: '2rem' }}>{defect.count}</td>
        <td style={tdStyle}>
          <select
            value={selectedBrigade}
            onChange={(e) => setRowBrigades(prev => ({ ...prev, [key]: e.target.value }))}
            style={{ fontSize: '1.4rem', padding: '8px', borderRadius: '8px', maxWidth: '200px' }}
          >
            <option value="">Выбрать</option>
            {brigades.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
          <button
            onClick={() => handleAssign(defect)}
            style={{
              marginLeft: '10px',
              padding: '8px 16px',
              fontSize: '1.2rem',
              background: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </td>
      </tr>
    );
  };

  if (loading) {
    return <div style={{ fontSize: '2.5rem', textAlign: 'center', marginTop: '50px' }}>Загрузка данных...</div>;
  }
  if (error) {
    return <div style={{ fontSize: '2.5rem', textAlign: 'center', marginTop: '50px', color: '#DC2626' }}>❌ {error}</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
      {/* Левая колонка: гистограмма */}
      <div style={{ flex: '0 0 40%', backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '20px' }}>
          {metric === 'dpu' ? 'DPU per 1000' : 'Количество дефектов'}
        </h2>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={histogramData}
              layout="vertical"
              margin={{ top: 20, right: 50, left: 40, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, metric === 'dpu' ? 10 : 'dataMax']} tick={{ fontSize: 14 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 16 }} width={200} />
              <Tooltip contentStyle={{ fontSize: '1.5rem' }} />
              <Bar dataKey="value" fill="#2563EB" barSize={40}>
                <LabelList dataKey="value" position="right" style={{ fontSize: '1.4rem', fontWeight: 700, fill: '#1E293B' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Правая колонка: таблица */}
      <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>
          Дефекты без владельца
        </h2>
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          {topDefects.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Дефект</th>
                  <th style={thStyle}>К-во</th>
                  <th style={thStyle}>Бригада</th>
                </tr>
              </thead>
              <tbody>
                {topDefects.map((defect, idx) => renderDefectRow(defect, idx))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '2rem' }}>
              Все дефекты имеют владельца
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Компонент вкладки "Владельцы дефектов"
function DefectOwnersManager({ brigades, password, executeWithPassword }) {
  const [dictionaryData, setDictionaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [filterModel, setFilterModel] = useState('ALL');
  const [search, setSearch] = useState('');
  const [newEntry, setNewEntry] = useState({ model: '', part_name: '', problem_type: '', brigadeName: '' });
  const [editEntry, setEditEntry] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const loadDictionary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/brigade-report/dictionary`);
      if (!res.ok) throw new Error('Ошибка загрузки справочника');
      const data = await res.json();
      setDictionaryData(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brigade-report/models`);
      if (!res.ok) throw new Error('Ошибка загрузки моделей');
      const data = await res.json();
      setModels(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDictionary();
    loadModels();
  }, []);

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
        loadDictionary();
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
        loadDictionary();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const handleAssignAllModels = () => {
    if (!newEntry.part_name || !newEntry.problem_type || !newEntry.brigadeName) {
      alert('Заполните деталь, дефект и бригаду');
      return;
    }
    executeWithPassword(async (pwd) => {
      try {
        const res = await fetch(`${API_BASE}/api/brigade-report/assign-all-models`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            part_name: newEntry.part_name,
            problem_type: newEntry.problem_type,
            brigadeName: newEntry.brigadeName,
            password: pwd,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Ошибка назначения');
        }
        alert('Назначено на все модели');
        loadDictionary();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  const handleImport = () => {
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
    }).filter(Boolean);

    if (entries.length === 0) {
      alert('Нет корректных строк');
      return;
    }

    executeWithPassword(async (pwd) => {
      try {
        const res = await fetch(`${API_BASE}/api/brigade-report/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries, password: pwd }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Ошибка импорта');
        }
        alert(`Импортировано ${entries.length} записей`);
        setShowImportModal(false);
        setImportText('');
        loadDictionary();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  // Фильтрация
  const filteredData = dictionaryData.filter(entry => {
    const matchModel = filterModel === 'ALL' || entry.model === filterModel;
    const searchLower = search.toLowerCase();
    const matchSearch = !search || entry.part_name.toLowerCase().includes(searchLower) || entry.problem_type.toLowerCase().includes(searchLower) || entry.model.toLowerCase().includes(searchLower);
    return matchModel && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Фильтры и кнопки */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          style={{ fontSize: '1.4rem', padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1' }}
        >
          <option value="ALL">Все модели</option>
          {models.map(model => <option key={model} value={model}>{model}</option>)}
        </select>
        <input
          type="text"
          placeholder="Поиск по детали, дефекту, модели"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', fontSize: '1.4rem', padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1' }}
        />
        <button
          onClick={() => setShowImportModal(true)}
          style={{ padding: '10px 20px', fontSize: '1.4rem', background: '#8B5CF6', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Импорт
        </button>
      </div>

      {/* Форма добавления */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={newEntry.model}
          onChange={(e) => setNewEntry({ ...newEntry, model: e.target.value })}
          style={{ flex: 1, minWidth: '150px', padding: '10px', fontSize: '1.4rem', borderRadius: 8, border: '1px solid #CBD5E1' }}
        >
          <option value="">Модель</option>
          {models.map(model => <option key={model} value={model}>{model}</option>)}
        </select>
        <input
          type="text"
          placeholder="Деталь"
          value={newEntry.part_name}
          onChange={(e) => setNewEntry({ ...newEntry, part_name: e.target.value })}
          style={{ flex: 1, minWidth: '150px', padding: '10px', fontSize: '1.4rem', borderRadius: 8, border: '1px solid #CBD5E1' }}
        />
        <input
          type="text"
          placeholder="Дефект"
          value={newEntry.problem_type}
          onChange={(e) => setNewEntry({ ...newEntry, problem_type: e.target.value })}
          style={{ flex: 1, minWidth: '150px', padding: '10px', fontSize: '1.4rem', borderRadius: 8, border: '1px solid #CBD5E1' }}
        />
        <select
          value={newEntry.brigadeName}
          onChange={(e) => setNewEntry({ ...newEntry, brigadeName: e.target.value })}
          style={{ flex: 1, minWidth: '150px', padding: '10px', fontSize: '1.4rem', borderRadius: 8, border: '1px solid #CBD5E1' }}
        >
          <option value="">Бригада</option>
          {brigades.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <button
          onClick={() => handleSaveEntry(newEntry)}
          style={{ padding: '10px 20px', fontSize: '1.4rem', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Добавить
        </button>
        <button
          onClick={handleAssignAllModels}
          style={{ padding: '10px 20px', fontSize: '1.4rem', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          На все модели
        </button>
      </div>

      {/* Таблица справочника */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px', fontSize: '1.8rem' }}>Загрузка...</p>
        ) : (
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
              {filteredData.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={tdStyle}>{entry.model}</td>
                  <td style={tdStyle}>{entry.part_name}</td>
                  <td style={tdStyle}>{entry.problem_type}</td>
                  <td style={tdStyle}>
                    {editEntry && editEntry.id === entry.id ? (
                      <select
                        value={editEntry.brigadeName}
                        onChange={(e) => setEditEntry({ ...editEntry, brigadeName: e.target.value })}
                        style={{ fontSize: '1.4rem', padding: '5px' }}
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
                        <button onClick={() => handleSaveEntry(editEntry)} style={{ marginRight: 5, padding: '5px 10px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Сохранить</button>
                        <button onClick={() => setEditEntry(null)} style={{ padding: '5px 10px', background: '#6B7280', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Отмена</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditEntry({ id: entry.id, model: entry.model, part_name: entry.part_name, problem_type: entry.problem_type, brigadeName: entry.brigade_name })} style={{ marginRight: 5, padding: '5px 10px', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Изменить</button>
                        <button onClick={() => handleDeleteEntry(entry.id)} style={{ padding: '5px 10px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Удалить</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Модальное окно импорта */}
      {showImportModal && (
        <div style={modalOverlayStyle} onClick={() => setShowImportModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '2rem' }}>Импорт справочника</h2>
            <p style={{ fontSize: '1.4rem', color: '#475569' }}>
              Вставьте строки в формате: <b>Модель [Tab] Деталь [Tab] Дефект [Tab] Бригада</b>
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{ width: '100%', height: '300px', fontSize: '1.3rem', padding: '10px', borderRadius: 8, border: '1px solid #CBD5E1' }}
              placeholder={'JELAND J6\tБампер\tПовреждение\tEG/SUB\nJELAND J7\tДверь\tВмятина\tBS Final Line'}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowImportModal(false)} style={{ padding: '10px 20px', fontSize: '1.4rem', background: '#6B7280', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Отмена</button>
              <button onClick={handleImport} style={{ padding: '10px 20px', fontSize: '1.4rem', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Импортировать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Основной компонент страницы с вкладками
export default function BrigadeReportPage() {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'owners'
  const [brigades, setBrigades] = useState([]);
  const [password, setPassword] = useState(sessionStorage.getItem('brigade_password') || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

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

  const handlePasswordSubmit = () => {
    if (!passwordInput) return;
    sessionStorage.setItem('brigade_password', passwordInput);
    setPassword(passwordInput);
    setShowPasswordModal(false);
    if (pendingAction) {
      pendingAction(passwordInput);
      setPendingAction(null);
    }
    setPasswordInput('');
  };

  const renderPasswordModal = () => {
    if (!showPasswordModal) return null;
    return (
      <div style={modalOverlayStyle} onClick={() => setShowPasswordModal(false)}>
        <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.8rem' }}>Введите пароль</h3>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ fontSize: '1.6rem', padding: '10px', marginBottom: 16, borderRadius: 8, border: '1px solid #CBD5E1' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePasswordSubmit} style={{ padding: '10px 20px', fontSize: '1.4rem', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Подтвердить</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ padding: '10px 20px', fontSize: '1.4rem', background: '#6B7280', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Отмена</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Шапка */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Бригадный отчет</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Переключатель вкладок */}
          <div style={{ display: 'flex', gap: '5px', background: '#E2E8F0', padding: '5px', borderRadius: 12 }}>
            <button
              onClick={() => setActiveTab('report')}
              style={{
                padding: '10px 20px',
                fontSize: '1.4rem',
                fontWeight: 700,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'report' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'report' ? '#1E293B' : '#64748B',
                boxShadow: activeTab === 'report' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              📊 Отчет по бригадам
            </button>
            <button
              onClick={() => setActiveTab('owners')}
              style={{
                padding: '10px 20px',
                fontSize: '1.4rem',
                fontWeight: 700,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'owners' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'owners' ? '#1E293B' : '#64748B',
                boxShadow: activeTab === 'owners' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              👥 Владельцы дефектов
            </button>
          </div>
        </div>
      </div>

      {/* Содержимое вкладок */}
      {activeTab === 'report' ? (
        <BrigadeReport brigades={brigades} password={password} executeWithPassword={executeWithPassword} />
      ) : (
        <DefectOwnersManager brigades={brigades} password={password} executeWithPassword={executeWithPassword} />
      )}

      {/* Модальное окно пароля */}
      {renderPasswordModal()}
    </div>
  );
}