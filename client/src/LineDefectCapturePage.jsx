import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
} from '@zxing/library';

const API_BASE = '';
const MAX_PHOTOS = 3;
const MAX_COMMENT = 500;
const VIN_LEN = 17;
const VIN_ALLOWED = /[^A-HJ-NPR-Z0-9]/g;
const STATE_KEY = 'line-defect-capture-state-v1';
const MIN_SUFFIX_LEN = 6;

const LOCATIONS = [
  { code: 'CP7',    label: 'CP7',                  color: '#2563EB' },
  { code: 'CP8',    label: 'CP8',                  color: '#7C3AED' },
  { code: 'SGP',    label: 'СГП (Парковка/Склад)', color: '#059669' },
  { code: 'REPAIR', label: 'Ремзона',              color: '#DC2626' },
];
const LOCATION_BY_CODE = Object.fromEntries(LOCATIONS.map(l => [l.code, l]));

/* ================= helpers ================= */
const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth < 768;
const useIsMobile = () => {
  const [mob, setMob] = useState(isMobileViewport());
  useEffect(() => {
    const h = () => setMob(isMobileViewport());
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mob;
};

const uuid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const sanitizeVin = (s) => String(s || '').toUpperCase().replace(VIN_ALLOWED, '').slice(0, VIN_LEN);

const compressImage = (file, maxW = 1200, quality = 0.75) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = ev.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.15;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 120);
  } catch {}
};
const vibrate = (ms = 60) => { try { navigator.vibrate?.(ms); } catch {} };

const canUseLiveCamera = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  return (
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
};

/* ============================================================
 * ДЕКОДЕР ШТРИХКОДА ИЗ ФОТО
 *   Генерируем варианты (повороты + предобработка) и кормим в ZXing.
 * ============================================================ */
const ROTATIONS = [90, 270, 0, 180]; // VIN-штрихкоды на машинах обычно вертикальные → сначала 90/270

const rotateCanvas = (src, deg) => {
  if (deg === 0) return src;
  const out = document.createElement('canvas');
  if (deg === 90 || deg === 270) {
    out.width = src.height;
    out.height = src.width;
  } else {
    out.width = src.width;
    out.height = src.height;
  }
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  ctx.restore();
  return out;
};

const toGrayContrast = (src, k = 1.6) => {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const im = ctx.getImageData(0, 0, out.width, out.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    let g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    g = (g - 128) * k + 128;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(im, 0, 0);
  return out;
};

const toBinarized = (src, threshold = 128) => {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const im = ctx.getImageData(0, 0, out.width, out.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g > threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(im, 0, 0);
  return out;
};

// ZXing читатель с жёсткими hints (1D + TRY_HARDER)
const makeZxingReader = () => {
  const reader = new MultiFormatReader();
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
  ]);
  reader.setHints(hints);
  return reader;
};

const decodeCanvasWithZxing = (reader, canvas) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = im;

  // В ZXing JS RGBLuminanceSource принимает УЖЕ grayscale-массив (1 байт на пиксель)
  const lum = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    lum[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
  }

  const source = new RGBLuminanceSource(lum, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    const res = reader.decode(bitmap);
    return res.getText();
  } catch {
    return null;
  }
};

// Загрузка файла в <img>
const fileToImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
  img.src = url;
});

const decodeVinFromFile = async (file) => {
  const img = await fileToImage(file);

  // Уменьшаем до 2000px по большей стороне (быстрее обработка, штрихкод читаем)
  const maxDim = 2000;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const base = document.createElement('canvas');
  base.width = Math.round(img.width * scale);
  base.height = Math.round(img.height * scale);
  const bctx = base.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(img, 0, 0, base.width, base.height);

  // Предобработки
  const variants = [];
  variants.push({ name: 'raw', canvas: base });
  variants.push({ name: 'gray', canvas: toGrayContrast(base, 1.6) });
  variants.push({ name: 'bin96',  canvas: toBinarized(base, 96) });
  variants.push({ name: 'bin128', canvas: toBinarized(base, 128) });
  variants.push({ name: 'bin170', canvas: toBinarized(base, 170) });

  const reader = makeZxingReader();

  // Порядок: сначала 90° (вертикальные штрихкоды), потом остальные
  for (const v of variants) {
    for (const deg of ROTATIONS) {
      const rot = rotateCanvas(v.canvas, deg);
      const text = decodeCanvasWithZxing(reader, rot);
      if (text) {
        // лог для отладки — уберите когда стабилизируется
        console.log(`[scanner] ok via ${v.name}/${deg}°: "${text}"`);
        return text;
      }
    }
  }
  throw new Error('not found');
};

const loadState = () => {
  try { const raw = sessionStorage.getItem(STATE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};
const saveState = (s) => { try { sessionStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {} };
const clearState = () => { try { sessionStorage.removeItem(STATE_KEY); } catch {} };

/* ================= Autocomplete ================= */
function Autocomplete({ value, onChange, fetchUrl, placeholder, disabled, label }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const abortRef = useRef(null);
  const touchState = useRef({ startY: 0, moved: false });

  useEffect(() => {
    if (!fetchUrl) { setItems([]); return; }
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(fetchUrl, { signal: ctrl.signal });
        const data = await res.json();
        if (alive) { setItems(Array.isArray(data) ? data : []); setHighlight(0); }
      } catch (e) { if (e.name !== 'AbortError' && alive) setItems([]); }
      if (alive) setLoading(false);
    }, 250);
    return () => { alive = false; clearTimeout(t); ctrl.abort(); };
  }, [fetchUrl]);

  useEffect(() => {
    const h = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h, { passive: true });
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h);
    };
  }, []);

  const labelOf = (it) => it.part_name || it.problem_type || '';
  const keyOf = (it) => labelOf(it) + (it.source || '');
  const pick = (it) => { onChange(labelOf(it)); setOpen(false); };

  const onKeyDown = (e) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(items[highlight]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>{label}</div>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off" autoCorrect="off" spellCheck={false}
        style={{
          width: '100%', padding: '12px 14px', fontSize: 16,
          borderRadius: 10, border: '1px solid #E2E8F0',
          outline: 'none', background: disabled ? '#F1F5F9' : '#FFFFFF',
          boxSizing: 'border-box',
        }}
      />
      {open && (items.length > 0 || loading) && (
        <div
          onTouchStart={(e) => { touchState.current = { startY: e.touches[0].clientY, moved: false }; }}
          onTouchMove={(e) => {
            if (Math.abs(e.touches[0].clientY - touchState.current.startY) > 8) touchState.current.moved = true;
          }}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
            marginTop: 4, maxHeight: 240, overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 12, boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
          }}
        >
          {loading && <div style={{ padding: 12, color: '#94A3B8', fontSize: 13 }}>Поиск…</div>}
          {!loading && items.map((it, idx) => (
            <div
              key={keyOf(it)}
              onMouseDown={(e) => {
                if (touchState.current.moved) { touchState.current.moved = false; return; }
                e.preventDefault(); pick(it);
              }}
              onMouseEnter={() => setHighlight(idx)}
              style={{
                padding: '12px 14px', cursor: 'pointer', fontSize: 15,
                borderBottom: '1px solid #F1F5F9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: idx === highlight ? '#EFF6FF' : '#FFFFFF',
                minHeight: 44,
              }}
            >
              <span>{labelOf(it)}</span>
              {it.source === 'actual' && <span style={{ fontSize: 11, color: '#94A3B8' }}>из истории</span>}
              {it.source === 'global' && <span style={{ fontSize: 11, color: '#94A3B8' }}>глобально</span>}
              {it.source === 'own' && <span style={{ fontSize: 11, color: '#94A3B8' }}>вы вносили</span>}
            </div>
          ))}
          {!loading && items.length === 0 && value.trim() && (
            <div style={{ padding: 12, color: '#94A3B8', fontSize: 13 }}>Ничего не найдено. Уточните название.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= Scanner (live + photo fallback с многоуровневым декодом) ================= */
function BarcodeScannerModal({ onClose, onResult }) {
  const liveSupported = canUseLiveCamera();

  const [mode, setMode] = useState(liveSupported ? 'live' : 'photo');
  const [busy, setBusy] = useState(liveSupported);
  const [hint, setHint] = useState('Наведите камеру на штрихкод');
  const [photoError, setPhotoError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ---------- LIVE ---------- */
  useEffect(() => {
    if (mode !== 'live') return;
    let cancelled = false;

    (async () => {
      if (!liveSupported) { setMode('photo'); return; }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        const name = e?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPhotoError('Live-камера запрещена — используйте снимок.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setPhotoError('Камера занята — используйте снимок.');
        } else {
          setPhotoError(e?.message || 'Live-камера недоступна — используйте снимок.');
        }
        setMode('photo');
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
        return;
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch {}
      }

      try {
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (cancelled) return;
          if (result) {
            const text = result.getText().trim();
            const clean = sanitizeVin(text);
            if (clean.length !== VIN_LEN) {
              setHint(`Считано «${text.slice(0, 24)}» — не VIN, продолжаем…`);
              return;
            }
            cancelled = true;
            try { controls.stop(); } catch {}
            try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
            beep(); vibrate(80);
            onResult(clean);
          }
        });
        controlsRef.current = controls;
        setBusy(false);
      } catch (e) {
        console.error('[scanner] decode error:', e);
        setPhotoError('Live-распознавание не запустилось — используйте снимок.');
        setMode('photo');
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch {}
      try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    };
  }, [mode, onResult, liveSupported]);

  /* ---------- PHOTO ---------- */
  const openFilePicker = () => fileInputRef.current?.click();

  const handlePhotoFile = async (file) => {
    if (!file) return;
    setMode('processing');
    setPhotoError(null);
    try { setPreviewUrl(URL.createObjectURL(file)); } catch { setPreviewUrl(null); }

    const t0 = Date.now();
    try {
      const text = await decodeVinFromFile(file);
      const clean = sanitizeVin(text);
      console.log(`[scanner] decoded in ${Date.now() - t0}ms:`, text);
      if (clean.length !== VIN_LEN) {
        setPhotoError(`Распознано «${text.slice(0, 28)}» — это не VIN. Переснимите, чтобы штрихкод был целиком в кадре.`);
        setMode('photo');
        return;
      }
      beep(); vibrate(80);
      onResult(clean);
    } catch (e) {
      console.warn('[scanner photo] decode failed:', e);
      setPhotoError('Не удалось распознать. Сфотографируйте ближе, штрихкод целиком в кадре, без бликов.');
      setMode('photo');
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) handlePhotoFile(f);
  };

  /* ---------- UI: PHOTO / PROCESSING ---------- */
  if (mode === 'photo' || mode === 'processing') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', zIndex: 9000, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, color: '#FFFFFF', textAlign: 'center', overflow: 'auto',
        }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
            {mode === 'processing' ? 'Распознавание…' : 'Фото штрихкода'}
          </div>
          <div style={{ fontSize: 14, color: '#94A3B8', maxWidth: 320, lineHeight: 1.5, marginBottom: 20 }}>
            {mode === 'processing'
              ? 'Пожалуйста, подождите'
              : 'Сфотографируйте штрихкод на машине — камера откроется автоматически.'}
          </div>

          {previewUrl && mode === 'photo' && (
            <div style={{
              width: 240, height: 240, borderRadius: 12, overflow: 'hidden',
              border: '2px solid #334155', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#1E293B',
            }}>
              <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {mode === 'photo' && (
            <button
              onClick={openFilePicker}
              style={{
                padding: '16px 32px', fontSize: 17, fontWeight: 800,
                borderRadius: 14, border: 'none', cursor: 'pointer',
                background: '#2563EB', color: '#FFFFFF',
                boxShadow: '0 6px 14px rgba(37,99,235,0.5)',
                display: 'inline-flex', alignItems: 'center', gap: 10,
                minWidth: 240, justifyContent: 'center',
              }}
            >
              📸 {previewUrl ? 'Переснять' : 'Сфотографировать'}
            </button>
          )}

          {mode === 'processing' && (
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '4px solid #1E293B', borderTopColor: '#2563EB',
              animation: 'ldspin 0.8s linear infinite',
              marginTop: 10,
            }} />
          )}

          {photoError && mode === 'photo' && (
            <div style={{
              marginTop: 20, padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,0.15)', color: '#FCA5A5',
              border: '1px solid rgba(239,68,68,0.4)',
              fontSize: 13, maxWidth: 340, lineHeight: 1.5,
            }}>⚠ {photoError}</div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>

        <div style={{ padding: 20, background: '#020617', display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {liveSupported && (
            <button
              onClick={() => { setMode('live'); setBusy(true); setPhotoError(null); }}
              style={{
                padding: '12px 24px', borderRadius: 12, border: '1px solid #334155',
                background: 'transparent', color: '#CBD5E1',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >🎥 Живая камера</button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '12px 32px', borderRadius: 12, border: 'none',
              background: '#374151', color: '#FFF',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >Отмена</button>
        </div>

        <style>{`@keyframes ldspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ---------- UI: LIVE ---------- */
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline autoPlay />
        <div style={{
          position: 'absolute', inset: '30% 8%',
          border: '2px solid #22C55E', borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }} />
        {busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#FFF', fontSize: 16, background: 'rgba(0,0,0,0.4)',
          }}>Запуск камеры…</div>
        )}
        {!busy && (
          <div style={{
            position: 'absolute', bottom: 20, left: 0, right: 0,
            textAlign: 'center', color: '#FFF', fontSize: 14,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>{hint}</div>
        )}
      </div>
      <div style={{ padding: 16, background: '#111', display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setMode('photo'); setPhotoError(null); }}
          style={{
            padding: '12px 24px', borderRadius: 12, border: '1px solid #334155',
            background: 'transparent', color: '#CBD5E1',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >📷 Снимок</button>
        <button
          onClick={onClose}
          style={{
            padding: '12px 32px', borderRadius: 12, border: 'none',
            background: '#374151', color: '#FFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >Отмена</button>
      </div>
    </div>
  );
}

/* ================= Confirm ================= */
function ConfirmModal({ text, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 9700, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 16, padding: 22, maxWidth: 320, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: '#1E293B', marginBottom: 18 }}>{text}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFF', color: '#475569', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Отмена</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#DC2626', color: '#FFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

/* ================= Main ================= */
export default function LineDefectCapturePage() {
  const isMobile = useIsMobile();
  const boot = loadState();

  const [vin, setVin] = useState(boot?.vin || '');
  const [vinCheck, setVinCheck] = useState({ state: 'idle', valid: false, reason: '', model: '' });
  const [suffixMatches, setSuffixMatches] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedRaw, setScannedRaw] = useState(boot?.scannedRaw || null);

  const [captureLocation, setCaptureLocation] = useState(boot?.captureLocation || '');

  const [partName, setPartName] = useState(boot?.partName || '');
  const [problemType, setProblemType] = useState(boot?.problemType || '');

  const [photos, setPhotos] = useState(boot?.photos || []);
  const [comment, setComment] = useState(boot?.comment || '');
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [confirmPhotoId, setConfirmPhotoId] = useState(null);
  const [clientId] = useState(() => boot?.clientId || uuid());

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const vinAbortRef = useRef(null);
  const pickingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/line-defects/photos-by-session/${clientId}`);
        if (!res.ok) return;
        const serverPhotos = await res.json();
        if (!Array.isArray(serverPhotos)) return;
        setPhotos(prev => {
          const localIds = new Set(prev.map(p => p.id));
          const serverIds = new Set(serverPhotos.map(p => p.id));
          const kept = prev.filter(p => serverIds.has(p.id));
          const merged = [...kept];
          serverPhotos.forEach(sp => { if (!localIds.has(sp.id)) merged.push(sp); });
          return merged;
        });
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveState({ vin, partName, problemType, comment, clientId, photos, scannedRaw, captureLocation });
  }, [vin, partName, problemType, comment, clientId, photos, scannedRaw, captureLocation]);

  useEffect(() => {
    if (pickingRef.current) { pickingRef.current = false; return; }
    const clean = sanitizeVin(vin);

    if (clean.length === 0) {
      setVinCheck({ state: 'idle', valid: false, reason: '', model: '' });
      setSuffixMatches([]);
      return;
    }

    if (clean.length < MIN_SUFFIX_LEN) {
      setVinCheck({ state: 'idle', valid: false, model: '', reason: `Ещё ${MIN_SUFFIX_LEN - clean.length} символ(ов) для поиска` });
      setSuffixMatches([]);
      return;
    }

    if (vinAbortRef.current) vinAbortRef.current.abort();
    const ctrl = new AbortController();
    vinAbortRef.current = ctrl;

    setVinCheck({ state: 'checking', valid: false, reason: '', model: '' });
    setSuffixMatches([]);

    const delay = clean.length === VIN_LEN ? 350 : 600;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/line-defects/lookup-vin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin: clean }),
          signal: ctrl.signal,
        });
        const data = await res.json();

        if (data.valid) {
          if (data.vin && data.vin !== clean) {
            pickingRef.current = true;
            setVin(data.vin);
          }
          setVinCheck({ state: 'ok', valid: true, reason: '', model: data.model || '', matched: data.matched });
        } else if (data.multiple && Array.isArray(data.matches)) {
          setVinCheck({ state: 'idle', valid: false, reason: data.reason || '', model: '' });
          setSuffixMatches(data.matches);
        } else {
          setVinCheck({ state: 'err', valid: false, reason: data.reason || 'Не найден', model: '' });
        }
      } catch (e) {
        if (e.name !== 'AbortError') setVinCheck({ state: 'err', valid: false, reason: e.message, model: '' });
      }
    }, delay);

    return () => clearTimeout(t);
  }, [vin]);

  const pickSuffixMatch = (m) => {
    pickingRef.current = true;
    setVin(m.vin);
    setSuffixMatches([]);
    setVinCheck({ state: 'ok', valid: true, reason: '', model: m.model || '', matched: 'picked' });
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true); setError(null);
    try {
      let current = [...photos];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (current.length >= MAX_PHOTOS) break;
        const dataUrl = await compressImage(file);
        const res = await fetch(`${API_BASE}/api/line-defects/photo`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dataUrl, client_id: clientId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Ошибка загрузки');
        current = [...current, { id: json.id, url: json.url }];
        setPhotos(current);
      }
    } catch (e) { setError('Ошибка фото: ' + e.message); }
    finally { setUploading(false); }
  };

  const confirmRemove = (id) => setConfirmPhotoId(id);
  const doRemove = async () => {
    const id = confirmPhotoId; setConfirmPhotoId(null);
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/line-defects/photo/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Не удалось удалить');
      }
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (e) { setError('Удаление фото: ' + e.message); }
  };

  const submit = async () => {
    setError(null);
    if (!vinCheck.valid) return setError('VIN не подтверждён');
    if (!captureLocation) return setError('Выберите место занесения');
    if (!partName.trim()) return setError('Не выбрана деталь');
    if (!problemType.trim()) return setError('Не выбран дефект');
    if (photos.length === 0) return setError('Добавьте минимум 1 фото');
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/line-defects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin,
          capture_location: captureLocation,
          part_name: partName.trim(),
          problem_type: problemType.trim(),
          comment: comment.trim(),
          entry_mode: scannedRaw ? 'barcode' : 'manual',
          barcode_raw: scannedRaw || null,
          photo_ids: photos.map(p => p.id),
          client_id: clientId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ошибка отправки');
      beep(); clearState();
      setDone({ id: json.id, vin, partName, problemType, dup: json.duplicate, captureLocation });
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    clearState();
    setVin(''); setVinCheck({ state: 'idle', valid: false, reason: '', model: '' });
    setSuffixMatches([]);
    setScannedRaw(null); setCaptureLocation('');
    setPartName(''); setProblemType('');
    setPhotos([]); setComment('');
    setDone(null); setError(null);
  };

  const cardStyle = {
    background: '#FFFFFF', borderRadius: 14, padding: isMobile ? 14 : 22,
    boxShadow: '0 3px 12px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9',
    marginBottom: 12,
  };
  const bigButton = {
    width: '100%', padding: isMobile ? '14px 16px' : '16px 20px',
    fontSize: isMobile ? 16 : 18, fontWeight: 800,
    borderRadius: 12, border: 'none', cursor: 'pointer',
    background: '#2563EB', color: '#FFFFFF',
    boxShadow: '0 6px 14px rgba(37,99,235,0.3)',
  };
  const secondaryButton = {
    ...bigButton, background: '#F1F5F9', color: '#1E293B',
    boxShadow: 'none', border: '1px solid #E2E8F0',
  };
  const stepLabel = {
    fontSize: 11, fontWeight: 800, color: '#94A3B8',
    textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5,
  };

  if (done) {
    const loc = LOCATION_BY_CODE[done.captureLocation];
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{ padding: isMobile ? 12 : 20, maxWidth: 640, margin: '0 auto', fontFamily: 'Inter, Arial, sans-serif' }}>
          <div style={{ ...cardStyle, textAlign: 'center', padding: isMobile ? 24 : 40 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>✅</div>
            <h2 style={{ margin: '0 0 10px', color: '#166534', fontSize: 20 }}>
              {done.dup ? 'Дефект уже был сохранён' : 'Дефект сохранён'}
            </h2>
            <div style={{ color: '#475569', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              <div><b>VIN:</b> {done.vin}</div>
              <div><b>Место:</b> {loc?.label || done.captureLocation}</div>
              <div><b>Деталь:</b> {done.partName}</div>
              <div><b>Дефект:</b> {done.problemType}</div>
            </div>
            <button onClick={reset} style={bigButton}>Зафиксировать следующий</button>
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = vinCheck.valid && captureLocation && partName.trim() && problemType.trim() && photos.length > 0 && !submitting;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{
        padding: isMobile ? 10 : 32,
        maxWidth: isMobile ? 640 : 780,
        margin: '0 auto',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      }}>
        <h1 style={{ fontSize: isMobile ? 18 : 28, fontWeight: 900, color: '#0F172A', margin: isMobile ? '4px 0 12px' : '4px 0 24px' }}>
          Фиксация дефекта
        </h1>

        <div style={cardStyle}>
          <div style={stepLabel}>Шаг 1 — VIN</div>
          <input
            value={vin}
            onChange={(e) => { setVin(sanitizeVin(e.target.value)); setScannedRaw(null); setSuffixMatches([]); }}
            onPaste={(e) => {
              e.preventDefault();
              setVin(sanitizeVin(e.clipboardData.getData('text')));
              setSuffixMatches([]);
            }}
            placeholder="17 символов или последние 6+"
            maxLength={VIN_LEN}
            inputMode="text"
            autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
            style={{
              width: '100%', padding: '12px 14px', fontSize: 16,
              borderRadius: 10, border: '1px solid #E2E8F0',
              outline: 'none', fontFamily: 'monospace', letterSpacing: '0.5px',
              boxSizing: 'border-box', marginBottom: 10,
            }}
          />
          <button
            onClick={() => setScannerOpen(true)}
            style={{ ...secondaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            📷 Сканировать штрихкод
          </button>

          {(vinCheck.state !== 'idle' || vinCheck.reason) && suffixMatches.length === 0 && (
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 10,
              background: vinCheck.state === 'ok' ? '#ECFDF5' : vinCheck.state === 'err' ? '#FEF2F2' : vinCheck.state === 'checking' ? '#F1F5F9' : 'transparent',
              color: vinCheck.state === 'ok' ? '#166534' : vinCheck.state === 'err' ? '#991B1B' : '#475569',
              fontSize: 13,
              border: vinCheck.state === 'ok' ? '1px solid #A7F3D0' : vinCheck.state === 'err' ? '1px solid #FECACA' : 'none',
            }}>
              {vinCheck.state === 'ok' && (
                <>
                  ✔ Модель: <b>{vinCheck.model}</b>
                  {scannedRaw && ' · сканер'}
                  {vinCheck.matched === 'suffix' && ' · найдено по 6 символам'}
                </>
              )}
              {vinCheck.state === 'err' && <>✖ {vinCheck.reason}</>}
              {vinCheck.state === 'checking' && <>⏳ Проверка…</>}
              {vinCheck.state === 'idle' && vinCheck.reason && <>· {vinCheck.reason}</>}
            </div>
          )}

          {suffixMatches.length > 0 && (
            <div style={{ marginTop: 10, border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF' }}>
              <div style={{ padding: '8px 12px', background: '#F1F5F9', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Найдено {suffixMatches.length} — выберите VIN
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {suffixMatches.map(m => (
                  <div
                    key={m.vin}
                    onClick={() => pickSuffixMatch(m)}
                    style={{
                      padding: '12px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: 10, minHeight: 44,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#2563EB', fontWeight: 700, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.vin}</span>
                    <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{m.model}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, opacity: vinCheck.valid ? 1 : 0.5, pointerEvents: vinCheck.valid ? 'auto' : 'none' }}>
          <div style={stepLabel}>Шаг 2 — Место занесения</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8 }}>
            {LOCATIONS.map(loc => {
              const active = captureLocation === loc.code;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => setCaptureLocation(loc.code)}
                  style={{
                    padding: isMobile ? '16px 8px' : '18px 10px',
                    borderRadius: 12,
                    border: active ? `2px solid ${loc.color}` : '1px solid #E2E8F0',
                    background: active ? loc.color : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#1E293B',
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    minHeight: isMobile ? 60 : 72,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', lineHeight: 1.2,
                    boxShadow: active ? `0 6px 16px ${loc.color}40` : '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >{loc.label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ ...cardStyle, opacity: vinCheck.valid ? 1 : 0.5, pointerEvents: vinCheck.valid ? 'auto' : 'none' }}>
          <div style={stepLabel}>Шаг 3 — Что и где</div>
          <Autocomplete
            label="Деталь"
            value={partName}
            onChange={(v) => { setPartName(v); if (problemType) setProblemType(''); }}
            placeholder="Начните вводить название"
            fetchUrl={vinCheck.valid && vinCheck.model
              ? `${API_BASE}/api/line-defects/suggest-parts?model=${encodeURIComponent(vinCheck.model)}&q=${encodeURIComponent(partName)}`
              : null}
            disabled={!vinCheck.valid}
          />
          <div style={{ height: 12 }} />
          <Autocomplete
            label="Дефект"
            value={problemType}
            onChange={setProblemType}
            placeholder={partName ? 'Начните вводить тип дефекта' : 'Сначала выберите деталь'}
            fetchUrl={vinCheck.valid && partName
              ? `${API_BASE}/api/line-defects/suggest-defects?model=${encodeURIComponent(vinCheck.model)}&part=${encodeURIComponent(partName)}&q=${encodeURIComponent(problemType)}`
              : null}
            disabled={!partName}
          />
        </div>

        <div style={cardStyle}>
          <div style={stepLabel}>Шаг 4 — Фото и комментарий</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {photos.map(p => (
              <div key={p.id} style={{ position: 'relative', width: isMobile ? 84 : 100, height: isMobile ? 84 : 100 }}>
                <img
                  src={`${API_BASE}${p.url}`} alt=""
                  onClick={() => setLightbox(`${API_BASE}${p.url}`)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1px solid #E2E8F0', cursor: 'zoom-in' }}
                />
                <button
                  onClick={() => confirmRemove(p.id)}
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 24, height: 24,
                    borderRadius: '50%', border: 'none', background: '#DC2626',
                    color: '#FFF', fontWeight: 800, cursor: 'pointer', fontSize: 12,
                  }}
                >×</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: isMobile ? 84 : 100, height: isMobile ? 84 : 100, borderRadius: 10,
                  border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B',
                  fontSize: 28, cursor: uploading ? 'wait' : 'pointer',
                }}
              >{uploading ? '…' : '+'}</button>
            )}
            <input
              ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = Array.from(e.target.files || []);
                e.target.value = '';
                handleFiles(f);
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#94A3B8' }}>{photos.length} / {MAX_PHOTOS} фото</div>
          <div style={{ height: 12 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Комментарий (необязательно)</div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            rows={2}
            placeholder="Комментарий…"
            style={{
              width: '100%', padding: 10, fontSize: 15, borderRadius: 10,
              border: '1px solid #E2E8F0', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 10, color: '#94A3B8' }}>{comment.length}/{MAX_COMMENT}</div>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#FEF2F2', color: '#991B1B', borderRadius: 10, marginBottom: 10, fontSize: 13, border: '1px solid #FECACA' }}>
            ⚠ {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            ...bigButton,
            opacity: canSubmit ? 1 : 0.5,
            cursor: submitting ? 'wait' : (canSubmit ? 'pointer' : 'not-allowed'),
          }}
        >
          {submitting ? 'Отправка…' : '✅ Сохранить дефект'}
        </button>

        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(15,23,42,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: 12 }} />
            <button onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#FFF', fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
        )}

        {confirmPhotoId && (
          <ConfirmModal text="Удалить это фото?" onConfirm={doRemove} onCancel={() => setConfirmPhotoId(null)} />
        )}

        {scannerOpen && (
          <BarcodeScannerModal
            onClose={() => setScannerOpen(false)}
            onResult={(clean) => {
              setScannerOpen(false);
              setScannedRaw(clean);
              setVin(clean);
            }}
          />
        )}
      </div>
    </div>
  );
}