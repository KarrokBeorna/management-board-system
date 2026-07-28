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

// Старые эндпоинты
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

    const [rows] = await pool.query(sql, params);
    res.json({ CARS_COUNT: rows[0]?.CARS_COUNT || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Основной дашборд (Top DRR) – без смен
app.get('/api/defects-dashboard', async (req, res) => {
  try {
    const { checkpoint, defectType } = req.query;
    const type = defectType || 'default';

    let whereClause;

    if (checkpoint === 'CP7') {
      if (type === 'default') {
        whereClause = `AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1') OR (QM_DEF.POST_NAME IN ('PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1))`;
      } else if (type === 'offline') {
        whereClause = `AND QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1`;
      } else if (type === 'online') {
        whereClause = `AND QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 0`;
      }
    } else if (checkpoint === 'CP8') {
      if (type === 'default') {
        whereClause = `AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')`;
      } else if (type === 'offline') {
        whereClause = `AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL') AND S_OFFLINE = 1`;
      } else if (type === 'online') {
        whereClause = `AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL') AND S_OFFLINE = 0`;
      }
    } else { // ALL
      if (type === 'default') {
        whereClause = `AND ((QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1') OR (QM_DEF.POST_NAME IN ('PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1)) OR QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL'))`;
      } else if (type === 'offline') {
        whereClause = `AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') OR QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')) AND S_OFFLINE = 1`;
      } else if (type === 'online') {
        whereClause = `AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') OR QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')) AND S_OFFLINE = 0`;
      }
    }

    const query = `
      SELECT 
        QM_DEF.PART_NAME,
        QM_DEF.PROBLEM_TYPE,
        CONCAT(QM_DEF.PART_NAME, ' ', QM_DEF.PROBLEM_TYPE) AS PP,
        DATE(QM_DEF.CREATION_TIME) AS CREATION_TIME,
        wo.MODEL,
        COUNT(*) AS QTY_DEF
      FROM (
        SELECT VIN, CREATION_TIME, CHECK_POINT, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_biw_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        UNION ALL
        SELECT VIN, CREATION_TIME, CHECK_POINT, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_paint_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        UNION ALL
        SELECT VIN, CREATION_TIME, CHECK_POINT, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE 1=1 ${whereClause}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
      GROUP BY QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, DATE(QM_DEF.CREATION_TIME), wo.MODEL
      ORDER BY CREATION_TIME DESC
      LIMIT 5000
    `;

    const [rows] = await pool.query(query);
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

// ================== НОВЫЙ ЭНДПОИНТ ДЛЯ DAILY TOP ==================
app.get('/api/daily-top', async (req, res) => {
  try {
    const { checkpoint, defectType, shift } = req.query;
    const type = defectType || 'default';
    const shiftMode = shift || 'all';   // 'all', 'day', 'night'

    let whereClause;

    // Фильтр по чекпоинту и типу (такой же, как в основном дашборде)
    if (checkpoint === 'CP7') {
      if (type === 'default') {
        whereClause = `AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1') OR (QM_DEF.POST_NAME IN ('PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1))`;
      } else if (type === 'offline') {
        whereClause = `AND QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1`;
      } else if (type === 'online') {
        whereClause = `AND QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 0`;
      }
    } else if (checkpoint === 'CP8') {
      if (type === 'default') {
        whereClause = `AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')`;
      } else if (type === 'offline') {
        whereClause = `AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL') AND S_OFFLINE = 1`;
      } else if (type === 'online') {
        whereClause = `AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL') AND S_OFFLINE = 0`;
      }
    } else { // ALL
      if (type === 'default') {
        whereClause = `AND ((QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1') OR (QM_DEF.POST_NAME IN ('PIP2', 'PIP4', 'PIP9') AND S_OFFLINE = 1)) OR QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL'))`;
      } else if (type === 'offline') {
        whereClause = `AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') OR QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')) AND S_OFFLINE = 1`;
      } else if (type === 'online') {
        whereClause = `AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') OR QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')) AND S_OFFLINE = 0`;
      }
    }

    // Фильтр по смене
    let shiftCondition = '';
    if (shiftMode === 'day') {
      shiftCondition = `AND TIME(QM_DEF.CREATION_TIME) BETWEEN '07:50:00' AND '16:40:00'`;
    } else if (shiftMode === 'night') {
      shiftCondition = `AND (TIME(QM_DEF.CREATION_TIME) >= '16:40:00' OR TIME(QM_DEF.CREATION_TIME) < '01:30:00')`;
    }
    // shiftMode === 'all' – без дополнительного условия

    const query = `
      SELECT 
        QM_DEF.PART_NAME,
        QM_DEF.PROBLEM_TYPE,
        CONCAT(QM_DEF.PART_NAME, ' ', QM_DEF.PROBLEM_TYPE) AS PP,
        DATE(QM_DEF.CREATION_TIME) AS CREATION_TIME,
        wo.MODEL,
        COUNT(*) AS QTY_DEF
      FROM (
        SELECT VIN, CREATION_TIME, CHECK_POINT, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_biw_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        UNION ALL
        SELECT VIN, CREATION_TIME, CHECK_POINT, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_paint_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        UNION ALL
        SELECT VIN, CREATION_TIME, CHECK_POINT, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_qm_defect_info
        WHERE CREATION_TIME >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE 1=1 ${whereClause} ${shiftCondition}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
        AND DATE(QM_DEF.CREATION_TIME) = CURDATE()   -- только сегодня
      GROUP BY QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, DATE(QM_DEF.CREATION_TIME), wo.MODEL
      ORDER BY CREATION_TIME DESC
      LIMIT 5000
    `;

    const [rows] = await pool.query(query);
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
    console.error('ОШИБКА DAILY TOP:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== VIN ДЛЯ ДЕФЕКТА В DAILY TOP ==================
app.get('/api/daily-top-vins', async (req, res) => {
  try {
    const { checkpoint, defectType, shift, partName, problemType, model } = req.query;
    if (!partName || !problemType) return res.status(400).json({ error: 'partName и problemType обязательны' });

    const type = defectType || 'default';
    const shiftMode = shift || 'all';
    const carModel = model || null;

    let whereCheckpoint = '';
    // Упрощённая фильтрация без S_OFFLINE, т.к. для VIN не нужна агрегация
    if (checkpoint === 'CP7') {
      whereCheckpoint = `AND QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9')`;
    } else if (checkpoint === 'CP8') {
      whereCheckpoint = `AND QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL')`;
    } else {
      whereCheckpoint = `AND (QM_DEF.POST_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9') OR QM_DEF.POST_NAME IN ('360', 'ADAS+RB', 'CP8', 'CP8 Gate', 'REPAIR', 'REPAIR_Final', 'TEST TRACK', 'T-UP', 'WA', 'WT', 'CP8 Touch Up', 'REPAIR VERIFICATION', 'TRACK', 'ROLL'))`;
    }

    // Фильтр по типу (default/offline/online) – применяем к S_OFFLINE
    let offlineCondition = '';
    if (type === 'offline') {
      offlineCondition = `AND (QM_DEF.S_OFFLINE = 1)`;
    } else if (type === 'online') {
      offlineCondition = `AND (QM_DEF.S_OFFLINE = 0)`;
    }

    // Смена
    let shiftCondition = '';
    if (shiftMode === 'day') {
      shiftCondition = `AND TIME(QM_DEF.CREATION_TIME) BETWEEN '07:50:00' AND '16:40:00'`;
    } else if (shiftMode === 'night') {
      shiftCondition = `AND (TIME(QM_DEF.CREATION_TIME) >= '16:40:00' OR TIME(QM_DEF.CREATION_TIME) < '01:30:00')`;
    }

    const query = `
      SELECT DISTINCT wo.VIN
      FROM (
        SELECT VIN, CREATION_TIME, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_biw_qm_defect_info
        WHERE PART_NAME = ? AND PROBLEM_TYPE = ? AND DATE(CREATION_TIME) = CURDATE()
        UNION ALL
        SELECT VIN, CREATION_TIME, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_paint_qm_defect_info
        WHERE PART_NAME = ? AND PROBLEM_TYPE = ? AND DATE(CREATION_TIME) = CURDATE()
        UNION ALL
        SELECT VIN, CREATION_TIME, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_qm_defect_info
        WHERE PART_NAME = ? AND PROBLEM_TYPE = ? AND DATE(CREATION_TIME) = CURDATE()
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE 1=1 ${whereCheckpoint} ${offlineCondition} ${shiftCondition}
        ${carModel ? `AND wo.MODEL = ?` : ''}
      ORDER BY wo.VIN
    `;

    const params = [partName, problemType, partName, problemType, partName, problemType];
    if (carModel) params.push(carModel);

    const [rows] = await pool.query(query, params);
    res.json(rows.map(r => r.VIN));
  } catch (err) {
    console.error('ОШИБКА VIN:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Заметки
app.get('/api/defect-notes', async (req, res) => {
  try {
    const [rows] = await notesPool.query('SELECT * FROM defect_user_notes');
    res.json(rows);
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

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