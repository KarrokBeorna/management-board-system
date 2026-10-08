import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '';
const PAGE_SIZE = 40;

const useIsMobile = () => {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toISO = (dateStr, endOfDay = false) => {
  if (!dateStr) return '';
  return endOfDay ? `${dateStr} 23:59:59` : `${dateStr} 00:00:00`;
};

export default function LineDefectsArchivePage() {
  const isMobile = useIsMobile();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    from: weekAgo, to: today,
    vin: '', model: '', part_name: '', problem_type: '', search: '',
  });
  const [filterOptions, setFilterOptions] = useState({ models: [], parts: [], problems: [] });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [detail, setDetail] = useState(null);

  /* загружаем список значений для фильтров один раз */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/line-defects/filters`);
        const json = await res.json();
        setFilterOptions({
          models: json.models || [],
          parts: json.parts || [],
          problems: json.problems || [],
        });
      } catch {}
    })();
  }, []);

  const buildQuery = useCallback((p = 0) => {
    const qs = new URLSearchParams();
    if (filters.from) qs.set('from', toISO(filters.from, false));
    if (filters.to)   qs.set('to',   toISO(filters.to, true));
    if (filters.vin)  qs.set('vin',  filters.vin.trim());
    if (filters.model && filters.model !== 'ALL') qs.set('model', filters.model);
    if (filters.part_name) qs.set('part_name', filters.part_name);
    if (filters.problem_type) qs.set('problem_type', filters.problem_type);
    if (filters.search) qs.set('search', filters.search.trim());
    qs.set('limit', PAGE_SIZE);
    qs.set('offset', p * PAGE_SIZE);
    return qs.toString();
  }, [filters]);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/line-defects?${buildQuery(p)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ошибка загрузки');
      setItems(json.items || []);
      setTotal(json.total || 0);
      setPage(p);
    } catch (e) {
      setError(e.message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { load(0); }, [load]);

  const set = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  const openDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/line-defects/${id}`);
      const json = await res.json();
      if (res.ok) setDetail(json);
    } catch {}
  };

  /* ---- стили ---- */
  const cardStyle = {
    background: '#FFFFFF', borderRadius: 12, padding: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9',
  };
  const inputStyle = {
    padding: '10px 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid #E2E8F0', outline: 'none', background: '#FFF',
    boxSizing: 'border-box', width: '100%',
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: '#64748B',
    textTransform: 'uppercase', marginBottom: 4, display: 'block',
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{
      padding: isMobile ? 12 : 20,
      maxWidth: 1200, margin: '0 auto',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      minHeight: '100vh', background: '#F8FAFC',
    }}>
      <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0F172A', margin: '4px 0 16px' }}>
        Архив дефектов
        <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginLeft: 10 }}>
          {total > 0 ? `${total} записей` : ''}
        </span>
      </h1>

      {/* ---- Фильтры ---- */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 10,
        }}>
          <div>
            <label style={labelStyle}>Дата с</label>
            <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Дата по</label>
            <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Модель</label>
            <select value={filters.model} onChange={(e) => set('model', e.target.value)} style={inputStyle}>
              <option value="">Все</option>
              {filterOptions.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>VIN</label>
            <input
              value={filters.vin}
              onChange={(e) => set('vin', e.target.value.toUpperCase())}
              placeholder="поиск по VIN"
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: isMobile ? 'span 2' : 'span 2' }}>
            <label style={labelStyle}>Деталь</label>
            <input
              value={filters.part_name}
              onChange={(e) => set('part_name', e.target.value)}
              placeholder="любая часть названия"
              list="parts-list"
              style={inputStyle}
            />
            <datalist id="parts-list">
              {filterOptions.parts.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div style={{ gridColumn: isMobile ? 'span 2' : 'span 2' }}>
            <label style={labelStyle}>Дефект</label>
            <input
              value={filters.problem_type}
              onChange={(e) => set('problem_type', e.target.value)}
              placeholder="любая часть названия"
              list="problems-list"
              style={inputStyle}
            />
            <datalist id="problems-list">
              {filterOptions.problems.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div style={{ gridColumn: isMobile ? 'span 2' : 'span 4' }}>
            <label style={labelStyle}>Общий поиск (VIN, модель, деталь, дефект, комментарий)</label>
            <input
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="начните вводить…"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => load(0)}
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none',
              background: '#2563EB', color: '#FFF', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >Применить</button>
          <button
            onClick={() => {
              setFilters({ from: weekAgo, to: today, vin: '', model: '', part_name: '', problem_type: '', search: '' });
            }}
            style={{
              padding: '10px 18px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#FFF', color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >Сбросить</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#FEF2F2', color: '#991B1B', borderRadius: 10, marginBottom: 12, fontSize: 14, border: '1px solid #FECACA' }}>
          ⚠ {error}
        </div>
      )}

      {/* ---- Сетка карточек ---- */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Загрузка…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Ничего не найдено</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {items.map(it => {
            const firstPhoto = it.photos?.find(p => !p.deleted && p.url);
            return (
              <div
                key={it.id}
                onClick={() => openDetail(it.id)}
                style={{ ...cardStyle, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 90, height: 90, borderRadius: 8, overflow: 'hidden',
                    background: '#F1F5F9', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94A3B8', fontSize: 11, textAlign: 'center',
                  }}>
                    {firstPhoto ? (
                      <img src={`${API_BASE}${firstPhoto.url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : 'нет фото'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#2563EB', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.vin}
                    </div>
                    <div style={{ fontSize: 13, color: '#1E293B', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.model} · {it.part_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.problem_type}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      {fmtDate(it.created_at)}
                    </div>
                  </div>
                  {it.photos?.length > 1 && (
                    <div style={{ fontSize: 11, color: '#94A3B8', alignSelf: 'flex-start' }}>
                      📷 {it.photos.length}
                    </div>
                  )}
                </div>
                {it.comment && (
                  <div style={{
                    fontSize: 12, color: '#475569', fontStyle: 'italic',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    «{it.comment}»
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Пагинация ---- */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20, paddingBottom: 20 }}>
          <button
            onClick={() => load(Math.max(0, page - 1))}
            disabled={page === 0 || loading}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#FFF', color: '#475569', fontWeight: 700, fontSize: 14,
              cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1,
            }}
          >← Назад</button>
          <span style={{ fontSize: 13, color: '#475569' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => load(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1 || loading}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#FFF', color: '#475569', fontWeight: 700, fontSize: 14,
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1,
            }}
          >Вперёд →</button>
        </div>
      )}

      {/* ---- Модалка деталей ---- */}
      {detail && (
        <div
          onClick={() => setDetail(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9600,
            background: 'rgba(15,23,42,0.75)',
            display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
            padding: isMobile ? 0 : 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFF', borderRadius: isMobile ? '16px 16px 0 0' : 16,
              width: '100%', maxWidth: isMobile ? '100%' : 640,
              maxHeight: isMobile ? '92vh' : '90vh',
              overflow: 'auto', padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>
                Дефект #{detail.id}
              </div>
              <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#94A3B8' }}>×</button>
            </div>

            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, marginBottom: 14 }}>
              <div><b>VIN:</b> <span style={{ fontFamily: 'monospace' }}>{detail.vin}</span></div>
              <div><b>Модель:</b> {detail.model}</div>
              <div><b>Деталь:</b> {detail.part_name}</div>
              <div><b>Дефект:</b> {detail.problem_type}</div>
              <div><b>Создан:</b> {fmtDate(detail.created_at)}</div>
              <div><b>Способ ввода:</b> {detail.entry_mode === 'barcode' ? '📷 сканер' : '✍️ вручную'}</div>
              {detail.barcode_raw && <div><b>Считано:</b> <code>{detail.barcode_raw}</code></div>}
              {detail.comment && <div><b>Комментарий:</b> {detail.comment}</div>}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {detail.photos?.map(p => (
                <div key={p.id} style={{ width: 110, height: 110, borderRadius: 10, overflow: 'hidden', background: '#F1F5F9' }}>
                  {p.deleted || !p.url ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 11, padding: 8, textAlign: 'center' }}>
                      фото удалено<br />(9 мес)
                    </div>
                  ) : (
                    <img
                      src={`${API_BASE}${p.url}`}
                      alt=""
                      onClick={() => setLightbox(`${API_BASE}${p.url}`)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Lightbox ---- */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 9700, background: 'rgba(15,23,42,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: 12 }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#FFF', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  );
}