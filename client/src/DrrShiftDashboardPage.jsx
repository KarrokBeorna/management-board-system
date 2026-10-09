import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '';
const PIE_COLORS = ['#10B981', '#EF4444'];
const MAX_PHOTOS_PER_BLOCK = 3;

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

const filterGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

const filterButtonStyle = (active, activeColor = '#2563EB') => ({
  padding: '10px 22px',
  borderRadius: '12px',
  border: 'none',
  fontWeight: 700,
  fontSize: '1rem',
  background: active ? activeColor : '#FFFFFF',
  color: active ? '#FFFFFF' : '#64748B',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.2s',
});

const dateSelectStyle = {
  padding: '10px 22px',
  borderRadius: '12px',
  border: 'none',
  fontWeight: 700,
  fontSize: '1rem',
  background: '#FFFFFF',
  color: '#1E293B',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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

const columnHeaderStyle = (isDark) => ({
  background: isDark ? '#1E293B' : '#FFFFFF',
  color: isDark ? '#FFFFFF' : '#1E293B',
  padding: '14px 20px',
  borderRadius: '12px',
  fontWeight: 900,
  fontSize: '1.4rem',
  textAlign: 'center',
  letterSpacing: '1px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
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

const addPhotoButtonStyle = {
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px dashed #CBD5E1',
  background: '#F8FAFC',
  color: '#475569',
  fontWeight: 600,
  fontSize: '0.8rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.2s',
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
    cp7: { dash: normalizeReport('cp7', cp7), top: Array.isArray(cp7top) ? cp7top.slice(0, 20) : [] },
    adas: { dash: normalizeReport('adas', adas), top: Array.isArray(adasTop) ? adasTop.slice(0, 20) : [] },
    cpfinal: { dash: normalizeReport('cpfinal', cpfinal), top: Array.isArray(cpfinalTop) ? cpfinalTop.slice(0, 20) : [] },
  };
};

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
};

// Разбор photo_key вида "2026-10-05_A_cp7"
const parsePhotoKey = (key) => {
  if (!key) return { date: '', letter: '', checkpoint: '' };
  const parts = String(key).split('_');
  if (parts.length < 3) return { date: parts[0] || '', letter: '', checkpoint: '' };
  return {
    date: parts[0],
    letter: parts[1],
    checkpoint: parts.slice(2).join('_'),
  };
};

/* ===================== КОМПРЕССИЯ ФОТО ===================== */
const compressImage = (file, maxWidth = 900) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = ev.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/* ===================== КОМПОНЕНТЫ ===================== */

function PieBlock({ drrPercent, okVins, totalVins }) {
  const data = [
    { name: 'DRR', value: drrPercent },
    { name: 'NOK', value: Math.max(0, 100 - drrPercent) },
  ];
  return (
    <div style={{ position: 'relative', width: 220, height: 220, flexShrink: 0 }}>
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
        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
          {drrPercent.toFixed(1)}%
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4 }}>
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
              onClick={() => onToggleMark && onToggleMark(key)}
              style={{
                cursor: onToggleMark ? 'pointer' : 'default',
                backgroundColor: marked ? '#FEF3C7' : (i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'),
                transition: 'background-color 0.15s',
              }}
              title={onToggleMark ? 'Нажмите, чтобы выделить/снять выделение' : ''}
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

function PhotoLightbox({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 5000, padding: 24,
      }}
    >
      <img
        src={url}
        alt="Просмотр"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '95vw', maxHeight: '95vh',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          objectFit: 'contain',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: 24,
          width: 44, height: 44, borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.15)',
          color: '#FFFFFF', fontSize: 24,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Закрыть (Esc)"
      >×</button>
    </div>
  );
}

function PhotoArea({ photoKey, photos, onPhotosChange }) {
  const fileInputRef = useRef(null);
  const items = photos[photoKey] || [];
  const canAdd = items.length < MAX_PHOTOS_PER_BLOCK;
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      let currentItems = photos[photoKey] || [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (currentItems.length >= MAX_PHOTOS_PER_BLOCK) break;
        const dataUrl = await compressImage(file);
        const res = await fetch(`${API_BASE}/api/drr-shift-photos/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_key: photoKey, data: dataUrl }),
        });
        if (!res.ok) throw new Error('Ошибка загрузки');
        const json = await res.json();
        currentItems = [
          ...currentItems,
          { id: json.id, url: json.url, mime: 'image/jpeg', uploadedAt: new Date().toISOString() },
        ];
        onPhotosChange(photoKey, currentItems);
      }
    } catch (err) {
      alert('Не удалось загрузить фото: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    uploadFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    uploadFiles(files);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить фото?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/drr-shift-photos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');
      onPhotosChange(photoKey, (photos[photoKey] || []).filter(it => it.id !== id));
    } catch (err) {
      alert('Не удалось удалить: ' + err.message);
    }
  };

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid #F1F5F9',
        background: dragging ? '#F0F9FF' : 'transparent',
        borderRadius: 8,
        transition: 'background 0.2s',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
          Фото ({items.length}/{MAX_PHOTOS_PER_BLOCK})
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAdd || uploading}
          style={{ ...addPhotoButtonStyle, opacity: (canAdd && !uploading) ? 1 : 0.4, cursor: (canAdd && !uploading) ? 'pointer' : 'not-allowed' }}
        >
          {uploading ? '⏳ Загрузка...' : '📷 Добавить фото'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>

      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {items.map((it) => (
            <div
              key={it.id}
              onClick={() => setLightboxUrl(`${API_BASE}${it.url}`)}
              style={{
                position: 'relative',
                width: 140,
                height: 140,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                background: '#F1F5F9',
                cursor: 'zoom-in',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
              }}
              title="Нажмите для увеличения"
            >
              <img
                src={`${API_BASE}${it.url}`}
                alt="Фото"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(it.id); }}
                title="Удалить фото"
                style={{
                  position: 'absolute',
                  top: 6, right: 6,
                  width: 24, height: 24, borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(220,38,38,0.9)',
                  color: '#FFFFFF',
                  fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}

function ReportBlock({
  title,
  blockData,
  markKeyPrefix,
  photoKey,
  marks,
  onToggleMark,
  photos,
  onPhotosChange,
  emptyMessage,
}) {
  const isEmpty = !blockData || blockData.dash.totalVins === 0;

  if (isEmpty) {
    return (
      <div style={reportBlockStyle}>
        <div style={reportTitleStyle}>{title}</div>
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
          {emptyMessage || 'Нет данных'}
        </div>
        <PhotoArea photoKey={photoKey} photos={photos} onPhotosChange={onPhotosChange} />
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
        <div style={{
          flex: 1,
          minWidth: 0,
          height: 320,
          overflowY: 'auto',
          border: '1px solid #F1F5F9',
          borderRadius: 8,
        }}>
          <DefectsTable
            topDefects={blockData.top}
            markKeyPrefix={markKeyPrefix}
            marks={marks}
            onToggleMark={onToggleMark}
          />
        </div>
      </div>
      <PhotoArea photoKey={photoKey} photos={photos} onPhotosChange={onPhotosChange} />
    </div>
  );
}

function ShiftColumn({
  shiftInfo, columnLabel, isDark, marks, onToggleMark, photos, onPhotosChange, baseDate,
}) {
  const isEmptyColumn = !shiftInfo || !shiftInfo.started || !shiftInfo.data;
  const letterKey = shiftInfo?.letter || columnLabel;

  return (
    <div style={columnStyle}>
      <div style={columnHeaderStyle(isDark)}>{columnLabel}</div>
      {isEmptyColumn ? (
        <div style={{ ...reportBlockStyle, padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
          Нет данных — смена ещё не началась
        </div>
      ) : (
        <>
          <ReportBlock
            title="DRR CP7"
            blockData={shiftInfo.data.cp7}
            markKeyPrefix={`${baseDate}_${letterKey}_cp7`}
            photoKey={`${baseDate}_${letterKey}_cp7`}
            marks={marks}
            onToggleMark={onToggleMark}
            photos={photos}
            onPhotosChange={onPhotosChange}
          />
          <ReportBlock
            title="DRR ADAS"
            blockData={shiftInfo.data.adas}
            markKeyPrefix={`${baseDate}_${letterKey}_adas`}
            photoKey={`${baseDate}_${letterKey}_adas`}
            marks={marks}
            onToggleMark={onToggleMark}
            photos={photos}
            onPhotosChange={onPhotosChange}
          />
          <ReportBlock
            title="DRR CPFinal"
            blockData={shiftInfo.data.cpfinal}
            markKeyPrefix={`${baseDate}_${letterKey}_cpfinal`}
            photoKey={`${baseDate}_${letterKey}_cpfinal`}
            marks={marks}
            onToggleMark={onToggleMark}
            photos={photos}
            onPhotosChange={onPhotosChange}
          />
        </>
      )}
    </div>
  );
}

/* ===================== НЕДЕЛЬНАЯ АНАЛИТИКА ===================== */

// Блок readonly фото недели (без добавления и удаления)
function WeeklyPhotosBlock({ photos, loading }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
          Фото недели ({photos.length}/10)
        </span>
        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
          Только для просмотра
        </span>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '0.85rem' }}>
          Загрузка фото...
        </p>
      ) : photos.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '0.85rem' }}>
          За эту неделю фото не прикреплено
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {photos.map((it) => {
            const parsed = parsePhotoKey(it.photoKey);
            const dateLabel = parsed.date
              ? formatDateShort(parsed.date)
              : '';
            const shiftLabel = parsed.letter === 'ALL'
              ? 'сутки'
              : parsed.letter
                ? `смена ${parsed.letter}`
                : '';
            return (
              <div
                key={it.id}
                onClick={() => setLightboxUrl(`${API_BASE}${it.url}`)}
                style={{
                  position: 'relative',
                  width: 140,
                  height: 140,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                  background: '#F1F5F9',
                  cursor: 'zoom-in',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                }}
                title="Нажмите для увеличения"
              >
                <img
                  src={`${API_BASE}${it.url}`}
                  alt="Фото"
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  padding: '4px 8px',
                  background: 'linear-gradient(to top, rgba(15,23,42,0.9), rgba(15,23,42,0))',
                  color: '#FFFFFF',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  pointerEvents: 'none',
                  lineHeight: 1.2,
                }}>
                  <div>{dateLabel}</div>
                  <div style={{ opacity: 0.8, fontWeight: 500 }}>{shiftLabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightboxUrl && (
        <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}

function WeeklyAnalyticsView() {
  const [type, setType] = useState('cp7');
  const [weeksCount, setWeeksCount] = useState(8);
  const [weeksList, setWeeksList] = useState([]);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);

  const [topDefects, setTopDefects] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const typeLabels = {
    cp7: 'DRR CP7',
    adas: 'DRR ADAS',
    cpfinal: 'DRR CPFinal',
  };

  const typeTitle = {
    cp7: 'DRR CP7',
    adas: 'DRR ADAS',
    cpfinal: 'DRR CPFinal',
  };

  const selectedWeek = weeksList[selectedWeekIdx] || null;

  // 1. Загрузка списка недель
  useEffect(() => {
    let cancelled = false;
    setLoadingWeeks(true);
    fetch(`${API_BASE}/api/drr-weekly-analytics/${type}?weeks=${weeksCount}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        const data = json.data || [];
        // последняя неделя — самая свежая, идёт в конце массива (мы делали .reverse() на бэке)
        // отображать хотим в порядке убывания свежести, поэтому последнюю в начало
        const sorted = [...data].reverse();
        setWeeksList(sorted);
        setSelectedWeekIdx(0);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Ошибка загрузки недель:', err.message);
          setWeeksList([]);
        }
      })
      .finally(() => { if (!cancelled) setLoadingWeeks(false); });
    return () => { cancelled = true; };
  }, [type, weeksCount]);

  // 2. Загрузка топа дефектов за выбранную неделю
  useEffect(() => {
    if (!selectedWeek) { setTopDefects([]); return; }
    const start = `${selectedWeek.weekStart} 00:00:00`;
    const end = `${selectedWeek.weekEnd} 23:59:59`;
    const params = new URLSearchParams({ startTime: start, endTime: end });

    let url;
    if (type === 'cp7') url = `${API_BASE}/api/drr-cp7-top-defects?${params}`;
    else if (type === 'adas') url = `${API_BASE}/api/drr-tl-top-defects?${params}`;
    else if (type === 'cpfinal') url = `${API_BASE}/api/drr-cpfinal-top-defects?${params}`;
    else { setTopDefects([]); return; }

    setLoadingTop(true);
    fetch(url)
      .then(r => r.json())
      .then(json => setTopDefects(Array.isArray(json) ? json.slice(0, 20) : []))
      .catch(() => setTopDefects([]))
      .finally(() => setLoadingTop(false));
  }, [selectedWeek, type]);

  // 3. Загрузка фото недели
  useEffect(() => {
    if (!selectedWeek) { setPhotos([]); return; }
    const params = new URLSearchParams({
      checkpoint: type,
      weekStart: selectedWeek.weekStart,
      weekEnd: selectedWeek.weekEnd,
      limit: 10,
    });
    setLoadingPhotos(true);
    fetch(`${API_BASE}/api/drr-weekly-photos?${params}`)
      .then(r => r.json())
      .then(json => setPhotos(json.photos || []))
      .catch(() => setPhotos([]))
      .finally(() => setLoadingPhotos(false));
  }, [selectedWeek, type]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Управление */}
      <div style={{ ...reportBlockStyle, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '1rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
          Отчёт:
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ ...dateSelectStyle, padding: '8px 14px' }}
          >
            <option value="cp7">DRR CP7</option>
            <option value="adas">DRR ADAS</option>
            <option value="cpfinal">DRR CPFinal</option>
          </select>
        </label>

        <label style={{ fontSize: '1rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
          Количество недель:
          <select
            value={weeksCount}
            onChange={(e) => setWeeksCount(Number(e.target.value))}
            style={{ ...dateSelectStyle, padding: '8px 14px' }}
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={26}>26</option>
            <option value={52}>52</option>
          </select>
        </label>

        <label style={{ fontSize: '1rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
          Неделя:
          <select
            value={selectedWeekIdx}
            onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
            style={{ ...dateSelectStyle, padding: '8px 14px', minWidth: 260 }}
            disabled={weeksList.length === 0}
          >
            {weeksList.length === 0 && <option value={0}>Нет данных</option>}
            {weeksList.map((w, i) => (
              <option key={`${w.year}-${w.weekNumber}`} value={i}>
                W{w.weekNumber} {w.year} ({formatDateShort(w.weekStart)} – {formatDateShort(w.weekEnd)})
              </option>
            ))}
          </select>
        </label>

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
          Недели ISO (Пн–Вс). Дни с DRR = 0% исключены.
        </div>
      </div>

      {/* Карточка недели */}
      {loadingWeeks ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B', fontSize: '1.2rem' }}>
          Загрузка...
        </div>
      ) : !selectedWeek ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: '1.2rem' }}>
          Нет данных за выбранный период
        </div>
      ) : (
        <div style={reportBlockStyle}>
          <div style={reportTitleStyle}>
            <span>
              {typeTitle[type]} — W{selectedWeek.weekNumber} {selectedWeek.year}
            </span>
            <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
              {selectedWeek.weekStart} — {selectedWeek.weekEnd}
              {' '}· учтено {selectedWeek.validDays} / {selectedWeek.totalDays} дн.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <PieBlock
              drrPercent={selectedWeek.avgDrr || 0}
              okVins={selectedWeek.closedVins || 0}
              totalVins={selectedWeek.totalVins || 0}
            />
            <div style={{
              flex: 1,
              minWidth: 0,
              height: 320,
              overflowY: 'auto',
              border: '1px solid #F1F5F9',
              borderRadius: 8,
            }}>
              {loadingTop ? (
                <p style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                  Загрузка топ дефектов...
                </p>
              ) : (
                <DefectsTable
                  topDefects={topDefects}
                  markKeyPrefix={`weekly_${type}_W${selectedWeek.weekNumber}_${selectedWeek.year}`}
                  marks={{}}
                  onToggleMark={null}
                />
              )}
            </div>
          </div>

          <WeeklyPhotosBlock photos={photos} loading={loadingPhotos} />
        </div>
      )}
    </div>
  );
}

/* ===================== ГЛАВНЫЙ КОМПОНЕНТ ===================== */
export default function DrrShiftDashboardPage() {
  const [pageMode, setPageMode] = useState('shift'); // 'shift' | 'weekly'

  const [periodMode, setPeriodMode] = useState('live');
  const [selectedDate, setSelectedDate] = useState(todayMoscowStr());
  const [viewType, setViewType] = useState('shifts');

  const [shiftData, setShiftData] = useState({ a: null, b: null });
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [marks, setMarks] = useState({});
  const [photos, setPhotos] = useState({});

  // ---------- МЕТКИ ----------
  const loadMarks = async (baseDate) => {
    try {
      const res = await fetch(`${API_BASE}/api/drr-shift-marks?prefix=${encodeURIComponent(baseDate + '_')}`);
      if (!res.ok) return;
      const list = await res.json();
      const map = {};
      list.forEach(k => { map[k] = true; });
      setMarks(map);
    } catch (err) {
      console.error('Ошибка загрузки меток:', err.message);
    }
  };

  const onToggleMark = async (key) => {
    setMarks(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
    try {
      await fetch(`${API_BASE}/api/drr-shift-marks/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_key: key }),
      });
    } catch (err) {
      console.error('Ошибка сохранения метки:', err.message);
    }
  };

  // ---------- ФОТО ----------
  const onPhotosChange = (key, newItems) => {
    setPhotos(prev => ({ ...prev, [key]: newItems }));
  };

  const loadPhotos = async (baseDate) => {
    try {
      const res = await fetch(`${API_BASE}/api/drr-shift-photos/all?prefix=${encodeURIComponent(baseDate + '_')}`);
      if (!res.ok) return;
      const grouped = await res.json();
      setPhotos(grouped || {});
    } catch (err) {
      console.error('Ошибка загрузки фото:', err.message);
    }
  };

  useEffect(() => {
    if (pageMode !== 'shift') return;
    const bd = periodMode === 'live' ? todayMoscowStr() : selectedDate;
    loadMarks(bd);
    loadPhotos(bd);
  }, [periodMode, selectedDate, pageMode]);

  // ---------- ДАННЫЕ СМЕН ----------
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
    if (pageMode !== 'shift') return;
    loadData();
  }, [periodMode, selectedDate, viewType, pageMode]);

  useEffect(() => {
    if (pageMode !== 'shift' || periodMode !== 'live') return;
    const id = setInterval(loadData, 60000);
    return () => clearInterval(id);
  }, [periodMode, viewType, pageMode]);

  const dateOptions = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(getMoscowTime());
    d.setUTCDate(d.getUTCDate() - i);
    dateOptions.push(toLocalDateStr(d));
  }

  const baseDate = periodMode === 'live' ? todayMoscowStr() : selectedDate;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>DRR Shift Dashboard</h1>

        <div style={filterGroupStyle}>
          <button
            style={filterButtonStyle(pageMode === 'shift', '#2563EB')}
            onClick={() => setPageMode('shift')}
          >Смены</button>
          <button
            style={filterButtonStyle(pageMode === 'weekly', '#10B981')}
            onClick={() => setPageMode('weekly')}
          >📊 Недельная аналитика</button>

          {pageMode === 'shift' && (
            <>
              <div style={{ width: 1, height: 32, background: '#E2E8F0', margin: '0 4px' }} />

              <button
                style={filterButtonStyle(periodMode === 'live', '#2563EB')}
                onClick={() => setPeriodMode('live')}
              >Live</button>
              <button
                style={filterButtonStyle(periodMode === 'archive', '#2563EB')}
                onClick={() => setPeriodMode('archive')}
              >Архив</button>

              {periodMode === 'archive' && (
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={dateSelectStyle}
                >
                  {dateOptions.map(d => (
                    <option key={d} value={d}>{formatDateShort(d)}</option>
                  ))}
                </select>
              )}

              <div style={{ width: 1, height: 32, background: '#E2E8F0', margin: '0 4px' }} />

              <button
                style={filterButtonStyle(viewType === 'shifts', '#7C3AED')}
                onClick={() => setViewType('shifts')}
              >Смены A / B</button>
              <button
                style={filterButtonStyle(viewType === 'all', '#6B7280')}
                onClick={() => setViewType('all')}
              >Сутки</button>
            </>
          )}
        </div>
      </div>

      {pageMode === 'weekly' && <WeeklyAnalyticsView />}

      {pageMode === 'shift' && (
        <>
          {loading ? (
            <div style={{ fontSize: '1.5rem', textAlign: 'center', padding: '60px', color: '#64748B' }}>
              Загрузка данных...
            </div>
          ) : error ? (
            <div style={{ fontSize: '1.5rem', textAlign: 'center', padding: '60px', color: '#DC2626' }}>
              ❌ {error}
            </div>
          ) : viewType === 'all' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allData && (
                <>
                  <ReportBlock
                    title="DRR CP7"
                    blockData={allData.cp7}
                    markKeyPrefix={`${allData.date}_ALL_cp7`}
                    photoKey={`${allData.date}_ALL_cp7`}
                    marks={marks}
                    onToggleMark={onToggleMark}
                    photos={photos}
                    onPhotosChange={onPhotosChange}
                  />
                  <ReportBlock
                    title="DRR ADAS"
                    blockData={allData.adas}
                    markKeyPrefix={`${allData.date}_ALL_adas`}
                    photoKey={`${allData.date}_ALL_adas`}
                    marks={marks}
                    onToggleMark={onToggleMark}
                    photos={photos}
                    onPhotosChange={onPhotosChange}
                  />
                  <ReportBlock
                    title="DRR CPFinal"
                    blockData={allData.cpfinal}
                    markKeyPrefix={`${allData.date}_ALL_cpfinal`}
                    photoKey={`${allData.date}_ALL_cpfinal`}
                    marks={marks}
                    onToggleMark={onToggleMark}
                    photos={photos}
                    onPhotosChange={onPhotosChange}
                  />
                </>
              )}
            </div>
          ) : (
            <div style={twoColStyle}>
              <ShiftColumn
                shiftInfo={shiftData.a}
                columnLabel="СМЕНА A"
                isDark={false}
                marks={marks}
                onToggleMark={onToggleMark}
                photos={photos}
                onPhotosChange={onPhotosChange}
                baseDate={baseDate}
              />
              <ShiftColumn
                shiftInfo={shiftData.b}
                columnLabel="СМЕНА B"
                isDark={true}
                marks={marks}
                onToggleMark={onToggleMark}
                photos={photos}
                onPhotosChange={onPhotosChange}
                baseDate={baseDate}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}