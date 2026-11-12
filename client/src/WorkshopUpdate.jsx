import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';

const API_BASE = '';

/* ===================== ХУК ДЕБАУНСА ===================== */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

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
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
  position: 'sticky', top: 0, zIndex: 100,
  backgroundColor: 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(8px)',
  padding: '16px 0', margin: '-16px 0 20px 0', borderBottom: '1px solid #E2E8F0'
};

const titleStyle = { fontSize: '2.2rem', fontWeight: 900, color: '#1E293B', margin: 0 };

const filterButtonStyle = (active, activeColor = '#2563EB', disabled = false) => ({
  padding: '10px 22px', borderRadius: '12px', border: 'none',
  fontWeight: 700, fontSize: '0.95rem',
  background: active ? activeColor : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.2s',
  opacity: disabled ? 0.4 : 1,
  display: 'flex', alignItems: 'center', gap: 6,
});

const reportBlockStyle = {
  background: '#FFFFFF', borderRadius: '16px', padding: '16px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
  border: '1px solid #F1F5F9', marginBottom: '16px',
};

const thStyleSmall = {
  padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569',
  background: '#F8FAFC', fontSize: '0.8rem', textTransform: 'uppercase',
  borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 2,
  whiteSpace: 'nowrap',
};

const tdStyleSmall = {
  padding: '10px 12px', borderBottom: '1px solid #F1F5F9',
  color: '#1E293B', fontSize: '0.85rem', wordBreak: 'break-word',
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid #E2E8F0', fontSize: '0.95rem',
  outline: 'none', boxSizing: 'border-box',
  background: '#FFF',
};

const badgeStyle = (color, textColor = '#FFF') => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
  fontSize: '0.7rem', fontWeight: 700, background: color, color: textColor,
  marginLeft: 8,
});

/* ===================== МОДАЛКА ===================== */
const Modal = memo(({ title, children, onClose, width = 500 }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 16, padding: 24, width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1E293B' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#64748B' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
});

/* ===================== ТОСТ ===================== */
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { success: '#10B981', error: '#EF4444', info: '#2563EB' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '14px 20px', borderRadius: 12, background: colors[type], color: '#FFF', fontWeight: 600, fontSize: '0.95rem', zIndex: 6000, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 450 }}>
      <span style={{ fontSize: 18 }}>{icons[type]}</span>
      {message}
    </div>
  );
}

/* ===================== ТАБЛИЦА ===================== */
const Table = memo(({ 
  title, totalCount, data, columns, selected, onSelect, onSelectAll, onEdit, onViewLinks, onRowClick,
  showLinksButton, links, searchValue, onSearchChange, highlighted, focusedCode, showHideEmptyToggle, hideEmpty, onToggleHideEmpty 
}) => {
  const isAllSelected = data.length > 0 && data.every(row => selected.has(row.code));

  return (
    <div style={{ ...reportBlockStyle, display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>{title}</div>
          {showHideEmptyToggle && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748B', cursor: 'pointer', background: '#F1F5F9', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }} title="Скрыть строки, где код совпадает с описанием">
              <input type="checkbox" checked={hideEmpty} onChange={onToggleHideEmpty} />
              Скрыть пустые
            </label>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <input 
            type="text" 
            placeholder="Фильтр..." 
            value={searchValue} 
            onChange={onSearchChange}
            style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
          />
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{data.length} из {totalCount}</div>
        </div>
      </div>

      <div style={{ height: '450px', overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyleSmall, width: 40, textAlign: 'center' }} title="Выбрать все видимые">
                <input 
                  type="checkbox" 
                  checked={isAllSelected} 
                  onChange={(e) => onSelectAll(e.target.checked, data)} 
                  disabled={data.length === 0}
                />
              </th>
              {columns.map(c => <th key={c.key} style={{ ...thStyleSmall, width: c.key === 'desc_text' ? 'auto' : 120 }}>{c.label}</th>)}
              {showLinksButton && <th style={{ ...thStyleSmall, width: 80, textAlign: 'center' }}>Связи</th>}
              <th style={{ ...thStyleSmall, width: 60, textAlign: 'center' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                  Нет данных.
                </td>
              </tr>
            ) : data.map((row, i) => {
              const isSelected = selected.has(row.code);
              const isFocused = focusedCode === row.code;
              const isHighlighted = highlighted && highlighted.has(row.code);
              const linkCount = showLinksButton && links ? links.partIncidents.filter(li => li.part_code === row.code).length : 0;

              let rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              let borderLeft = '4px solid transparent';

              if (isSelected) rowBg = '#DBEAFE'; // Синий для чекбоксов
              else if (isFocused) {
                rowBg = '#F1F5F9'; // Серый для фокуса
                borderLeft = '4px solid #1E293B';
              } else if (isHighlighted) {
                rowBg = '#FEF3C7'; // Желтый для связей
                borderLeft = '4px solid #F59E0B';
              }

              const isSameText = row.desc_text && row.code.toLowerCase() === row.desc_text.toLowerCase();

              return (
                <tr 
                  key={row.code} 
                  onClick={() => onRowClick && onRowClick(row.code)}
                  style={{ 
                    backgroundColor: rowBg, 
                    transition: 'background-color 0.2s ease',
                    cursor: 'pointer',
                    borderLeft
                  }}
                >
                  <td style={{ ...tdStyleSmall, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => onSelect(row.code)} />
                  </td>
                  {columns.map(c => (
                    <td key={c.key} style={{...tdStyleSmall, color: (c.key === 'desc_text' && isSameText) ? '#94A3B8' : '#1E293B'}}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}

                  {showLinksButton && (
                    <td style={{ ...tdStyleSmall, textAlign: 'center', padding: '10px 4px' }} onClick={e => e.stopPropagation()}>
                      <span
                        style={{ 
                          cursor: 'pointer', padding: '4px 6px', borderRadius: 12, 
                          background: linkCount > 0 ? '#E0F2FE' : '#F1F5F9', 
                          color: linkCount > 0 ? '#0369A1' : '#94A3B8', 
                          fontWeight: 600, fontSize: '0.75rem',
                          display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' 
                        }}
                        onClick={() => onViewLinks(row)}
                        title="Управление связями"
                      >
                        {linkCount} <span>🔗</span>
                      </span>
                    </td>
                  )}

                  <td style={{ ...tdStyleSmall, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onEdit(row)} title="Редактировать" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 4 }}>✏️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

/* ===================== МОДАЛКА СВЯЗЕЙ ===================== */
const LinkManagerModal = memo(({ partCode, draftData, onUpdateDraft, onClose }) => {
  const [incidentSearch, setIncidentSearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');
  
  const debouncedIncSearch = useDebounce(incidentSearch, 200);
  const debouncedPosSearch = useDebounce(positionSearch, 200);

  const linkedIncidents = draftData.links.partIncidents.filter(li => li.part_code === partCode).map(li => draftData.incidents.find(i => i.code === li.problem_code)).filter(Boolean);
  const linkedPositions = draftData.links.partPositions.filter(lp => lp.part_code === partCode).map(lp => draftData.positions.find(p => p.code === lp.position_code)).filter(Boolean);

  const availableIncidents = useMemo(() => {
    if (!debouncedIncSearch) return [];
    return draftData.incidents.filter(i => 
      !linkedIncidents.find(li => li.code === i.code) && 
      (i.code.toLowerCase().includes(debouncedIncSearch.toLowerCase()) || (i.desc_text || '').toLowerCase().includes(debouncedIncSearch.toLowerCase()))
    );
  }, [draftData.incidents, linkedIncidents, debouncedIncSearch]);

  const availablePositions = useMemo(() => {
    if (!debouncedPosSearch) return [];
    return draftData.positions.filter(p => 
      !linkedPositions.find(lp => lp.code === p.code) && 
      (p.code.toLowerCase().includes(debouncedPosSearch.toLowerCase()) || (p.desc_text || '').toLowerCase().includes(debouncedPosSearch.toLowerCase()))
    );
  }, [draftData.positions, linkedPositions, debouncedPosSearch]);

  const handleAddIncident = (incCode) => {
    onUpdateDraft(prev => ({
      ...prev,
      links: { ...prev.links, partIncidents: [...prev.links.partIncidents, { part_code: partCode, problem_code: incCode }] }
    }));
  };

  const handleAddAllIncidents = () => {
    const newLinks = availableIncidents.map(i => ({ part_code: partCode, problem_code: i.code }));
    onUpdateDraft(prev => ({
      ...prev,
      links: { ...prev.links, partIncidents: [...prev.links.partIncidents, ...newLinks] }
    }));
    setIncidentSearch('');
  };

  const handleRemoveIncident = (incCode) => {
    onUpdateDraft(prev => ({
      ...prev,
      links: { ...prev.links, partIncidents: prev.links.partIncidents.filter(li => !(li.part_code === partCode && li.problem_code === incCode)) }
    }));
  };

  const handleAddPosition = (posCode) => {
    onUpdateDraft(prev => ({
      ...prev,
      links: { ...prev.links, partPositions: [...prev.links.partPositions, { part_code: partCode, position_code: posCode }] }
    }));
  };

  const handleAddAllPositions = () => {
    const newLinks = availablePositions.map(p => ({ part_code: partCode, position_code: p.code }));
    onUpdateDraft(prev => ({
      ...prev,
      links: { ...prev.links, partPositions: [...prev.links.partPositions, ...newLinks] }
    }));
    setPositionSearch('');
  };

  const handleRemovePosition = (posCode) => {
    onUpdateDraft(prev => ({
      ...prev,
      links: { ...prev.links, partPositions: prev.links.partPositions.filter(lp => !(lp.part_code === partCode && lp.position_code === posCode)) }
    }));
  };

  return (
    <Modal title={`Управление связями: ${partCode}`} onClose={onClose} width={700}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ fontSize: '0.95rem', color: '#475569', margin: 0 }}>Дефекты ({linkedIncidents.length})</h4>
          {linkedIncidents.length > 0 && (
            <button onClick={() => onUpdateDraft(prev => ({ ...prev, links: { ...prev.links, partIncidents: prev.links.partIncidents.filter(li => li.part_code !== partCode) } }))} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem', cursor: 'pointer' }}>Очистить все</button>
          )}
        </div>
        
        <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, marginBottom: 12, background: '#F8FAFC' }}>
          {linkedIncidents.map(i => (
            <div key={i.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 8px', borderBottom: '1px solid #E2E8F0', background: '#FFF', borderRadius: 4, marginBottom: 4 }}>
              <span><b>{i.code}</b> — {i.desc_text}</span>
              <button onClick={() => handleRemoveIncident(i.code)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', fontWeight: 700 }} title="Отвязать">×</button>
            </div>
          ))}
          {linkedIncidents.length === 0 && <div style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: 10 }}>Нет привязанных дефектов</div>}
        </div>
        
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <input 
            type="text" 
            placeholder="🔍 Введите название или код дефекта для поиска..." 
            value={incidentSearch} 
            onChange={e => setIncidentSearch(e.target.value)} 
            style={{ ...inputStyle, padding: '10px 12px', fontSize: '0.9rem', border: '1px solid #7C3AED' }} 
          />
          {availableIncidents.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, border: '1px solid #E2E8F0', borderRadius: '0 0 8px 8px', background: '#FFF', zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', maxHeight: 300, overflowY: 'auto' }}>
              <div style={{ padding: 8, background: '#F3E8FF', borderBottom: '1px solid #E9D5FF', position: 'sticky', top: 0 }}>
                <button onClick={handleAddAllIncidents} style={{ width: '100%', padding: '8px', background: '#7C3AED', color: '#FFF', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                  + Привязать все найденные ({availableIncidents.length})
                </button>
              </div>
              {availableIncidents.slice(0, 50).map(i => (
                <div 
                  key={i.code} 
                  onClick={() => handleAddIncident(i.code)}
                  style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span><b>{i.code}</b> — {i.desc_text}</span>
                  <span style={{ color: '#7C3AED', fontWeight: 600 }}>+ Привязать</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ fontSize: '0.95rem', color: '#475569', margin: 0 }}>Локации ({linkedPositions.length})</h4>
          {linkedPositions.length > 0 && (
            <button onClick={() => onUpdateDraft(prev => ({ ...prev, links: { ...prev.links, partPositions: prev.links.partPositions.filter(lp => lp.part_code !== partCode) } }))} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem', cursor: 'pointer' }}>Очистить все</button>
          )}
        </div>
        
        <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, marginBottom: 12, background: '#F8FAFC' }}>
          {linkedPositions.map(p => (
            <div key={p.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 8px', borderBottom: '1px solid #E2E8F0', background: '#FFF', borderRadius: 4, marginBottom: 4 }}>
              <span><b>{p.code}</b> — {p.desc_text}</span>
              <button onClick={() => handleRemovePosition(p.code)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', fontWeight: 700 }} title="Отвязать">×</button>
            </div>
          ))}
          {linkedPositions.length === 0 && <div style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: 10 }}>Нет привязанных локаций</div>}
        </div>

        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <input 
            type="text" 
            placeholder="🔍 Введите код или название локации..." 
            value={positionSearch} 
            onChange={e => setPositionSearch(e.target.value)} 
            style={{ ...inputStyle, padding: '10px 12px', fontSize: '0.9rem', border: '1px solid #2563EB' }} 
          />
          {availablePositions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, border: '1px solid #E2E8F0', borderRadius: '0 0 8px 8px', background: '#FFF', zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', maxHeight: 300, overflowY: 'auto' }}>
               <div style={{ padding: 8, background: '#DBEAFE', borderBottom: '1px solid #BFDBFE', position: 'sticky', top: 0 }}>
                <button onClick={handleAddAllPositions} style={{ width: '100%', padding: '8px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                  + Привязать все найденные ({availablePositions.length})
                </button>
              </div>
              {availablePositions.slice(0, 50).map(p => (
                <div 
                  key={p.code} 
                  onClick={() => handleAddPosition(p.code)}
                  style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span><b>{p.code}</b> — {p.desc_text}</span>
                  <span style={{ color: '#2563EB', fontWeight: 600 }}>+ Привязать</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
});

/* ===================== ПРЕДПРОСМОТР ===================== */
const PreviewBlock = memo(({ title, items, originalItems, type }) => {
  const changed = items.filter(i => {
    const orig = originalItems.find(o => o.code === i.code);
    if (i.isNew) return true;
    if (!orig) return true;
    if (i.desc_text !== orig.desc_text) return true;
    if (type === 'position' && (i.export_code || '') !== (orig.export_code || '')) return true;
    return false;
  });

  return (
    <div style={reportBlockStyle}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#475569' }}>
        {title} <span style={{ color: '#94A3B8', fontWeight: 500 }}>(изменено: {changed.length})</span>
      </h3>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {changed.length === 0 ? (
              <tr><td style={{ padding: 10, color: '#94A3B8', fontSize: '0.85rem' }}>Нет изменений</td></tr>
            ) : changed.map(i => {
              const orig = originalItems.find(o => o.code === i.code) || {};
              const isNew = i.isNew;
              const descChanged = orig.desc_text !== i.desc_text;
              const codeChanged = type === 'position' && (orig.export_code || '') !== (i.export_code || '');

              const effectiveCode = i.export_code
                ? i.export_code
                : (/^\d+$/.test(i.code) ? i.code : '(не задан)');

              return (
                <tr key={i.code} style={{ backgroundColor: isNew ? '#DCFCE7' : '#FEF9C3', borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: 8, fontSize: '0.85rem', width: 90, fontWeight: 700, verticalAlign: 'top' }}>{i.code}</td>
                  <td style={{ padding: 8, fontSize: '0.85rem' }}>
                    {isNew ? (
                      i.desc_text
                    ) : descChanged ? (
                      <div>
                        <span style={{ color: '#EF4444', textDecoration: 'line-through', marginRight: 6 }}>{orig.desc_text || '(пусто)'}</span>
                        <span style={{ color: '#10B981', fontWeight: 700 }}>→ {i.desc_text}</span>
                      </div>
                    ) : (
                      i.desc_text
                    )}

                    {type === 'position' && (
                      <div style={{ marginTop: 4, fontSize: '0.75rem' }}>
                        <span style={{ color: '#64748B' }}>Код системы: </span>
                        {isNew ? (
                          <b>{effectiveCode}</b>
                        ) : codeChanged ? (
                          <>
                            <span style={{ color: '#EF4444', textDecoration: 'line-through', marginRight: 6 }}>{orig.export_code || '(пусто)'}</span>
                            <span style={{ color: '#10B981', fontWeight: 700 }}>→ {effectiveCode}</span>
                          </>
                        ) : (
                          <b>{effectiveCode}</b>
                        )}
                      </div>
                    )}
                    {isNew && <span style={badgeStyle('#10B981')}>НОВЫЙ</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

/* ===================== ГЛАВНЫЙ КОМПОНЕНТ ===================== */
export default function WorkshopUpdate() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Поиски
  const [globalSearch, setGlobalSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');
  const [hideEmptyParts, setHideEmptyParts] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Фокус (для подсветки связей кликом по строке)
  const [focusedRow, setFocusedRow] = useState(null);

  // Дебаунсы
  const debouncedGlobalSearch = useDebounce(globalSearch, 300);
  const debouncedPartSearch = useDebounce(partSearch, 300);
  const debouncedIncidentSearch = useDebounce(incidentSearch, 300);
  const debouncedPositionSearch = useDebounce(positionSearch, 300);

  const [toast, setToast] = useState(null);

  const [originalData, setOriginalData] = useState({ parts: [], incidents: [], positions: [], links: { partIncidents: [], partPositions: [] } });
  const [draftData, setDraftData] = useState({ parts: [], incidents: [], positions: [], links: { partIncidents: [], partPositions: [] } });

  const [selectedParts, setSelectedParts] = useState(new Set());
  const [selectedIncidents, setSelectedIncidents] = useState(new Set());
  const [selectedPositions, setSelectedPositions] = useState(new Set());

  const [modal, setModal] = useState(null);
  const [modalForm, setModalForm] = useState({ code: '', desc: '', cloneWithLinks: true });
  const [modalError, setModalError] = useState('');
  
  const [viewLinksFor, setViewLinksFor] = useState(null);

  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    setSelectedParts(new Set());
    setSelectedIncidents(new Set());
    setSelectedPositions(new Set());
    setFocusedRow(null);
  }, [debouncedGlobalSearch, debouncedPartSearch, debouncedIncidentSearch, debouncedPositionSearch]);

  const hasChanges = useMemo(() => {
    const normParts = (arr) => JSON.stringify([...arr].sort((a, b) => a.code.localeCompare(b.code)).map(x => ({ c: x.code, d: x.desc_text, hc: !!x.have_child, del: !!x.is_deleted })));
    const normIncidents = (arr) => JSON.stringify([...arr].sort((a, b) => a.code.localeCompare(b.code)).map(x => ({ c: x.code, d: x.desc_text, del: !!x.is_deleted })));
    const normPositions = (arr) => JSON.stringify([...arr].sort((a, b) => a.code.localeCompare(b.code)).map(x => ({ c: x.code, d: x.desc_text, ec: x.export_code || '', del: !!x.is_deleted })));
    const normLinks = (l) => JSON.stringify({
      pi: [...(l.partIncidents || [])].sort((a, b) => `${a.part_code}|${a.problem_code}`.localeCompare(`${b.part_code}|${b.problem_code}`)),
      pp: [...(l.partPositions || [])].sort((a, b) => `${a.part_code}|${a.position_code}`.localeCompare(`${b.part_code}|${b.position_code}`)),
    });
    return (
      normParts(draftData.parts) !== normParts(originalData.parts) ||
      normIncidents(draftData.incidents) !== normIncidents(originalData.incidents) ||
      normPositions(draftData.positions) !== normPositions(originalData.positions) ||
      normLinks(draftData.links) !== normLinks(originalData.links)
    );
  }, [draftData, originalData]);

  const changeCount = useMemo(() => {
    let count = 0;
    draftData.parts.forEach(p => {
      const orig = originalData.parts.find(o => o.code === p.code);
      if (p.isNew || !orig || p.desc_text !== orig.desc_text || !!p.have_child !== !!orig.have_child) count++;
    });
    draftData.incidents.forEach(i => {
      const orig = originalData.incidents.find(o => o.code === i.code);
      if (i.isNew || !orig || i.desc_text !== orig.desc_text) count++;
    });
    draftData.positions.forEach(p => {
      const orig = originalData.positions.find(o => o.code === p.code);
      if (p.isNew || !orig || p.desc_text !== orig.desc_text || (p.export_code || '') !== (orig.export_code || '')) count++;
    });

    const oldIncSet = new Set(originalData.links.partIncidents.map(l => `${l.part_code}|${l.problem_code}`));
    const newIncSet = new Set(draftData.links.partIncidents.map(l => `${l.part_code}|${l.problem_code}`));
    newIncSet.forEach(k => { if (!oldIncSet.has(k)) count++; });
    oldIncSet.forEach(k => { if (!newIncSet.has(k)) count++; });

    const oldPosSet = new Set(originalData.links.partPositions.map(l => `${l.part_code}|${l.position_code}`));
    const newPosSet = new Set(draftData.links.partPositions.map(l => `${l.part_code}|${l.position_code}`));
    newPosSet.forEach(k => { if (!oldPosSet.has(k)) count++; });
    oldPosSet.forEach(k => { if (!newPosSet.has(k)) count++; });

    return count;
  }, [draftData, originalData]);

  /* ===================== ПОДСВЕТКА И ФОКУС ===================== */
  const isAnyCheckboxSelected = selectedParts.size > 0 || selectedIncidents.size > 0 || selectedPositions.size > 0;

  const highlightedParts = useMemo(() => {
    if (isAnyCheckboxSelected) return new Set();
    const set = new Set();
    if (focusedRow?.type === 'incident') {
      draftData.links.partIncidents.forEach(li => { if (li.problem_code === focusedRow.code) set.add(li.part_code); });
    }
    if (focusedRow?.type === 'position') {
      draftData.links.partPositions.forEach(lp => { if (lp.position_code === focusedRow.code) set.add(lp.part_code); });
    }
    return set;
  }, [focusedRow, draftData.links, isAnyCheckboxSelected]);

  const highlightedIncidents = useMemo(() => {
    if (isAnyCheckboxSelected) return new Set();
    const set = new Set();
    if (focusedRow?.type === 'part') {
      draftData.links.partIncidents.forEach(li => { if (li.part_code === focusedRow.code) set.add(li.problem_code); });
    }
    return set;
  }, [focusedRow, draftData.links, isAnyCheckboxSelected]);

  const highlightedPositions = useMemo(() => {
    if (isAnyCheckboxSelected) return new Set();
    const set = new Set();
    if (focusedRow?.type === 'part') {
      draftData.links.partPositions.forEach(lp => { if (lp.part_code === focusedRow.code) set.add(lp.position_code); });
    }
    return set;
  }, [focusedRow, draftData.links, isAnyCheckboxSelected]);

  // Клик по строке (Фокус) - сбрасывает массовый выбор
  const handleRowClick = (type, code) => {
    setSelectedParts(new Set());
    setSelectedIncidents(new Set());
    setSelectedPositions(new Set());
    setFocusedRow({ type, code });
  };

  /* ===================== ДЕЙСТВИЯ ===================== */
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '1234561') {
      setIsAuthenticated(true);
      syncAndFetch(true);
    } else {
      setError('Неверный пароль');
    }
  };

  const syncAndFetch = async (skipConfirm = false) => {
    if (!skipConfirm && hasChanges) {
      if (!window.confirm('Есть несохранённые изменения. Синхронизация перезапишет их. Продолжить?')) return;
    }
    setLoading(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/api/workshop/sync-iot`, { method: 'POST' });
      const res = await fetch(`${API_BASE}/api/workshop/data`);
      const data = await res.json();

      const normalize = (d) => ({
        parts: d.parts || [], incidents: d.incidents || [], positions: d.positions || [],
        links: d.links || { partIncidents: [], partPositions: [] },
      });

      setOriginalData(normalize(data));
      setDraftData(normalize(data));
      setSelectedParts(new Set());
      setSelectedIncidents(new Set());
      setSelectedPositions(new Set());
      setFocusedRow(null);
      showToast('Данные синхронизированы', 'success');
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnly = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/workshop/data`);
      const data = await res.json();
      const normalize = (d) => ({
        parts: d.parts || [], incidents: d.incidents || [], positions: d.positions || [],
        links: d.links || { partIncidents: [], partPositions: [] },
      });
      setOriginalData(normalize(data));
      setDraftData(normalize(data));
      setSelectedParts(new Set());
      setSelectedIncidents(new Set());
      setSelectedPositions(new Set());
      setFocusedRow(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateCode = (code, list) => {
    const c = (code || '').trim();
    if (c.length < 2) return 'Код минимум 2 символа';
    if (c.length > 100) return 'Код слишком длинный';
    if (!/^[A-Za-z0-9\-_.]+$/.test(c)) return 'Только латиница, цифры, "-", "_", "."';
    if (list.some(x => x.code.toUpperCase() === c.toUpperCase())) return 'Такой код уже существует';
    return '';
  };

  const validateDesc = (desc) => {
    const d = (desc || '').trim();
    if (d.length < 2) return 'Описание минимум 2 символа';
    if (d.length > 255) return 'Описание слишком длинное';
    return '';
  };

  const openAddModal = (type) => {
    setModal({ type, mode: 'add' });
    setModalForm({ code: '', desc: '', cloneWithLinks: true });
    setModalError('');
  };

  const openEditModal = (type, item) => {
    setModal({ type, mode: 'edit', original: item });
    setModalForm({ code: item.code, desc: item.desc_text, cloneWithLinks: true });
    setModalError('');
  };

  const openCloneModal = (sourceItem) => {
    setModal({ type: 'part', mode: 'clone', original: sourceItem });
    setModalForm({ code: '', desc: sourceItem.desc_text, cloneWithLinks: true });
    setModalError('');
  };

  const handleModalSubmit = () => {
    const { type, mode, original } = modal;

    if (mode === 'add' || mode === 'clone') {
      const list = type === 'part' ? draftData.parts : draftData.incidents;
      const codeErr = validateCode(modalForm.code, list);
      if (codeErr) return setModalError(codeErr);
    }
    const descErr = validateDesc(modalForm.desc);
    if (descErr) return setModalError(descErr);

    if (mode === 'add') {
      const newItem = type === 'part'
        ? { code: modalForm.code.trim(), desc_text: modalForm.desc.trim(), have_child: false, isNew: true }
        : { code: modalForm.code.trim(), desc_text: modalForm.desc.trim(), isNew: true };
      setDraftData(prev => ({
        ...prev,
        [type === 'part' ? 'parts' : 'incidents']: [...prev[type === 'part' ? 'parts' : 'incidents'], newItem],
      }));
      showToast('Добавлено', 'success');
    } else if (mode === 'edit') {
      setDraftData(prev => {
        const targetArr = type === 'part' ? prev.parts : prev.incidents;
        const updated = targetArr.map(x => x.code === original.code ? { ...x, desc_text: modalForm.desc.trim() } : x);
        return { ...prev, [type === 'part' ? 'parts' : 'incidents']: updated };
      });
      showToast('Изменено', 'success');
    } else if (mode === 'clone') {
      setDraftData(prev => {
        const newCode = modalForm.code.trim();
        const newItem = {
          code: newCode, desc_text: modalForm.desc.trim(), have_child: original.have_child || false, isNew: true,
        };
        const srcIncidentLinks = modalForm.cloneWithLinks ? prev.links.partIncidents.filter(li => li.part_code === original.code).map(li => ({ part_code: newCode, problem_code: li.problem_code })) : [];
        const srcPositionLinks = modalForm.cloneWithLinks ? prev.links.partPositions.filter(lp => lp.part_code === original.code).map(lp => ({ part_code: newCode, position_code: lp.position_code })) : [];
        return {
          ...prev,
          parts: [...prev.parts, newItem],
          links: { partIncidents: [...prev.links.partIncidents, ...srcIncidentLinks], partPositions: [...prev.links.partPositions, ...srcPositionLinks] },
        };
      });
      showToast('Клонировано', 'success');
    }
    setModal(null);
  };

  const toggleSelectPart = (code) => {
    setFocusedRow(null); // Сбрасываем фокус при выборе чекбокса
    const next = new Set(selectedParts);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSelectedParts(next);
  };

  const toggleSelectIncident = (code) => {
    setFocusedRow(null);
    const next = new Set(selectedIncidents);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSelectedIncidents(next);
  };

  const toggleSelectPosition = (code) => {
    setFocusedRow(null);
    const next = new Set(selectedPositions);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSelectedPositions(next);
  };

  const handleSelectAll = (type, checked, visibleRows) => {
    setFocusedRow(null);
    if (type === 'part') {
      const next = new Set(selectedParts);
      visibleRows.forEach(r => checked ? next.add(r.code) : next.delete(r.code));
      setSelectedParts(next);
    } else if (type === 'incident') {
      const next = new Set(selectedIncidents);
      visibleRows.forEach(r => checked ? next.add(r.code) : next.delete(r.code));
      setSelectedIncidents(next);
    } else if (type === 'position') {
      const next = new Set(selectedPositions);
      visibleRows.forEach(r => checked ? next.add(r.code) : next.delete(r.code));
      setSelectedPositions(next);
    }
  };

  const clearSelection = () => {
    setSelectedParts(new Set());
    setSelectedIncidents(new Set());
    setSelectedPositions(new Set());
    setFocusedRow(null);
    showToast('Выделения сброшены', 'info');
  };

  const handleLinkDefects = () => {
    if (selectedParts.size === 0) return showToast('Выберите хотя бы один компонент (галочкой слева)', 'error');
    if (selectedIncidents.size === 0 && selectedPositions.size === 0) return showToast('Выберите дефекты или локации для привязки', 'error');
    
    const newIncidentLinks = [];
    const existingIncidentLinks = new Set(draftData.links.partIncidents.map(l => `${l.part_code}|${l.problem_code}`));
    
    selectedParts.forEach(partCode => {
      selectedIncidents.forEach(incCode => {
        const key = `${partCode}|${incCode}`;
        if (!existingIncidentLinks.has(key)) {
          newIncidentLinks.push({ part_code: partCode, problem_code: incCode });
        }
      });
    });

    const newPositionLinks = [];
    const existingPositionLinks = new Set(draftData.links.partPositions.map(l => `${l.part_code}|${l.position_code}`));
    
    selectedParts.forEach(partCode => {
      selectedPositions.forEach(posCode => {
        const key = `${partCode}|${posCode}`;
        if (!existingPositionLinks.has(key)) {
          newPositionLinks.push({ part_code: partCode, position_code: posCode });
        }
      });
    });

    if (newIncidentLinks.length === 0 && newPositionLinks.length === 0) {
      return showToast('Все выбранные связи уже существуют', 'info');
    }

    setDraftData(prev => ({
      ...prev,
      links: {
        partIncidents: [...prev.links.partIncidents, ...newIncidentLinks],
        partPositions: [...prev.links.partPositions, ...newPositionLinks]
      }
    }));
    showToast(`Создано связей: Дефекты (${newIncidentLinks.length}), Локации (${newPositionLinks.length})`, 'success');
    clearSelection();
  };

  const handleUnlinkDefects = () => {
    if (selectedParts.size === 0) return showToast('Выберите хотя бы один компонент', 'error');
    if (selectedIncidents.size === 0 && selectedPositions.size === 0) return showToast('Выберите хотя бы один дефект или локацию', 'error');
    
    let removedInc = 0;
    let removedPos = 0;

    const updatedPartIncidents = draftData.links.partIncidents.filter(li => {
      const shouldRemove = selectedParts.has(li.part_code) && selectedIncidents.has(li.problem_code);
      if (shouldRemove) removedInc++;
      return !shouldRemove;
    });

    const updatedPartPositions = draftData.links.partPositions.filter(lp => {
      const shouldRemove = selectedParts.has(lp.part_code) && selectedPositions.has(lp.position_code);
      if (shouldRemove) removedPos++;
      return !shouldRemove;
    });

    if (removedInc === 0 && removedPos === 0) return showToast('Связей для отвязки не найдено', 'info');

    setDraftData(prev => ({
      ...prev,
      links: {
        partIncidents: updatedPartIncidents,
        partPositions: updatedPartPositions
      }
    }));
    showToast(`Отвязано: Дефекты (${removedInc}), Локации (${removedPos})`, 'info');
    clearSelection();
  };

  const handleSave = async (silent = false) => {
    if (!silent && !window.confirm(`Сохранить ${changeCount} изменений в базу данных?`)) return false;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/workshop/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draftData),
      });
      if (!res.ok) throw new Error('Ошибка сервера');

      const dataRes = await fetch(`${API_BASE}/api/workshop/data`);
      const data = await dataRes.json();
      const normalize = (d) => ({ parts: d.parts || [], incidents: d.incidents || [], positions: d.positions || [], links: d.links || { partIncidents: [], partPositions: [] } });

      setOriginalData(normalize(data));
      setDraftData(normalize(data));
      if (!silent) showToast('Изменения сохранены в базу', 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Отменить все изменения?')) return;
    setDraftData(JSON.parse(JSON.stringify(originalData)));
    clearSelection();
    showToast('Изменения отменены', 'info');
  };

  const handleExport = async () => {
    if (hasChanges) {
      const saved = await handleSave(true);
      if (!saved) return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/workshop/export-check`);
      const check = await res.json();
      if (!check.readyToExport) {
        const preview = check.unmappedPositions.slice(0, 5).map(p => `  • ${p.code}`).join('\n');
        const msg = `⚠️ ${check.unmappedPositions.length} текстовых позиций без кода.\nСвязей будет потеряно: ${check.lostLinks}.\n\nБез кода:\n${preview}${check.unmappedPositions.length > 5 ? '\n  ...' : ''}\n\nВсё равно выгрузить ZIP?`;
        if (!window.confirm(msg)) return;
      }
    } catch (err) {
      console.error('Ошибка проверки:', err);
    }

    window.location.href = `${API_BASE}/api/workshop/export`;
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    if (!window.confirm('Импорт перезапишет текущие справочники. Продолжить?')) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      setLoading(true);
      try {
        const base64 = ev.target.result.split(',')[1];
        const res = await fetch(`${API_BASE}/api/workshop/import`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: base64 }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Ошибка импорта');

        if (json.skippedPositionCodes && json.skippedPositionCodes.length > 0) {
          showToast(`Импортировано. Пропущено позиций: ${json.skippedPositionCodes.length}`, 'info');
        } else {
          showToast('ZIP успешно импортирован', 'success');
        }
        await fetchOnly();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handler = (e) => { if (hasChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const filteredData = useMemo(() => {
    let parts = draftData.parts;
    let incidents = draftData.incidents;
    let positions = draftData.positions;

    if (hideEmptyParts) {
      parts = parts.filter(p => p.code.toLowerCase() !== (p.desc_text || '').toLowerCase());
    }

    if (debouncedGlobalSearch.trim()) {
      const q = debouncedGlobalSearch.toLowerCase().trim();
      
      const matchedParts = draftData.parts.filter(p => p.code.toLowerCase().includes(q) || (p.desc_text || '').toLowerCase().includes(q));
      const matchedPartCodes = new Set(matchedParts.map(p => p.code));

      const matchedIncidents = draftData.incidents.filter(i => i.code.toLowerCase().includes(q) || (i.desc_text || '').toLowerCase().includes(q));
      const matchedIncidentCodes = new Set(matchedIncidents.map(i => i.code));

      const matchedPositions = draftData.positions.filter(pos => pos.code.toLowerCase().includes(q) || (pos.desc_text || '').toLowerCase().includes(q));
      const matchedPositionCodes = new Set(matchedPositions.map(p => p.code));

      const partsLinkedToMatchedIncidents = draftData.links.partIncidents.filter(li => matchedIncidentCodes.has(li.problem_code)).map(li => li.part_code);
      const incidentsLinkedToMatchedParts = draftData.links.partIncidents.filter(li => matchedPartCodes.has(li.part_code)).map(li => li.problem_code);
      const positionsLinkedToMatchedParts = draftData.links.partPositions.filter(lp => matchedPartCodes.has(lp.part_code)).map(lp => lp.position_code);

      const finalPartCodes = new Set([...matchedPartCodes, ...partsLinkedToMatchedIncidents]);
      const finalIncidentCodes = new Set([...matchedIncidentCodes, ...incidentsLinkedToMatchedParts]);
      const finalPositionCodes = new Set([...matchedPositionCodes, ...positionsLinkedToMatchedParts]);

      parts = draftData.parts.filter(p => finalPartCodes.has(p.code));
      incidents = draftData.incidents.filter(i => finalIncidentCodes.has(i.code));
      positions = draftData.positions.filter(p => finalPositionCodes.has(p.code));
    }

    if (debouncedPartSearch.trim()) {
      const q = debouncedPartSearch.toLowerCase().trim();
      parts = draftData.parts.filter(p => p.code.toLowerCase().includes(q) || (p.desc_text || '').toLowerCase().includes(q));
    }
    if (debouncedIncidentSearch.trim()) {
      const q = debouncedIncidentSearch.toLowerCase().trim();
      incidents = draftData.incidents.filter(i => i.code.toLowerCase().includes(q) || (i.desc_text || '').toLowerCase().includes(q));
    }
    if (debouncedPositionSearch.trim()) {
      const q = debouncedPositionSearch.toLowerCase().trim();
      positions = draftData.positions.filter(p => p.code.toLowerCase().includes(q) || (p.desc_text || '').toLowerCase().includes(q));
    }

    const sortByHighlight = (arr, highlightedSet, focusedCode) => {
      return [...arr].sort((a, b) => {
        if (focusedCode === a.code) return -1;
        if (focusedCode === b.code) return 1;
        const aHigh = highlightedSet.has(a.code) ? 1 : 0;
        const bHigh = highlightedSet.has(b.code) ? 1 : 0;
        return bHigh - aHigh;
      });
    };

    return { 
      parts: sortByHighlight(parts, highlightedParts, focusedRow?.type === 'part' ? focusedRow.code : null), 
      incidents: sortByHighlight(incidents, highlightedIncidents, focusedRow?.type === 'incident' ? focusedRow.code : null), 
      positions: sortByHighlight(positions, highlightedPositions, focusedRow?.type === 'position' ? focusedRow.code : null), 
      links: draftData.links 
    };
  }, [draftData, debouncedGlobalSearch, debouncedPartSearch, debouncedIncidentSearch, debouncedPositionSearch, hideEmptyParts, highlightedParts, highlightedIncidents, highlightedPositions, focusedRow]);

  const potentialLinksCount = (selectedParts.size * selectedIncidents.size) + (selectedParts.size * selectedPositions.size);
  const existingLinksCount = useMemo(() => {
    let count = 0;
    selectedParts.forEach(p => {
      selectedIncidents.forEach(i => {
        if (draftData.links.partIncidents.some(li => li.part_code === p && li.problem_code === i)) count++;
      });
      selectedPositions.forEach(pos => {
        if (draftData.links.partPositions.some(lp => lp.part_code === p && lp.position_code === pos)) count++;
      });
    });
    return count;
  }, [selectedParts, selectedIncidents, selectedPositions, draftData.links]);

  const canClone = selectedParts.size === 1;
  const hasSelection = selectedParts.size > 0 || selectedIncidents.size > 0 || selectedPositions.size > 0;

  if (!isAuthenticated) {
    return (
      <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...reportBlockStyle, width: 400, textAlign: 'center' }}>
          <h2 style={{ color: '#1E293B', marginBottom: 20 }}>Вход в Workshop Service</h2>
          <form onSubmit={handleLogin}>
            <input type="password" placeholder="Введите пароль" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: 8 }}>{error}</div>}
            <button type="submit" style={{ ...filterButtonStyle(true), width: '100%', marginTop: 16, justifyContent: 'center' }}>Войти</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Обновление справочников</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="🔍 Общий поиск (связи)..." 
            value={globalSearch} 
            onChange={e => {
              setGlobalSearch(e.target.value);
              setPartSearch('');
              setIncidentSearch('');
              setPositionSearch('');
            }} 
            style={{ ...inputStyle, width: 250 }} 
          />
          <button onClick={() => syncAndFetch()} style={filterButtonStyle(false)} disabled={loading}>🔄 Обновить из IOT</button>
          <button onClick={() => fileInputRef.current?.click()} style={filterButtonStyle(false, '#8B5CF6')}>📥 Импорт</button>
          <input type="file" accept=".zip" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />

          <button onClick={handleExport} style={filterButtonStyle(false, '#10B981')} disabled={loading}>
            📤 Скачать ZIP (Excel)
          </button>

          {hasChanges && (
            <button onClick={handleReset} style={filterButtonStyle(false, '#F59E0B')}>↩️ Отменить</button>
          )}
          <button onClick={() => handleSave(false)} style={filterButtonStyle(hasChanges, '#2563EB')} disabled={loading || !hasChanges}>
            💾 Применить изменения {hasChanges && <span style={badgeStyle('#EF4444')}>{changeCount}</span>}
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', fontSize: '1.2rem', color: '#2563EB', margin: '20px 0' }}>⏳ Загрузка...</div>}

      <div style={{ ...reportBlockStyle, display: 'flex', flexDirection: 'column', gap: 10, background: '#F8FAFC', padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => openAddModal('part')} style={filterButtonStyle(false, '#475569')}>➕ Компонент</button>
          <button onClick={() => openAddModal('incident')} style={filterButtonStyle(false, '#475569')}>➕ Дефект</button>
          <div style={{ width: 1, height: 32, background: '#CBD5E1', margin: '0 4px' }} />
          
          <button 
            onClick={() => {
              if (!canClone) return showToast('Выберите один компонент', 'error');
              const part = draftData.parts.find(p => p.code === Array.from(selectedParts)[0]);
              if (part) openCloneModal(part);
            }} 
            style={filterButtonStyle(false, canClone ? '#2563EB' : '#94A3B8')} 
            disabled={!canClone}
            title={!canClone ? "Выберите один компонент для клонирования" : "Клонировать выбранный компонент"}
          >
            👯 Клонировать
          </button>

          <button 
            onClick={handleLinkDefects} 
            style={filterButtonStyle(false, '#7C3AED')} 
            title="Создать связи между выделенными компонентами и дефектами/локациями"
          >
            🔗 Привязать {potentialLinksCount > 0 && `(${potentialLinksCount})`}
          </button>
          
          <button 
            onClick={handleUnlinkDefects} 
            style={filterButtonStyle(false, existingLinksCount > 0 ? '#EF4444' : '#94A3B8')} 
            disabled={existingLinksCount === 0}
            title={existingLinksCount === 0 ? "Нет выбранных связей для отвязки" : "Удалить связи"}
          >
            ✂️ Отвязать {existingLinksCount > 0 && `(${existingLinksCount})`}
          </button>

          <button 
            onClick={clearSelection} 
            style={filterButtonStyle(false, hasSelection ? '#64748B' : '#F1F5F9')} 
            disabled={!hasSelection}
            title="Сбросить все галочки"
          >
            🧹 Сбросить выбор
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{ 
              ...filterButtonStyle(showHelp, '#1E293B'), 
              width: '42px', height: '42px', padding: 0, borderRadius: '50%', 
              fontWeight: 900, fontSize: '1.2rem', marginLeft: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
            title="Как работать со справочниками"
          >
            ?
          </button>
        </div>
        
        {showHelp && (
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: 16, borderRadius: 8, marginTop: 4 }}>
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.7 }}>
              <b>1. Просмотр связей:</b> Кликните по <b>строке</b> (не по галочке) — связанные элементы в других таблицах подсветятся желтым.<br />
              <b>2. Массовый выбор:</b> Используйте галочку в заголовке таблицы, чтобы выделить <b>все видимые</b> элементы.<br />
              <b>3. Быстрая привязка:</b> Нажмите на кнопку <b>🔗</b> в строке компонента. В открывшемся окне ищите и привязывайте всё разом.<br />
              <b>4. Сохранение:</b> Кнопка <b>«Применить изменения»</b> сохраняет всё в базу.
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginTop: 16 }}>
        <Table
          title="Как сейчас: Компоненты" 
          totalCount={draftData.parts.length}
          data={filteredData.parts} 
          links={filteredData.links}
          columns={[{ key: 'code', label: 'Код' }, { key: 'desc_text', label: 'Описание' }]}
          selected={selectedParts} 
          onSelect={toggleSelectPart}
          onSelectAll={(checked, rows) => handleSelectAll('part', checked, rows)}
          onRowClick={(code) => handleRowClick('part', code)}
          onEdit={(row) => openEditModal('part', row)}
          onViewLinks={(row) => setViewLinksFor(row.code)}
          showLinksButton
          searchValue={partSearch}
          onSearchChange={(e) => { setPartSearch(e.target.value); setGlobalSearch(''); }}
          highlighted={highlightedParts}
          focusedCode={focusedRow?.type === 'part' ? focusedRow.code : null}
          showHideEmptyToggle={true}
          hideEmpty={hideEmptyParts}
          onToggleHideEmpty={() => setHideEmptyParts(!hideEmptyParts)}
        />
        <Table
          title="Как сейчас: Дефекты" 
          totalCount={draftData.incidents.length}
          data={filteredData.incidents} 
          links={filteredData.links}
          columns={[{ key: 'code', label: 'Код' }, { key: 'desc_text', label: 'Описание' }]}
          selected={selectedIncidents} 
          onSelect={toggleSelectIncident}
          onSelectAll={(checked, rows) => handleSelectAll('incident', checked, rows)}
          onRowClick={(code) => handleRowClick('incident', code)}
          onEdit={(row) => openEditModal('incident', row)}
          searchValue={incidentSearch}
          onSearchChange={(e) => { setIncidentSearch(e.target.value); setGlobalSearch(''); }}
          highlighted={highlightedIncidents}
          focusedCode={focusedRow?.type === 'incident' ? focusedRow.code : null}
        />
        <Table
          title="Как сейчас: Локации" 
          totalCount={draftData.positions.length}
          data={filteredData.positions} 
          links={filteredData.links}
          columns={[{ key: 'code', label: 'Код' }, { key: 'desc_text', label: 'Описание' }]}
          selected={selectedPositions} 
          onSelect={toggleSelectPosition}
          onSelectAll={(checked, rows) => handleSelectAll('position', checked, rows)}
          onRowClick={(code) => handleRowClick('position', code)}
          highlighted={highlightedPositions}
          focusedCode={focusedRow?.type === 'position' ? focusedRow.code : null}
          searchValue={positionSearch}
          onSearchChange={(e) => { setPositionSearch(e.target.value); setGlobalSearch(''); }}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E293B', margin: 0 }}>Как будет (Предпросмотр изменений)</h2>
          {changeCount > 0 && <span style={{ background: '#F59E0B', color: '#FFF', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem' }}>Всего изменений: {changeCount}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
          <PreviewBlock title="Компоненты" items={draftData.parts} originalItems={originalData.parts} type="part" />
          <PreviewBlock title="Дефекты" items={draftData.incidents} originalItems={originalData.incidents} type="incident" />
          <PreviewBlock title="Позиции" items={draftData.positions} originalItems={originalData.positions} type="position" />
        </div>

        {JSON.stringify(draftData.links) !== JSON.stringify(originalData.links) && (
          <div style={{ ...reportBlockStyle, marginTop: 16, background: '#F8FAFC' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#475569' }}>Изменения в привязках</h3>
            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
              Дефектов привязано: <b>{draftData.links.partIncidents.length}</b> <span style={{ color: '#94A3B8' }}>(было: {originalData.links.partIncidents.length})</span><br />
              Локаций привязано: <b>{draftData.links.partPositions.length}</b> <span style={{ color: '#94A3B8' }}>(было: {originalData.links.partPositions.length})</span>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? (modal.type === 'part' ? 'Новый компонент' : 'Новый дефект') : modal.mode === 'edit' ? 'Редактировать' : 'Клонировать'} onClose={() => setModal(null)}>
          {(modal.mode === 'add' || modal.mode === 'clone') && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: 4 }}>Код</label>
              <input type="text" value={modalForm.code} onChange={e => setModalForm({ ...modalForm, code: e.target.value })} placeholder="Например, B3020" style={inputStyle} autoFocus />
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: 4 }}>Описание</label>
            <input type="text" value={modalForm.desc} onChange={e => setModalForm({ ...modalForm, desc: e.target.value })} placeholder="Например, Стойка А" style={inputStyle} />
          </div>
          {modal.mode === 'clone' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={modalForm.cloneWithLinks} onChange={e => setModalForm({ ...modalForm, cloneWithLinks: e.target.checked })} />
              Скопировать дефекты и локации
            </label>
          )}
          {modalError && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginBottom: 8 }}>{modalError}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={filterButtonStyle(false)}>Отмена</button>
            <button onClick={handleModalSubmit} style={filterButtonStyle(true)}>Сохранить</button>
          </div>
        </Modal>
      )}

      {viewLinksFor && (
        <LinkManagerModal 
          partCode={viewLinksFor} 
          draftData={draftData} 
          onUpdateDraft={setDraftData} 
          onClose={() => setViewLinksFor(null)} 
        />
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}