import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:40000';

export default function WarrantyPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [fileData, setFileData] = useState([]);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [claims, setClaims] = useState([]);

  const handlePasswordSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/warranty/check-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        setAuthenticated(true);
        setPasswordError('');
        fetchClaims();
      } else {
        setPasswordError('Неверный пароль');
      }
    } catch (err) {
      setPasswordError('Ошибка соединения');
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/warranty/claims`);
      const json = await res.json();
      setClaims(json);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (json.length < 2) {
        alert('Файл пуст или не содержит данных');
        return;
      }

      const headers = json[0];
      const rows = json.slice(1).map((row) => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] !== undefined ? row[i] : '';
        });
        return obj;
      });

      setFileData(rows);
      setPreview(rows.slice(0, 10));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (fileData.length === 0) return;
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/warranty/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: fileData }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Загружено ${json.inserted} записей`);
        setFileData([]);
        setPreview([]);
        fetchClaims();
      } else {
        alert('Ошибка загрузки');
      }
    } catch (err) {
      alert('Ошибка соединения');
    } finally {
      setUploading(false);
    }
  };

    if (!authenticated) {
        return (
            <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 400, margin: '100px auto' }}>
            <h2 style={{ marginBottom: 20 }}>Доступ к Warranty</h2>
            <form
                onSubmit={(e) => {
                e.preventDefault();
                handlePasswordSubmit();
                }}
            >
                <input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, width: '100%', marginBottom: 12 }}
                />
                <button
                type="submit"
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
                >
                Войти
                </button>
            </form>
            {passwordError && <p style={{ color: 'red', marginTop: 8 }}>{passwordError}</p>}
            </div>
        );
    }

  return (
    <div style={{ padding: 30, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 800, marginBottom: 30 }}>Warranty – Загрузка данных</h1>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 30 }}>
        <div style={{ flex: 1, minWidth: 300, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 style={{ marginBottom: 16 }}>Загрузить Excel-файл</h3>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ marginBottom: 16 }} />
          {preview.length > 0 && (
            <>
              <h4 style={{ marginBottom: 8 }}>Предпросмотр (первые 10 строк)</h4>
              <div style={{ overflowX: 'auto', maxHeight: 300, marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F3F4F6' }}>
                      {Object.keys(preview[0]).map(h => <th key={h} style={{ padding: '6px 8px', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        {Object.keys(row).map(h => <td key={h} style={{ padding: '6px 8px', borderBottom: '1px solid #F0F0F5' }}>{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleUpload} disabled={uploading} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
                {uploading ? 'Загрузка...' : 'Отправить в базу'}
              </button>
            </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 300, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 style={{ marginBottom: 16 }}>Ранее загруженные записи (последние 1000)</h3>
          {claims.length > 0 ? (
            <div style={{ overflowX: 'auto', maxHeight: 500 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F3F4F6' }}>
                    {Object.keys(claims[0]).filter(k => k !== 'id' && k !== 'uploaded_at').map(h => <th key={h} style={{ padding: '6px 8px', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {claims.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                      {Object.keys(row).filter(k => k !== 'id' && k !== 'uploaded_at').map(h => <td key={h} style={{ padding: '6px 8px', borderBottom: '1px solid #F0F0F5' }}>{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#6B7280' }}>Нет загруженных данных</p>
          )}
        </div>
      </div>
    </div>
  );
}