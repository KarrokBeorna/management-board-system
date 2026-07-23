require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectTimeout: 10000,
  dateStrings: true,
});

const notesPool = mysql.createPool({
  host: process.env.NOTES_HOST,
  port: parseInt(process.env.NOTES_PORT) || 3306,
  user: process.env.NOTES_USER,
  password: process.env.NOTES_PASSWORD,
  database: process.env.NOTES_NAME,
  waitForConnections: true,
  connectTimeout: 10000,
  dateStrings: true,
});

async function checkDatabaseConnection() {
  try {
    console.log('Проверка подключения к удалённой БД...');
    const connection = await pool.getConnection();
    console.log('OK!');
    connection.release();
    return true;
  } catch (err) {
    console.error('ОШИБКА:', err.message);
    return false;
  }
}

async function checkNotesDatabaseConnection() {
  try {
    console.log('Проверка подключения к локальной БД заметок...');
    const connection = await notesPool.getConnection();
    console.log('OK!');
    connection.release();
    return true;
  } catch (err) {
    console.error('ОШИБКА:', err.message);
    return false;
  }
}

// =====================================================
// СТАРЫЕ ЭНДПОИНТЫ
// =====================================================
app.get('/api/tables', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/defects', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM at_qm_defect_info LIMIT 100');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cars-count', async (req, res) => {
  try {
    const { model, date } = req.query;
    if (!date) return res.json({ CARS_COUNT: 0 });

    let sql;
    let params;

    if (model) {
      sql = `SELECT COUNT(DISTINCT VIN) AS CARS_COUNT FROM at_om_wiptrackinghistory WHERE WC_NAME IN ('CP72') AND MODEL = ? AND DATE(CREATION_TIME) = ?`;
      params = [model, date];
    } else {
      sql = `SELECT COUNT(DISTINCT VIN) AS CARS_COUNT FROM at_om_wiptrackinghistory WHERE WC_NAME IN ('CP72') AND DATE(CREATION_TIME) = ?`;
      params = [date];
    }

    console.log(`→ Машины: model=${model || 'ALL'}, date=${date}`);
    const [rows] = await pool.query(sql, params);
    console.log(`  Результат: ${rows[0]?.CARS_COUNT || 0}`);

    res.json({ CARS_COUNT: rows[0]?.CARS_COUNT || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/defects-dashboard', async (req, res) => {
  try {
    const { checkpoint, defectType } = req.query;
    const type = defectType || 'default';
    console.log(`=== ЗАПРОС ДЕФЕКТОВ (checkpoint: ${checkpoint || 'ALL'}, type: ${type}) ===`);

    let whereClause;

    const cp7BaseCondition = `
      (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1')
        OR QM_DEF.POST_NAME IN ('PIP2', 'PIP4', 'PIP9'))
    `;
    const cp8BaseCondition = `
      QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')
    `;

    let checkpointCondition;
    if (checkpoint === 'CP7') {
      checkpointCondition = cp7BaseCondition;
    } else if (checkpoint === 'CP8') {
      checkpointCondition = cp8BaseCondition;
    } else {
      checkpointCondition = `(${cp7BaseCondition} OR ${cp8BaseCondition})`;
    }

    if (type === 'default') {
      if (checkpoint === 'CP7') {
        whereClause = `
          AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1')
            OR (QM_DEF.POST_NAME IN ('PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1))
        `;
      } else if (checkpoint === 'CP8') {
        whereClause = `
          AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')
        `;
      } else {
        whereClause = `
          AND (
            (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1')
              OR (QM_DEF.POST_NAME IN ('PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1))
            OR
            (QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL'))
          )
        `;
      }
    } else if (type === 'offline') {
      whereClause = ` AND ${checkpointCondition} AND S_OFFLINE = 1`;
    } else if (type === 'online') {
      whereClause = ` AND ${checkpointCondition} AND S_OFFLINE = 0`;
    }

    const query = `
      SELECT 
        PART_NAME,
        PROBLEM_TYPE,
        CONCAT(PART_NAME, ' ', PROBLEM_TYPE) AS PP,
        DATE(QM_DEF.CREATION_TIME) AS CREATION_TIME,
        wo.MODEL,
        COUNT(*) AS QTY_DEF
      FROM (
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_TIME, CHECK_POINT, POST_NAME,
          (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
          PART_NAME, PROBLEM_TYPE
        FROM at_biw_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_TIME, CHECK_POINT, POST_NAME,
          (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
          PART_NAME, PROBLEM_TYPE
        FROM at_paint_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_TIME, CHECK_POINT, POST_NAME,
          (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
          PART_NAME, PROBLEM_TYPE
        FROM at_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE 1=1 ${whereClause}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
      GROUP BY PART_NAME, PROBLEM_TYPE, DATE(QM_DEF.CREATION_TIME), wo.MODEL
      ORDER BY CREATION_TIME DESC
      LIMIT 5000
    `;

    const [rows] = await pool.query(query);
    console.log(`→ Получено строк: ${rows.length}`);

    const result = rows.map(row => ({
      CREATION_TIME: row.CREATION_TIME,
      MODEL: row.MODEL || 'UNKNOWN',
      PART_NAME: row.PART_NAME || '',
      PROBLEM_TYPE: row.PROBLEM_TYPE || '',
      MPP: `${row.MODEL || 'UNKNOWN'} ${row.PP}`,
      DEFECTS_COUNT: Number(row.QTY_DEF) || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ЗАМЕТКИ
// =====================================================
app.get('/api/defect-notes', async (req, res) => {
  try {
    const [rows] = await notesPool.query('SELECT * FROM defect_user_notes');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения заметок:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/defect-notes', async (req, res) => {
  try {
    const { mpp, responsible, action } = req.body;
    if (!mpp) return res.status(400).json({ error: 'MPP обязателен' });

    const sql = `
      INSERT INTO defect_user_notes (mpp, responsible, action) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
        responsible = VALUES(responsible), 
        action = VALUES(action), 
        updated_at = CURRENT_TIMESTAMP
    `;
    await notesPool.query(sql, [mpp, responsible || '', action || '']);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка сохранения заметки:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ЗАПУСК
// =====================================================
const PORT = process.env.PORT || 40000;

async function startServer() {
  const dbOk = await checkDatabaseConnection();
  const notesOk = await checkNotesDatabaseConnection();

  if (!dbOk || !notesOk) {
    console.log('Сервер НЕ запущен из-за проблем с БД.');
    process.exit(1);
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();