require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

// Вспомогательная функция
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const app = express();
app.use(cors({
  origin: 'http://localhost:30000',
  credentials: true
}));
app.use(express.json({ limit: '256mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));


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

const mesPool = mysql.createPool({
  host: '10.203.0.28',
  port: 3306,
  user: 'appuser',
  password: 'msU1ceq~ST)2(Lf8',
  database: 'higoplat_fusion_mes',
  waitForConnections: true,
  connectTimeout: 10000,
  dateStrings: true,
});

console.log(process.env.NOTES_USER)

// ===== НОВЫЙ ПУЛ ДЛЯ БАЗЫ LES =====
const lesPool = mysql.createPool({
  host: '10.203.0.29',
  port: 3306,
  user: 'appuser',
  password: 'msU1ceq~ST)2(Lf8',
  database: 'higoplat_fusion_les',
  waitForConnections: true,
  connectTimeout: 10000,
  dateStrings: true,
});

async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Основная БД: OK');
    connection.release();
    return true;
  } catch (err) {
    console.error('Основная БД ОШИБКА:', err.message);
    return false;
  }
}

async function checkNotesDatabaseConnection() {
  try {
    const connection = await notesPool.getConnection();
    console.log('Локальная БД заметок: OK');
    connection.release();
    return true;
  } catch (err) {
    console.error('БД заметок ОШИБКА:', err.message);
    return false;
  }
}

async function checkLesDatabaseConnection() {
  try {
    const connection = await lesPool.getConnection();
    console.log('БД LES: OK');
    connection.release();
    return true;
  } catch (err) {
    console.error('БД LES ОШИБКА:', err.message);
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

// ================== ДАШБОРД (основной + Daily Top) – с новыми списками постов ==================
app.get('/api/defects-dashboard', async (req, res) => {
  try {
    const { checkpoint, defectType } = req.query;
    const type = defectType || 'default';

    // Единые списки постов для всех отчётов
    const cp7Posts = [
      'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
      'REPAIR', 'REPAIR_Final',
      'EXT1', 'PIP2', 'PIP4', 'PIP9'
    ];
    const cp8Posts = [
      'CP8', 'CP8 Gate', 'CP8-gate',
      '360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT'
    ];
    const pipPosts = ['EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'];
    const tlPosts  = ['360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT','CP8 Touch Up'];

    let postList = [];
    if (checkpoint === 'CP7') postList = cp7Posts;
    else if (checkpoint === 'CP8') postList = cp8Posts;
    else if (checkpoint === 'PIP') postList = pipPosts;
    else if (checkpoint === 'TL') postList = tlPosts;
    else postList = [...new Set([...cp7Posts, ...cp8Posts])];

    const postListStr = postList.map(p => `'${p}'`).join(',');

    let whereClause = '';
    if (type === 'offline') {
      whereClause = ` AND QM_DEF.POST_NAME IN (${postListStr}) AND QM_DEF.S_OFFLINE = 1`;
    } else if (type === 'online') {
      whereClause = ` AND QM_DEF.POST_NAME IN (${postListStr}) AND QM_DEF.S_OFFLINE = 0`;
    } else {
      whereClause = ` AND QM_DEF.POST_NAME IN (${postListStr})`;
    }

    const query = `
      SELECT 
        QM_DEF.PART_NAME,
        QM_DEF.PROBLEM_TYPE,
        CONCAT(QM_DEF.PART_NAME, ' ', QM_DEF.PROBLEM_TYPE) AS PP,
        DATE(QM_DEF.CREATION_TIME) AS CREATION_TIME,
        wo.MODEL,
        QM_DEF.VIN,
        QM_DEF.POST_NAME,
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
      GROUP BY QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, DATE(QM_DEF.CREATION_TIME), wo.MODEL, QM_DEF.VIN, QM_DEF.POST_NAME
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
      VIN: row.VIN,
      POST_NAME: row.POST_NAME,
      DEFECTS_COUNT: Number(row.QTY_DEF) || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== DAILY TOP – с новыми списками постов ==================
app.get('/api/daily-top', async (req, res) => {
  try {
    const { checkpoint, defectType, shift } = req.query;
    const type = defectType || 'default';
    const shiftMode = shift || 'all';

    const cp7Posts = [
      'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
      'REPAIR', 'REPAIR_Final',
      'EXT1', 'PIP2', 'PIP4', 'PIP9'
    ];
    const cp8Posts = [
      'CP8', 'CP8 Gate', 'CP8-gate',
      '360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT','CP8 Touch Up'
    ];

    let postList = [];
    if (checkpoint === 'CP7') postList = cp7Posts;
    else if (checkpoint === 'CP8') postList = cp8Posts;
    else postList = [...new Set([...cp7Posts, ...cp8Posts])];

    const postListStr = postList.map(p => `'${p}'`).join(',');

    let whereClause = '';
    if (type === 'offline') {
      whereClause = ` AND QM_DEF.POST_NAME IN (${postListStr}) AND QM_DEF.S_OFFLINE = 1`;
    } else if (type === 'online') {
      whereClause = ` AND QM_DEF.POST_NAME IN (${postListStr}) AND QM_DEF.S_OFFLINE = 0`;
    } else {
      whereClause = ` AND QM_DEF.POST_NAME IN (${postListStr})`;
    }

    let shiftCondition = '';
    if (shiftMode === 'day') {
      shiftCondition = `AND TIME(QM_DEF.CREATION_TIME) BETWEEN '07:50:00' AND '16:40:00'`;
    } else if (shiftMode === 'night') {
      shiftCondition = `AND (TIME(QM_DEF.CREATION_TIME) >= '16:40:00' OR TIME(QM_DEF.CREATION_TIME) < '01:30:00')`;
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
      WHERE 1=1 ${whereClause} ${shiftCondition}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
        AND DATE(QM_DEF.CREATION_TIME) = CURDATE()
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

// ================== VIN ДЛЯ ДЕФЕКТА В DAILY TOP – с новыми списками постов ==================
app.get('/api/daily-top-vins', async (req, res) => {
  try {
    const { checkpoint, defectType, shift, partName, problemType, model } = req.query;
    if (!partName || !problemType) return res.status(400).json({ error: 'partName и problemType обязательны' });

    const type = defectType || 'default';
    const shiftMode = shift || 'all';
    const carModel = model || null;

    const cp7Posts = [
      'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
      'REPAIR', 'REPAIR_Final',
      'EXT1', 'PIP2', 'PIP4', 'PIP9'
    ];
    const cp8Posts = [
      'CP8', 'CP8 Gate', 'CP8-gate',
      '360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT', 'CP8 Touch Up'
    ];

    let postList = [];
    if (checkpoint === 'CP7') postList = cp7Posts;
    else if (checkpoint === 'CP8') postList = cp8Posts;
    else postList = [...new Set([...cp7Posts, ...cp8Posts])];

    const postListStr = postList.map(p => `'${p}'`).join(',');

    let whereClause = ` AND QM_DEF.POST_NAME IN (${postListStr})`;
    if (type === 'offline') whereClause += ` AND QM_DEF.S_OFFLINE = 1`;
    else if (type === 'online') whereClause += ` AND QM_DEF.S_OFFLINE = 0`;

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
      WHERE 1=1 ${whereClause} ${shiftCondition}
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

// ================== MODEL STATUS – DRR (MES) ==================
app.get('/api/model-status-drr', async (req, res) => {
  try {
    const { period, count } = req.query;
    if (!period) return res.status(400).json({ error: 'period обязателен' });

    let dateFormat;
    if (period === 'month') dateFormat = '%Y-%m';
    else if (period === 'week') dateFormat = '%Y-%u';
    else if (period === 'day') dateFormat = '%Y-%m-%d';

    const defaultCount = period === 'month' ? 3 : period === 'week' ? 4 : 7;
    const limit = parseInt(count, 10) || defaultCount;

    const sql = `
      SELECT
        all_cars.MODEL,
        all_cars.PERIOD,
        all_cars.TOTAL,
        COALESCE(remzone.REMZONE_COUNT, 0) AS REMZONE_COUNT,
        ROUND(100 - COALESCE(remzone.REMZONE_COUNT, 0) * 100.0 / all_cars.TOTAL, 1) AS DRR_PERCENT
      FROM (
        SELECT
          too.product AS MODEL,
          DATE_FORMAT(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE), ?) AS PERIOD,
          COUNT(DISTINCT tvv.VIN) AS TOTAL
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
        GROUP BY MODEL, PERIOD
      ) all_cars
      LEFT JOIN (
        SELECT
          too.product AS MODEL,
          DATE_FORMAT(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE), ?) AS PERIOD,
          COUNT(DISTINCT tvv.VIN) AS REMZONE_COUNT
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN AND tvtlm.node_nature LIKE 'REP%'
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
        GROUP BY MODEL, PERIOD
      ) remzone ON all_cars.MODEL = remzone.MODEL AND all_cars.PERIOD = remzone.PERIOD
      WHERE all_cars.TOTAL > 0
      ORDER BY all_cars.PERIOD, all_cars.MODEL
    `;

    const [rows] = await mesPool.query(sql, [dateFormat, dateFormat]);

    const periodsMap = {};
    rows.forEach(row => {
      const p = row.PERIOD;
      if (!periodsMap[p]) {
        periodsMap[p] = { period: p, target: 80, values: {} };
      }
      periodsMap[p].values[row.MODEL] = row.DRR_PERCENT;
    });

    const sortedPeriods = Object.keys(periodsMap).sort();
    const recentPeriods = sortedPeriods.slice(-limit);
    const result = recentPeriods.map(p => periodsMap[p]);

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА DRR (MES):', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== MODEL STATUS – DPU CP8 (OFFLINE, CPFINAL) ==================
app.get('/api/model-status-dpu-cp8', async (req, res) => {
  try {
    const { period, count } = req.query;
    if (!period) return res.status(400).json({ error: 'period обязателен' });

    let dateFormat;
    if (period === 'month') dateFormat = '%Y-%m';
    else if (period === 'week') dateFormat = '%Y-%u';
    else if (period === 'day') dateFormat = '%Y-%m-%d';

    const defaultCount = period === 'month' ? 3 : period === 'week' ? 4 : 7;
    const limit = parseInt(count, 10) || defaultCount;

    // Посты CP8 + Test Line (офлайн-дефекты и учёт авто)
    const cp8tlPosts = [
      'CP8', 'CP8 Gate', 'CP8-gate',
      '360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT'
    ];
    const postListStr = cp8tlPosts.map(p => `'${p}'`).join(',');

    const sql = `
      SELECT 
        MODEL,
        DATE_FORMAT(CREATION_TIME, ?) AS PERIOD,
        SUM(VIN_C) AS TOTAL_CARS,
        SUM(DEF_C) AS TOTAL_DEFECTS,
        ROUND(SUM(DEF_C) / SUM(VIN_C), 2) AS DPU
      FROM (
        SELECT 
          aowth.MODEL,
          DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)) AS CREATION_TIME,
          COUNT(DISTINCT aowth.VIN) AS VIN_C,
          COUNT(QM_DEF.VIN) AS DEF_C
        FROM at_om_wiptrackinghistory aowth
        JOIN (
          SELECT VIN, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_qm_defect_info
        ) QM_DEF ON QM_DEF.VIN = aowth.VIN AND QM_DEF.S_OFFLINE = 1
        WHERE aowth.WC_NAME IN (${postListStr})
        GROUP BY aowth.MODEL, CREATION_TIME
      ) CARS
      GROUP BY MODEL, PERIOD
      ORDER BY PERIOD, MODEL
    `;

    const [rows] = await pool.query(sql, [dateFormat]);

    const allModels = [...new Set(rows.map(r => r.MODEL))].sort();
    const periodsMap = {};
    rows.forEach(row => {
      const p = row.PERIOD;
      if (!periodsMap[p]) {
        periodsMap[p] = { period: p, target: 2, values: {} };
      }
      periodsMap[p].values[row.MODEL] = row.DPU;
    });

    Object.values(periodsMap).forEach(entry => {
      allModels.forEach(m => {
        if (!(m in entry.values)) entry.values[m] = 0;
      });
    });

    const sortedPeriods = Object.keys(periodsMap).sort();
    const recentPeriods = sortedPeriods.slice(-limit);
    const result = recentPeriods.map(p => periodsMap[p]);

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА DPU CP8:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== MODEL STATUS – DRR CP7 ==================
app.get('/api/model-status-drr-cp7', async (req, res) => {
  try {
    const { period, count } = req.query;
    if (!period) return res.status(400).json({ error: 'period обязателен' });

    let dateFormat;
    if (period === 'month') dateFormat = '%Y-%m';
    else if (period === 'week') dateFormat = '%Y-%u';
    else if (period === 'day') dateFormat = '%Y-%m-%d';

    const defaultCount = period === 'month' ? 3 : period === 'week' ? 4 : 7;
    const limit = parseInt(count, 10) || defaultCount;

    const sql = `
      SELECT
        all_cars.MODEL,
        all_cars.PERIOD,
        all_cars.TOTAL,
        COALESCE(remzone.REMZONE_COUNT, 0) AS REMZONE_COUNT,
        ROUND(100 - COALESCE(remzone.REMZONE_COUNT, 0) * 100.0 / all_cars.TOTAL, 1) AS DRR_PERCENT
      FROM (
        SELECT
          too.product AS MODEL,
          DATE_FORMAT(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE), ?) AS PERIOD,
          COUNT(DISTINCT tvv.VIN) AS TOTAL
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'
        GROUP BY MODEL, PERIOD
      ) all_cars
      LEFT JOIN (
        SELECT
          too.product AS MODEL,
          DATE_FORMAT(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE), ?) AS PERIOD,
          COUNT(DISTINCT tvv.VIN) AS REMZONE_COUNT
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'
          AND tvv.VIN IN (
            SELECT DISTINCT tvtlm.VIN
            FROM tm_vhc_test_line_movement tvtlm
            WHERE tvtlm.node_nature LIKE 'REP%'
          )
        GROUP BY MODEL, PERIOD
      ) remzone ON all_cars.MODEL = remzone.MODEL AND all_cars.PERIOD = remzone.PERIOD
      WHERE all_cars.TOTAL > 0
      ORDER BY all_cars.PERIOD, all_cars.MODEL
    `;

    const [rows] = await mesPool.query(sql, [dateFormat, dateFormat]);

    const allModels = [...new Set(rows.map(r => r.MODEL))].sort();
    const periodsMap = {};
    rows.forEach(row => {
      const p = row.PERIOD;
      if (!periodsMap[p]) {
        periodsMap[p] = { period: p, target: 80, values: {} };
      }
      periodsMap[p].values[row.MODEL] = row.DRR_PERCENT;
    });

    Object.values(periodsMap).forEach(entry => {
      allModels.forEach(m => {
        if (!(m in entry.values)) entry.values[m] = 0;
      });
    });

    const sortedPeriods = Object.keys(periodsMap).sort();
    const recentPeriods = sortedPeriods.slice(-limit);
    const result = recentPeriods.map(p => periodsMap[p]);

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА DRR CP7:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== MODEL STATUS – DPU CP7 (OFFLINE, посты CP7) ==================
app.get('/api/model-status-dpu-cp7', async (req, res) => {
  try {
    const { period, count } = req.query;
    if (!period) return res.status(400).json({ error: 'period обязателен' });

    let dateFormat;
    if (period === 'month') dateFormat = '%Y-%m';
    else if (period === 'week') dateFormat = '%Y-%u';
    else if (period === 'day') dateFormat = '%Y-%m-%d';

    const defaultCount = period === 'month' ? 3 : period === 'week' ? 4 : 7;
    const limit = parseInt(count, 10) || defaultCount;

    // Посты CP7 + PIP (офлайн-дефекты и учёт авто)
    const cp7pipPosts = [
      'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
      'PIP1', 'PIP2', 'PIP9',
    ];
    const postListStr = cp7pipPosts.map(p => `'${p}'`).join(',');

    const sql = `
      SELECT 
        MODEL,
        DATE_FORMAT(CREATION_TIME, ?) AS PERIOD,
        SUM(VIN_C) AS TOTAL_CARS,
        SUM(DEF_C) AS TOTAL_DEFECTS,
        ROUND(SUM(DEF_C) / SUM(VIN_C), 2) AS DPU
      FROM (
        SELECT 
          aowth.MODEL,
          DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)) AS CREATION_TIME,
          COUNT(DISTINCT aowth.VIN) AS VIN_C,
          COUNT(QM_DEF.VIN) AS DEF_C
        FROM at_om_wiptrackinghistory aowth
        JOIN (
          SELECT VIN, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_qm_defect_info
          UNION ALL
          SELECT VIN, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_biw_qm_defect_info
          UNION ALL
          SELECT VIN, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_paint_qm_defect_info
        ) QM_DEF ON QM_DEF.VIN = aowth.VIN AND QM_DEF.S_OFFLINE = 1
        WHERE aowth.WC_NAME IN (${postListStr})
        GROUP BY aowth.MODEL, CREATION_TIME
      ) CARS
      GROUP BY MODEL, PERIOD
      ORDER BY PERIOD, MODEL
    `;

    const [rows] = await pool.query(sql, [dateFormat]);

    const allModels = [...new Set(rows.map(r => r.MODEL))].sort();
    const periodsMap = {};
    rows.forEach(row => {
      const p = row.PERIOD;
      if (!periodsMap[p]) {
        periodsMap[p] = { period: p, target: 2, values: {} };
      }
      periodsMap[p].values[row.MODEL] = row.DPU;
    });

    Object.values(periodsMap).forEach(entry => {
      allModels.forEach(m => {
        if (!(m in entry.values)) entry.values[m] = 0;
      });
    });

    const sortedPeriods = Object.keys(periodsMap).sort();
    const recentPeriods = sortedPeriods.slice(-limit);
    const result = recentPeriods.map(p => periodsMap[p]);

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА DPU CP7:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== ДЕТАЛИ DPU CP7 ==================
app.get('/api/model-status-dpu-cp7-details', async (req, res) => {
  try {
    const { model, periods, periodType } = req.query;
    if (!periods) return res.status(400).json({ error: 'periods обязателен' });

    const periodList = periods.split(',').map(p => p.trim()).filter(Boolean);
    if (periodList.length === 0) return res.status(400).json({ error: 'periods пуст' });

    let dateCondition;
    if (periodType === 'month') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)), '%Y-%m') IN (${periodList.map(() => '?').join(',')})`;
    } else if (periodType === 'week') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)), '%Y-%u') IN (${periodList.map(() => '?').join(',')})`;
    } else {
      dateCondition = `DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)) IN (${periodList.map(() => '?').join(',')})`;
    }

    // Новый список постов CP7
    const cp7Posts = [
      'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
      'REPAIR', 'REPAIR_Final',
      'EXT1', 'PIP2', 'PIP4', 'PIP9'
    ];
    const postListStr = cp7Posts.map(p => `'${p}'`).join(',');

    let sql = `
      SELECT DISTINCT aowth.VIN, aowth.MODEL, DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)) AS DATE,
             QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE
      FROM at_om_wiptrackinghistory aowth
      JOIN (
        SELECT VIN, PART_NAME, PROBLEM_TYPE, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_qm_defect_info
        UNION ALL
        SELECT VIN, PART_NAME, PROBLEM_TYPE, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, PART_NAME, PROBLEM_TYPE, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_paint_qm_defect_info
      ) QM_DEF ON QM_DEF.VIN = aowth.VIN AND QM_DEF.S_OFFLINE = 1
      WHERE ${dateCondition}
        AND aowth.WC_NAME IN (${postListStr})
    `;
    const params = [...periodList];

    if (model) {
      sql += ` AND aowth.MODEL = ?`;
      params.push(model);
    }

    sql += ` ORDER BY aowth.VIN`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('DPU CP7 Details:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== ДЕТАЛИ DRR CP7 ==================
app.get('/api/model-status-drr-cp7-details', async (req, res) => {
  try {
    const { model, periods, periodType } = req.query;
    if (!periods) return res.status(400).json({ error: 'periods обязателен' });

    const periodList = periods.split(',').map(p => p.trim()).filter(Boolean);
    if (periodList.length === 0) return res.status(400).json({ error: 'periods пуст' });

    let dateCondition;
    if (periodType === 'month') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)), '%Y-%m') IN (${periodList.map(() => '?').join(',')})`;
    } else if (periodType === 'week') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)), '%Y-%u') IN (${periodList.map(() => '?').join(',')})`;
    } else {
      dateCondition = `DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) IN (${periodList.map(() => '?').join(',')})`;
    }

    let sql = `
      SELECT tvv.VIN, too.product AS MODEL, DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) AS DATE,
             IF(MAX(tvtlm.id) IS NOT NULL, 'В ремзоне', 'Без ремзоны') AS REMZONE_STATUS
      FROM tm_vhc_vehicle tvv
      JOIN tm_ofm_order too ON too.VIN = tvv.VIN
      JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
      LEFT JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN AND tvtlm.node_nature LIKE 'REP%'
      WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'
        AND ${dateCondition}
    `;
    const params = [...periodList];

    if (model) {
      sql += ` AND too.product = ?`;
      params.push(model);
    }

    sql += ` GROUP BY tvv.VIN, too.product, DATE ORDER BY tvv.VIN`;

    const [rows] = await mesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('DRR CP7 Details:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== ДЕТАЛИ DPU CP8 ==================
app.get('/api/model-status-dpu-cp8-details', async (req, res) => {
  try {
    const { model, periods, periodType } = req.query;
    if (!periods) return res.status(400).json({ error: 'periods обязателен' });

    const periodList = periods.split(',').map(p => p.trim()).filter(Boolean);
    if (periodList.length === 0) return res.status(400).json({ error: 'periods пуст' });

    let dateCondition;
    if (periodType === 'month') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)), '%Y-%m') IN (${periodList.map(() => '?').join(',')})`;
    } else if (periodType === 'week') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)), '%Y-%u') IN (${periodList.map(() => '?').join(',')})`;
    } else {
      dateCondition = `DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)) IN (${periodList.map(() => '?').join(',')})`;
    }

    let sql = `
      SELECT DISTINCT aowth.VIN, aowth.MODEL, DATE(DATE_SUB(aowth.CREATION_TIME, INTERVAL 470 MINUTE)) AS DATE,
             QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE
      FROM at_om_wiptrackinghistory aowth
      JOIN (
        SELECT VIN, PART_NAME, PROBLEM_TYPE, (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE FROM at_qm_defect_info
      ) QM_DEF ON QM_DEF.VIN = aowth.VIN AND QM_DEF.S_OFFLINE = 1
      WHERE ${dateCondition}
        AND aowth.WC_NAME = 'CPFINAL'
    `;
    const params = [...periodList];

    if (model) {
      sql += ` AND aowth.MODEL = ?`;
      params.push(model);
    }

    sql += ` ORDER BY aowth.VIN`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('DPU CP8 Details:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== ДЕТАЛИ DRR CP8 ==================
app.get('/api/model-status-drr-cp8-details', async (req, res) => {
  try {
    const { model, periods, periodType } = req.query;
    if (!periods) return res.status(400).json({ error: 'periods обязателен' });

    const periodList = periods.split(',').map(p => p.trim()).filter(Boolean);
    if (periodList.length === 0) return res.status(400).json({ error: 'periods пуст' });

    let dateCondition;
    if (periodType === 'month') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)), '%Y-%m') IN (${periodList.map(() => '?').join(',')})`;
    } else if (periodType === 'week') {
      dateCondition = `DATE_FORMAT(DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)), '%Y-%u') IN (${periodList.map(() => '?').join(',')})`;
    } else {
      dateCondition = `DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) IN (${periodList.map(() => '?').join(',')})`;
    }

    let sql = `
      SELECT tvv.VIN, too.product AS MODEL, DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) AS DATE,
             IF(MAX(tvtlm.id) IS NOT NULL, 'В ремзоне', 'Без ремзоны') AS REMZONE_STATUS
      FROM tm_vhc_vehicle tvv
      JOIN tm_ofm_order too ON too.VIN = tvv.VIN
      JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
      LEFT JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN AND tvtlm.node_nature LIKE 'REP%'
      WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
        AND ${dateCondition}
    `;
    const params = [...periodList];

    if (model) {
      sql += ` AND too.product = ?`;
      params.push(model);
    }

    sql += ` GROUP BY tvv.VIN, too.product, DATE ORDER BY tvv.VIN`;

    const [rows] = await mesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('DRR CP8 Details:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== CPA SCORE ==================
app.get('/api/cpa-scores', async (req, res) => {
  try {
    const [rows] = await notesPool.query('SELECT model, score FROM cpa_scores');
    const map = {};
    rows.forEach(r => { map[r.model] = r.score; });
    res.json(map);
  } catch (err) {
    console.error('Ошибка получения CPA:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cpa-scores', async (req, res) => {
  try {
    const { model, score } = req.body;
    if (!model) return res.status(400).json({ error: 'model обязателен' });

    await notesPool.query(`
      INSERT INTO cpa_scores (model, score) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = CURRENT_TIMESTAMP
    `, [model, score || '']);

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка сохранения CPA:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ================== CHECKPOINT MAP – СТАТИСТИКА ==================
app.get('/api/checkpoint-stats', async (req, res) => {
  try {
    const { dateFrom, dateTo, model, defectType } = req.query;
    if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom и dateTo обязательны' });

    const type = defectType || 'all';

    const pipPostsAll = ['EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'];
    const cp7PostsAll = ['CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate', 'REPAIR', 'REPAIR_Final', 'EXT1', 'PIP2', 'PIP4', 'PIP9'];
    const tlPostsAll  = ['360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT','CP8 Touch Up'];
    const cp8PostsAll = ['CP8', 'CP8 Gate', 'CP8-gate'];

    const checkpoints = [
      { id: 'PIP', posts: pipPostsAll },
      { id: 'CP7', posts: cp7PostsAll },
      { id: 'TL',  posts: tlPostsAll  },
      { id: 'CP8', posts: cp8PostsAll }
    ];

    const results = [];

    for (const cp of checkpoints) {
      const postListStr = cp.posts.map(p => `'${p}'`).join(',');

      // Общее количество VIN, прошедших посты (для информации)
      let totalSql = `
        SELECT COUNT(DISTINCT VIN) AS TOTAL
        FROM at_om_wiptrackinghistory
        WHERE WC_NAME IN (${postListStr})
          AND DATE(CREATION_TIME) BETWEEN ? AND ?
      `;
      const totalParams = [dateFrom, dateTo];
      if (model) { totalSql += ` AND MODEL = ?`; totalParams.push(model); }
      const [[{ TOTAL }]] = await pool.query(totalSql, totalParams);
      const totalVins = TOTAL || 0;

      // Офлайн VIN (независимый подсчёт)
      let offlineSql = `
        SELECT COUNT(DISTINCT QM_DEF.VIN) AS OFFLINE
        FROM (
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_biw_qm_defect_info
          UNION ALL
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_paint_qm_defect_info
          UNION ALL
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_qm_defect_info
        ) QM_DEF
        JOIN work_order wo ON wo.VIN = QM_DEF.VIN
        WHERE QM_DEF.POST_NAME IN (${postListStr})
          AND QM_DEF.S_OFFLINE = 1
          AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
      `;
      const offlineParams = [dateFrom, dateTo];
      if (model) { offlineSql += ` AND wo.MODEL = ?`; offlineParams.push(model); }
      const [[{ OFFLINE }]] = await pool.query(offlineSql, offlineParams);
      let offlineVins = OFFLINE || 0;

      // Онлайн VIN (независимый подсчёт)
      let onlineSql = `
        SELECT COUNT(DISTINCT QM_DEF.VIN) AS ONLINE
        FROM (
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_biw_qm_defect_info
          UNION ALL
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_paint_qm_defect_info
          UNION ALL
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_qm_defect_info
        ) QM_DEF
        JOIN work_order wo ON wo.VIN = QM_DEF.VIN
        WHERE QM_DEF.POST_NAME IN (${postListStr})
          AND QM_DEF.S_OFFLINE = 0
          AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
      `;
      const onlineParams = [dateFrom, dateTo];
      if (model) { onlineSql += ` AND wo.MODEL = ?`; onlineParams.push(model); }
      const [[{ ONLINE }]] = await pool.query(onlineSql, onlineParams);
      let onlineVins = ONLINE || 0;

      // Применяем фильтр типа дефектов
      if (type === 'offline') {
        onlineVins = 0;
      } else if (type === 'online') {
        offlineVins = 0;
      }

      results.push({
        checkpoint: cp.id,
        posts: cp.posts,
        totalVins,
        offlineVins,
        onlineVins
      });
    }

    res.json(results);
  } catch (err) {
    console.error('ОШИБКА checkpoint-stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ================== CHECKPOINT DEFECTS (для Checkpoint Map) ==================
app.get('/api/checkpoint-stats', async (req, res) => {
  try {
    const { dateFrom, dateTo, model, defectType } = req.query;
    if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom и dateTo обязательны' });

    const type = defectType || 'all';

    // Списки постов
    const pipPostsPure = ['EXT1', 'PIP1', 'PIP5', 'PIP6', 'PIP8'];
    const pipPostsAll  = ['EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'];
    const cp7PostsAll  = ['CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate', 'REPAIR', 'REPAIR_Final', 'EXT1', 'PIP2', 'PIP4', 'PIP9'];
    const tlPostsAll   = ['360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT','CP8 Touch Up'];
    const cp8PostsAll  = ['CP8', 'CP8 Gate', 'CP8-gate'];

    // Вспомогательная функция: подсчёт уникальных VIN с офлайн-дефектами на заданном списке постов
    async function getOfflineVins(postList) {
      if (!postList.length) return 0;
      const postStr = postList.map(p => `'${p}'`).join(',');
      let sql = `
        SELECT COUNT(DISTINCT QM_DEF.VIN) AS OFFLINE
        FROM (
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_biw_qm_defect_info
          UNION ALL
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_paint_qm_defect_info
          UNION ALL
          SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_qm_defect_info
        ) QM_DEF
        JOIN work_order wo ON wo.VIN = QM_DEF.VIN
        WHERE QM_DEF.POST_NAME IN (${postStr})
          AND QM_DEF.S_OFFLINE = 1
          AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
      `;
      const params = [dateFrom, dateTo];
      if (model) { sql += ` AND wo.MODEL = ?`; params.push(model); }
      const [[{ OFFLINE }]] = await pool.query(sql, params);
      return OFFLINE || 0;
    }

    // Общее количество VIN, прошедших посты чекпоинта (для онлайн)
    async function getTotalVins(postList) {
      if (!postList.length) return 0;
      const postStr = postList.map(p => `'${p}'`).join(',');
      let sql = `
        SELECT COUNT(DISTINCT VIN) AS TOTAL
        FROM at_om_wiptrackinghistory
        WHERE WC_NAME IN (${postStr})
          AND DATE(CREATION_TIME) BETWEEN ? AND ?
      `;
      const params = [dateFrom, dateTo];
      if (model) { sql += ` AND MODEL = ?`; params.push(model); }
      const [[{ TOTAL }]] = await pool.query(sql, params);
      return TOTAL || 0;
    }

    // Специальный подсчёт для CP8 – только авто, прошедшие ремзону
    async function getCp8RemzoneOffline() {
      const cp8Str = cp8PostsAll.map(p => `'${p}'`).join(',');
      let sql = `
        SELECT COUNT(DISTINCT cp8.VIN) AS OFFLINE
        FROM (
          SELECT DISTINCT QM_DEF.VIN
          FROM (
            SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                   (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
            FROM at_biw_qm_defect_info
            UNION ALL
            SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                   (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
            FROM at_paint_qm_defect_info
            UNION ALL
            SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
                   (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
            FROM at_qm_defect_info
          ) QM_DEF
          JOIN work_order wo ON wo.VIN = QM_DEF.VIN
          JOIN at_om_wiptrackinghistory aowth ON aowth.VIN = wo.VIN
          WHERE QM_DEF.POST_NAME IN (${cp8Str})
            AND QM_DEF.S_OFFLINE = 1
            AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
            AND aowth.WC_NAME IN (${cp8Str})
            AND DATE(aowth.CREATION_TIME) BETWEEN ? AND ?
        ) cp8
        WHERE cp8.VIN IN (
          SELECT DISTINCT tvtlm.VIN
          FROM tm_vhc_test_line_movement tvtlm
          WHERE tvtlm.node_nature LIKE 'REP%'
        )
      `;
      const params = [dateFrom, dateTo, dateFrom, dateTo];
      const [[{ OFFLINE }]] = await mesPool.query(sql, params);
      return OFFLINE || 0;
    }

    // Накопительный подсчёт офлайн-авто
    const pipOffline = await getOfflineVins(pipPostsPure);
    const cp7Offline = await getOfflineVins([...pipPostsPure, ...cp7PostsAll]);
    const tlOffline = await getOfflineVins([...pipPostsPure, ...cp7PostsAll, ...tlPostsAll]);
    const cp8Offline = await getCp8RemzoneOffline();

    // Общие количества для онлайн
    const pipTotal = await getTotalVins(pipPostsAll);
    const cp7Total = await getTotalVins(cp7PostsAll);
    const tlTotal = await getTotalVins(tlPostsAll);
    const cp8Total = await getTotalVins(cp8PostsAll);

    let result = [
      {
        checkpoint: 'PIP',
        posts: pipPostsAll,
        totalVins: pipTotal,
        offlineVins: pipOffline,
        onlineVins: Math.max(pipTotal - pipOffline, 0),
        inheritedOffline: 0
      },
      {
        checkpoint: 'CP7',
        posts: cp7PostsAll,
        totalVins: cp7Total,
        offlineVins: cp7Offline,
        onlineVins: Math.max(cp7Total - cp7Offline, 0),
        inheritedOffline: pipOffline   // пришло с PIP
      },
      {
        checkpoint: 'TL',
        posts: tlPostsAll,
        totalVins: tlTotal,
        offlineVins: tlOffline,
        onlineVins: Math.max(tlTotal - tlOffline, 0),
        inheritedOffline: cp7Offline   // пришло с CP7
      },
      {
        checkpoint: 'CP8',
        posts: cp8PostsAll,
        totalVins: cp8Total,
        offlineVins: cp8Offline,
        onlineVins: Math.max(cp8Total - cp8Offline, 0),
        inheritedOffline: 0            // все новые, из ремзоны
      }
    ];

    // Применяем фильтр по типу дефектов для отображения
    if (type === 'offline') {
      result = result.map(r => ({ ...r, onlineVins: 0 }));
    } else if (type === 'online') {
      result = result.map(r => ({ ...r, offlineVins: 0, inheritedOffline: 0 }));
    }

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА checkpoint-stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/checkpoint-defects', async (req, res) => {
  try {
    const { checkpoint, defectType, dateFrom, dateTo, model } = req.query;
    if (!checkpoint || !dateFrom || !dateTo) return res.status(400).json({ error: 'checkpoint, dateFrom, dateTo обязательны' });

    const type = defectType || 'all';

    // Базовые списки
    const pipPostsAll   = ['EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'];
    const pipPostsPure  = ['EXT1', 'PIP1', 'PIP5', 'PIP6', 'PIP8'];
    const cp7PostsAll   = ['CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate', 'REPAIR', 'REPAIR_Final', 'EXT1', 'PIP2', 'PIP4', 'PIP9'];
    const tlPostsAll    = ['360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT','CP8 Touch Up'];
    const cp8PostsAll   = ['CP8', 'CP8 Gate', 'CP8-gate'];

    let postList;
    if (checkpoint === 'PIP') {
      // Для PIP: при 'offline' исключаем общие посты, при 'online' и 'all' – полный список
      if (type === 'offline') postList = pipPostsPure;
      else postList = pipPostsAll;
    } else if (checkpoint === 'CP7') postList = cp7PostsAll;
    else if (checkpoint === 'TL')  postList = tlPostsAll;
    else if (checkpoint === 'CP8') postList = cp8PostsAll;
    else return res.status(400).json({ error: 'Неверный checkpoint' });

    const postListStr = postList.map(p => `'${p}'`).join(',');

    let typeCondition = '';
    if (type === 'offline') typeCondition = ' AND QM_DEF.S_OFFLINE = 1';
    else if (type === 'online') typeCondition = ' AND QM_DEF.S_OFFLINE = 0';

    const params = [dateFrom, dateTo];
    let modelCondition = '';
    if (model && model !== 'ALL') {
      modelCondition = ' AND wo.MODEL = ?';
      params.push(model);
    }

    const query = `
      SELECT 
        QM_DEF.PART_NAME,
        QM_DEF.PROBLEM_TYPE,
        CONCAT(QM_DEF.PART_NAME, ' ', QM_DEF.PROBLEM_TYPE) AS PP,
        wo.MODEL,
        COUNT(*) AS QTY_DEF
      FROM (
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_qm_defect_info
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE QM_DEF.POST_NAME IN (${postListStr})
        ${typeCondition}
        AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
        ${modelCondition}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
      GROUP BY QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, wo.MODEL
      ORDER BY QTY_DEF DESC
      LIMIT 10
    `;

    const [rows] = await pool.query(query, params);
    const result = rows.map(row => ({
      MPP: `${row.MODEL || 'UNKNOWN'} ${row.PP}`,
      DEFECTS_COUNT: Number(row.QTY_DEF) || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('ОШИБКА checkpoint-defects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/remzone-stats', async (req, res) => {
  try {
    const { dateFrom, dateTo, model } = req.query;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom и dateTo обязательны' });
    }

    // 1. Все VIN, прошедшие CP7 за период (без лишних преобразований времени)
    // При необходимости поправьте часовой пояс (470 минут), если tvvm.scan_time в UTC.
    // Пока используем простое условие по дате.
    const baseQuery = `
      SELECT tvv.VIN, too.product AS MODEL
      FROM tm_vhc_vehicle tvv
      JOIN tm_ofm_order too ON too.VIN = tvv.VIN
      JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
      WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'
        AND DATE(tvvm.scan_time) BETWEEN ? AND ?
    `;

    // 2. Считаем, сколько из них были в ремзоне (есть запись в tm_vhc_test_line_movement с 'REP%')
    const query = `
      SELECT cp7.MODEL, COUNT(DISTINCT cp7.VIN) AS REMZONE_COUNT
      FROM (${baseQuery}) cp7
      WHERE cp7.VIN IN (
        SELECT DISTINCT tvtlm.VIN
        FROM tm_vhc_test_line_movement tvtlm
        WHERE tvtlm.node_nature LIKE 'REP%'
      )
      ${model && model !== 'ALL' ? 'AND cp7.MODEL = ?' : ''}
      GROUP BY cp7.MODEL
      ORDER BY cp7.MODEL
    `;

    const params = [dateFrom, dateTo];
    if (model && model !== 'ALL') {
      // Параметр для модели добавляется в WHERE после IN, поэтому он третий
      // Лучше перестроить, чтобы было безопасно:
      // Используем параметризованный запрос с явным условием
    }

    // Для простоты перепишем с явной подстановкой параметров
    let finalQuery = `
      SELECT cp7.MODEL, COUNT(DISTINCT cp7.VIN) AS REMZONE_COUNT
      FROM (
        SELECT tvv.VIN, too.product AS MODEL
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'
          AND DATE(tvvm.scan_time) BETWEEN ? AND ?
      ) cp7
      WHERE cp7.VIN IN (
        SELECT DISTINCT tvtlm.VIN
        FROM tm_vhc_test_line_movement tvtlm
        WHERE tvtlm.node_nature LIKE 'REP%'
      )
    `;
    const finalParams = [dateFrom, dateTo];

    if (model && model !== 'ALL') {
      finalQuery += ' AND cp7.MODEL = ?';
      finalParams.push(model);
    }

    finalQuery += ' GROUP BY cp7.MODEL ORDER BY cp7.MODEL';

    const [rows] = await mesPool.query(finalQuery, finalParams);
    res.json(rows);
  } catch (err) {
    console.error('ОШИБКА remzone-stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/remzone-tl-stats', async (req, res) => {
  try {
    const { dateFrom, dateTo, model } = req.query;
    if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom и dateTo обязательны' });

    // Авто, прошедшие TL и попавшие в ремзону
    const query = `
      SELECT cp.MODEL, COUNT(DISTINCT cp.VIN) AS REMZONE_COUNT
      FROM (
        SELECT tvv.VIN, too.product AS MODEL
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        WHERE tvvm.node_nature = 'Key_Uloc_Type_TL'
          AND DATE(tvvm.scan_time) BETWEEN ? AND ?
      ) cp
      WHERE cp.VIN IN (
        SELECT DISTINCT tvtlm.VIN
        FROM tm_vhc_test_line_movement tvtlm
        WHERE tvtlm.node_nature LIKE 'REP%'
      )
      ${model && model !== 'ALL' ? 'AND cp.MODEL = ?' : ''}
      GROUP BY cp.MODEL
      ORDER BY cp.MODEL
    `;
    const params = [dateFrom, dateTo];
    if (model && model !== 'ALL') params.push(model);
    const [rows] = await mesPool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('ОШИБКА remzone-tl-stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== НОВЫЕ ЭНДПОИНТЫ ДЛЯ СГП АУДИТ ==================

// Получить список VIN, прошедших чекпоинт (упрощённый вариант)
app.get('/api/sgp-audit-vins', async (req, res) => {
  try {
    const { checkpoint, dateFrom, dateTo, model } = req.query;
    if (!checkpoint || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'checkpoint, dateFrom, dateTo обязательны' });
    }

    const allNodes = [
      'Key_Uloc_Type_TRIMIN',
      'Key_Uloc_Type_CP7',
      'Key_Uloc_Type_CP72',
      'Key_Uloc_Type_CPFINAL',
      'Key_Uloc_Type_CP8'
    ];
    
    if (!allNodes.includes(checkpoint)) {
      return res.status(400).json({ error: 'Неверный checkpoint' });
    }

    // Для TRIMIN используем ti_mes_movement (AGMAS01001)
    if (checkpoint === 'Key_Uloc_Type_TRIMIN') {
      let sql = `
        SELECT DISTINCT m.vin
        FROM ti_mes_movement m
        JOIN tm_ofm_order o ON o.vin = m.vin
        WHERE m.uloc_no = 'AGMAS01001'
          AND m.is_deleted = 0
          AND m.scan_time BETWEEN ? AND ?
      `;
      const params = [dateFrom, dateTo];
      
      if (model && model !== 'ALL') {
        sql += ' AND o.product = ?';
        params.push(model);
      }
      
      const [rows] = await mesPool.query(sql, params);
      const vins = rows.map(r => r.vin);
      return res.json(vins);
    }

    // Для CP7, CP72, CPFINAL, CP8 - обычный запрос
    let sql = `
      SELECT DISTINCT v.vin
      FROM tm_vhc_vehicle_movement m
      JOIN tm_vhc_vehicle v ON v.id = m.tm_vhc_vehicle_id
      LEFT JOIN tm_ofm_order o ON o.vin = v.vin
      WHERE m.node_nature = ?
        AND m.scan_time BETWEEN ? AND ?
    `;
    const params = [checkpoint, dateFrom, dateTo];
    
    if (model && model !== 'ALL') {
      sql += ' AND o.product = ?';
      params.push(model);
    }

    const [rows] = await mesPool.query(sql, params);
    const vins = rows.map(r => r.vin);
    res.json(vins);
  } catch (err) {
    console.error('Ошибка sgp-audit-vins:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Получить данные tv_biz_storage_car для списка VIN (из БД LES)
app.get('/api/sgp-audit-storage', async (req, res) => {
  try {
    const { vins, vin } = req.query;
    let vinList = [];
    if (vins) {
      vinList = vins.split(',').map(v => v.trim()).filter(v => v.length > 0);
    } else if (vin) {
      vinList = [vin.trim()];
    }
    if (vinList.length === 0) return res.json([]);

    const placeholders = vinList.map(() => '?').join(',');
    const sql = `
      SELECT
        s.vin AS VIN,
        s.vehicle_type AS Модель,
        s.ck_no AS Склад,
        s.kq_no AS Локация,
        s.kw_no AS Ячейка,
        '' AS "Результат проверки"
      FROM tv_biz_storage_car s
      WHERE s.vin IN (${placeholders})
      ORDER BY s.vin
    `;
    const [rows] = await lesPool.query(sql, vinList);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка sgp-audit-storage:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sgp-audit-vins-detail', async (req, res) => {
  try {
    const { checkpoint, dateFrom, dateTo, model, vin } = req.query;

    // --- Режим поиска по конкретному VIN ---
    if (vin) {
      const sqlDetail = `
        WITH movement AS (
            SELECT 
                v.vin,
                o.product AS model,
                m.node_nature,
                m.scan_time
            FROM tm_vhc_vehicle_movement m
            JOIN tm_vhc_vehicle v ON v.id = m.tm_vhc_vehicle_id
            LEFT JOIN tm_ofm_order o ON o.vin = v.vin
            WHERE v.vin = ?
              AND m.node_nature IN ('Key_Uloc_Type_CP7', 'Key_Uloc_Type_CP72', 'Key_Uloc_Type_CPFINAL', 'Key_Uloc_Type_CP8')
        ),
        trimin_movement AS (
            SELECT 
                m.vin,
                o.product AS model,
                'Key_Uloc_Type_TRIMIN' AS node_nature,
                m.scan_time
            FROM ti_mes_movement m
            LEFT JOIN tm_ofm_order o ON o.vin = m.vin
            WHERE m.vin = ?
              AND m.uloc_no = 'AGMAS01001'
              AND m.is_deleted = 0
        ),
        all_movement AS (
            SELECT * FROM movement
            UNION ALL
            SELECT * FROM trimin_movement
        ),
        aggregated AS (
            SELECT
                vin,
                MAX(model) AS model,
                node_nature,
                MIN(scan_time) AS in_time,
                MAX(scan_time) AS out_time
            FROM all_movement
            GROUP BY vin, node_nature
        )
        SELECT
            vin AS VIN,
            MAX(model) AS Модель,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_TRIMIN' THEN in_time END) AS TRIMIN_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_TRIMIN' THEN out_time END) AS TRIMIN_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP7' THEN in_time END) AS CP7_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP7' THEN out_time END) AS CP7_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP72' THEN in_time END) AS CP72_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP72' THEN out_time END) AS CP72_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CPFINAL' THEN in_time END) AS CPFINAL_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CPFINAL' THEN out_time END) AS CPFINAL_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP8' THEN in_time END) AS CP8_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP8' THEN out_time END) AS CP8_out
        FROM aggregated
        GROUP BY vin
        ORDER BY vin
      `;
      const [rows] = await mesPool.query(sqlDetail, [vin.trim(), vin.trim()]);
      return res.json(rows);
    }

    // --- Обычный режим ---
    if (!checkpoint || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'checkpoint, dateFrom, dateTo обязательны' });
    }

    // Добавляем TRIMIN в список
    const allNodes = [
      'Key_Uloc_Type_TRIMIN',
      'Key_Uloc_Type_CP7',
      'Key_Uloc_Type_CP72',
      'Key_Uloc_Type_CPFINAL',
      'Key_Uloc_Type_CP8'
    ];
    
    if (!allNodes.includes(checkpoint)) {
      return res.status(400).json({ error: 'Неверный checkpoint' });
    }

    const idx = allNodes.indexOf(checkpoint);
    const nodesAfter = allNodes.slice(idx + 1);

    // Для TRIMIN - получаем VIN из ti_mes_movement
    let sqlVins;
    let paramsVins;
    
    if (checkpoint === 'Key_Uloc_Type_TRIMIN') {
      sqlVins = `
        SELECT m.vin, MAX(m.scan_time) AS last_cp_time
        FROM ti_mes_movement m
        LEFT JOIN tm_ofm_order o ON o.vin = m.vin
        WHERE m.uloc_no = 'AGMAS01001'
          AND m.is_deleted = 0
          AND m.scan_time BETWEEN ? AND ?
      `;
      paramsVins = [dateFrom, dateTo];
      if (model && model !== 'ALL') {
        sqlVins += ' AND o.product = ?';
        paramsVins.push(model);
      }
      sqlVins += ' GROUP BY m.vin';
    } else {
      sqlVins = `
        SELECT v.vin, MAX(m.scan_time) AS last_cp_time
        FROM tm_vhc_vehicle_movement m
        JOIN tm_vhc_vehicle v ON v.id = m.tm_vhc_vehicle_id
        LEFT JOIN tm_ofm_order o ON o.vin = v.vin
        WHERE m.node_nature = ?
          AND m.scan_time BETWEEN ? AND ?
      `;
      paramsVins = [checkpoint, dateFrom, dateTo];
      if (model && model !== 'ALL') {
        sqlVins += ' AND o.product = ?';
        paramsVins.push(model);
      }
      sqlVins += ' GROUP BY v.vin';
    }
    
    const [vinsRows] = await mesPool.query(sqlVins, paramsVins);
    if (vinsRows.length === 0) {
      return res.json([]);
    }

    const vinsWithTimes = vinsRows.map(r => ({ vin: r.vin, lastCpTime: r.last_cp_time }));
    const vinList = vinsWithTimes.map(v => v.vin);

    if (nodesAfter.length > 0) {
      const placeholders = vinList.map(() => '?').join(',');
      
      // Исключаем VIN которые прошли следующие чекпоинты
      let sqlNext;
      let paramsNext;
      
      if (checkpoint === 'Key_Uloc_Type_TRIMIN') {
        // Для TRIMIN - следующие CP7, CP72, CPFINAL, CP8 в tm_vhc_vehicle_movement
        sqlNext = `
          SELECT DISTINCT v.vin
          FROM tm_vhc_vehicle_movement m
          JOIN tm_vhc_vehicle v ON v.id = m.tm_vhc_vehicle_id
          WHERE v.vin IN (${placeholders})
            AND m.node_nature IN (${nodesAfter.map(() => '?').join(',')})
            AND m.scan_time > (
              SELECT MAX(m2.scan_time)
              FROM ti_mes_movement m2
              WHERE m2.vin = v.vin AND m2.uloc_no = 'AGMAS01001'
                AND m2.is_deleted = 0
                AND m2.scan_time BETWEEN ? AND ?
            )
        `;
        paramsNext = [...vinList, ...nodesAfter, dateFrom, dateTo];
      } else {
        sqlNext = `
          SELECT DISTINCT v.vin
          FROM tm_vhc_vehicle_movement m
          JOIN tm_vhc_vehicle v ON v.id = m.tm_vhc_vehicle_id
          WHERE v.vin IN (${placeholders})
            AND m.node_nature IN (${nodesAfter.map(() => '?').join(',')})
            AND m.scan_time > (
              SELECT MAX(m2.scan_time)
              FROM tm_vhc_vehicle_movement m2
              JOIN tm_vhc_vehicle v2 ON v2.id = m2.tm_vhc_vehicle_id
              WHERE v2.vin = v.vin AND m2.node_nature = ?
                AND m2.scan_time BETWEEN ? AND ?
            )
        `;
        paramsNext = [...vinList, ...nodesAfter, checkpoint, dateFrom, dateTo];
      }
      
      const [nextRows] = await mesPool.query(sqlNext, paramsNext);
      const nextVins = new Set(nextRows.map(r => r.vin));
      
      const filteredVins = vinList.filter(vin => !nextVins.has(vin));
      
      if (filteredVins.length === 0) {
        return res.json([]);
      }

      const filteredPlaceholders = filteredVins.map(() => '?').join(',');
      const sqlDetail = `
        WITH movement AS (
            SELECT 
                v.vin,
                o.product AS model,
                m.node_nature,
                m.scan_time
            FROM tm_vhc_vehicle_movement m
            JOIN tm_vhc_vehicle v ON v.id = m.tm_vhc_vehicle_id
            LEFT JOIN tm_ofm_order o ON o.vin = v.vin
            WHERE v.vin IN (${filteredPlaceholders})
              AND m.node_nature IN ('Key_Uloc_Type_CP7', 'Key_Uloc_Type_CP72', 'Key_Uloc_Type_CPFINAL', 'Key_Uloc_Type_CP8')
        ),
        trimin_movement AS (
            SELECT 
                m.vin,
                o.product AS model,
                'Key_Uloc_Type_TRIMIN' AS node_nature,
                m.scan_time
            FROM ti_mes_movement m
            LEFT JOIN tm_ofm_order o ON o.vin = m.vin
            WHERE m.vin IN (${filteredPlaceholders})
              AND m.uloc_no = 'AGMAS01001'
              AND m.is_deleted = 0
        ),
        all_movement AS (
            SELECT * FROM movement
            UNION ALL
            SELECT * FROM trimin_movement
        ),
        aggregated AS (
            SELECT
                vin,
                MAX(model) AS model,
                node_nature,
                MIN(scan_time) AS in_time,
                MAX(scan_time) AS out_time
            FROM all_movement
            GROUP BY vin, node_nature
        )
        SELECT
            vin AS VIN,
            MAX(model) AS Модель,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_TRIMIN' THEN in_time END) AS TRIMIN_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_TRIMIN' THEN out_time END) AS TRIMIN_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP7' THEN in_time END) AS CP7_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP7' THEN out_time END) AS CP7_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP72' THEN in_time END) AS CP72_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP72' THEN out_time END) AS CP72_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CPFINAL' THEN in_time END) AS CPFINAL_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CPFINAL' THEN out_time END) AS CPFINAL_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP8' THEN in_time END) AS CP8_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP8' THEN out_time END) AS CP8_out
        FROM aggregated
        GROUP BY vin
        ORDER BY vin
      `;

      const [detailRows] = await mesPool.query(sqlDetail, [...filteredVins, ...filteredVins]);
      return res.json(detailRows);
    } else {
      // Если выбран последний чекпоинт (CP8)
      const vinListOnly = vinsWithTimes.map(v => v.vin);
      const placeholders = vinListOnly.map(() => '?').join(',');
      const sqlDetail = `
        WITH movement AS (
            SELECT 
                v.vin,
                o.product AS model,
                m.node_nature,
                m.scan_time
            FROM tm_vhc_vehicle_movement m
            JOIN tm_vhc_vehicle v ON v.id = m.tm_vhc_vehicle_id
            LEFT JOIN tm_ofm_order o ON o.vin = v.vin
            WHERE v.vin IN (${placeholders})
              AND m.node_nature IN ('Key_Uloc_Type_CP7', 'Key_Uloc_Type_CP72', 'Key_Uloc_Type_CPFINAL', 'Key_Uloc_Type_CP8')
        ),
        trimin_movement AS (
            SELECT 
                m.vin,
                o.product AS model,
                'Key_Uloc_Type_TRIMIN' AS node_nature,
                m.scan_time
            FROM ti_mes_movement m
            LEFT JOIN tm_ofm_order o ON o.vin = m.vin
            WHERE m.vin IN (${placeholders})
              AND m.uloc_no = 'AGMAS01001'
              AND m.is_deleted = 0
        ),
        all_movement AS (
            SELECT * FROM movement
            UNION ALL
            SELECT * FROM trimin_movement
        ),
        aggregated AS (
            SELECT
                vin,
                MAX(model) AS model,
                node_nature,
                MIN(scan_time) AS in_time,
                MAX(scan_time) AS out_time
            FROM all_movement
            GROUP BY vin, node_nature
        )
        SELECT
            vin AS VIN,
            MAX(model) AS Модель,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_TRIMIN' THEN in_time END) AS TRIMIN_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_TRIMIN' THEN out_time END) AS TRIMIN_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP7' THEN in_time END) AS CP7_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP7' THEN out_time END) AS CP7_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP72' THEN in_time END) AS CP72_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP72' THEN out_time END) AS CP72_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CPFINAL' THEN in_time END) AS CPFINAL_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CPFINAL' THEN out_time END) AS CPFINAL_out,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP8' THEN in_time END) AS CP8_in,
            MAX(CASE WHEN node_nature = 'Key_Uloc_Type_CP8' THEN out_time END) AS CP8_out
        FROM aggregated
        GROUP BY vin
        ORDER BY vin
      `;
      const [detailRows] = await mesPool.query(sqlDetail, [...vinListOnly, ...vinListOnly]);
      return res.json(detailRows);
    }
  } catch (err) {
    console.error('Ошибка sgp-audit-vins-detail:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Загрузка данных аудита (из Excel)
app.post('/api/audit-results/upload', express.json(), async (req, res) => {
  try {
    const { rows } = req.body; // массив { vin, result, date_uploaded }
    if (!rows || !rows.length) return res.status(400).json({ error: 'Нет данных' });

    const sql = 'INSERT IGNORE INTO audit_results (vin, result, date_uploaded) VALUES ?';
    const values = rows.map(r => [r.vin, r.result, r.date_uploaded]);
    const [result] = await notesPool.query(sql, [values]);
    res.json({ success: true, inserted: result.affectedRows });
  } catch (err) {
    console.error('Ошибка загрузки аудита:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Получение всех записей аудита
app.get('/api/audit-results', async (req, res) => {
  try {
    const { dateFrom, dateTo, result } = req.query;
    let sql = 'SELECT vin, result, date_uploaded FROM audit_results WHERE 1=1';
    const params = [];

    if (dateFrom) { sql += ' AND date_uploaded >= ?'; params.push(dateFrom); }
    if (dateTo)   { sql += ' AND date_uploaded <= ?'; params.push(dateTo); }
    if (result && result !== 'ALL') { sql += ' AND result = ?'; params.push(result); }

    sql += ' ORDER BY date_uploaded, vin';
    const [rows] = await notesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения аудита:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== ТОП MPP ЗА НЕДЕЛЮ ==================
app.get('/api/mpp-weekly-top', async (req, res) => {
  try {
    const { dateFrom, dateTo, checkpoint, model, defectType } = req.query;
    if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom и dateTo обязательны' });

    const type = defectType || 'offline';

    const pipPosts = ['EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'];
    const cp7Posts = ['CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate', 'REPAIR', 'REPAIR_Final', 'EXT1', 'PIP2', 'PIP4', 'PIP9'];
    const cp8Posts = ['CP8', 'CP8 Gate', 'CP8-gate', '360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT'];
    const tlPosts  = ['360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT',, 'CP8 Touch Up'];

    let postList = [];
    if (!checkpoint || checkpoint === 'ALL') {
      postList = [...new Set([...pipPosts, ...cp7Posts, ...cp8Posts])];
    } else if (checkpoint === 'CP7') postList = cp7Posts;
    else if (checkpoint === 'CP8') postList = cp8Posts;
    else if (checkpoint === 'PIP') postList = pipPosts;
    else if (checkpoint === 'TL')  postList = tlPosts;
    else postList = [...new Set([...pipPosts, ...cp7Posts, ...cp8Posts])];

    const postListStr = postList.map(p => `'${p}'`).join(',');

    let typeCondition = '';
    if (type === 'offline') typeCondition = ' AND QM_DEF.S_OFFLINE = 1';
    else if (type === 'online') typeCondition = ' AND QM_DEF.S_OFFLINE = 0';

    const params = [dateFrom, dateTo];
    let modelCondition = '';
    if (model && model !== 'ALL') {
      modelCondition = ' AND wo.MODEL = ?';
      params.push(model);
    }

    const sql = `
      SELECT
        CONCAT(wo.MODEL, ' ', QM_DEF.PART_NAME, ' ', QM_DEF.PROBLEM_TYPE) AS MPP,
        QM_DEF.PART_NAME,
        QM_DEF.PROBLEM_TYPE,
        wo.MODEL,
        MIN(QM_DEF.POST_NAME) AS POST_NAME,
        COUNT(*) AS DEFECT_COUNT,
        COUNT(DISTINCT wo.VIN) AS VIN_COUNT,
        GROUP_CONCAT(DISTINCT wo.VIN) AS VIN_LIST
      FROM (
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_qm_defect_info
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE QM_DEF.POST_NAME IN (${postListStr})
        ${typeCondition}
        AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
        ${modelCondition}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
      GROUP BY MPP, QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, wo.MODEL
      ORDER BY DEFECT_COUNT DESC
      LIMIT 100
    `;

    const [rows] = await pool.query(sql, params);

    // Подсчёт общего количества уникальных VIN (для DPU)
    let totalCars = 0;
    if (postList.length > 0) {
      const carsSql = `
        SELECT COUNT(DISTINCT VIN) AS TOTAL
        FROM at_om_wiptrackinghistory
        WHERE WC_NAME IN (${postListStr})
          AND DATE(CREATION_TIME) BETWEEN ? AND ?
      `;
      const carsParams = [dateFrom, dateTo];
      const [[{ TOTAL }]] = await pool.query(carsSql, carsParams);
      totalCars = TOTAL || 0;
    }

    // Расчёт доли ремзоны для каждого MPP
    const result = [];
    for (let row of rows) {
      const vins = row.VIN_LIST ? row.VIN_LIST.split(',') : [];
      let remzoneCount = 0;
      if (vins.length > 0) {
        const placeholders = vins.map(() => '?').join(',');
        const remSql = `
          SELECT COUNT(DISTINCT tvv.VIN) AS CNT
          FROM tm_vhc_vehicle tvv
          JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN
          WHERE tvv.VIN IN (${placeholders})
            AND tvtlm.node_nature LIKE 'REP%'
        `;
        const [remRows] = await mesPool.query(remSql, vins);
        remzoneCount = remRows[0]?.CNT || 0;
      }

      const totalVins = vins.length;
      const remzonePercent = totalVins > 0 ? ((remzoneCount * 100) / totalVins).toFixed(2) : '0.00';

      result.push({
        MPP: row.MPP,
        MODEL: row.MODEL,
        PART_NAME: row.PART_NAME,
        PROBLEM_TYPE: row.PROBLEM_TYPE,
        POST_NAME: row.POST_NAME,
        DEFECT_COUNT: row.DEFECT_COUNT,
        VIN_COUNT: row.VIN_COUNT,
        DPU: totalCars > 0 ? ((row.DEFECT_COUNT * 1000) / totalCars).toFixed(2) : '0.00',
        TOTAL_VINS: totalVins,
        REMZONE_VINS: remzoneCount,
        REMZONE_PERCENT: remzonePercent,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Ошибка mpp-weekly-top:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// VIN для конкретного MPP
app.get('/api/mpp-vins', async (req, res) => {
  try {
    const { mpp, partName, problemType, dateFrom, dateTo, model } = req.query;
    if (!partName || !problemType || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'partName, problemType, dateFrom, dateTo обязательны' });
    }

    let where = `QM_DEF.PART_NAME = ? AND QM_DEF.PROBLEM_TYPE = ? AND QM_DEF.S_OFFLINE = 1 AND QM_DEF.CREATION_DATE BETWEEN ? AND ?`;
    const params = [partName, problemType, dateFrom, dateTo];

    if (model && model !== 'ALL') {
      where += ' AND wo.MODEL = ?';
      params.push(model);
    }

    const sql = `
      SELECT wo.VIN, wo.MODEL, MIN(QM_DEF.CREATION_TIME) AS DEFECT_TIME
      FROM (
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, CREATION_TIME,
               PART_NAME, PROBLEM_TYPE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
        FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, CREATION_TIME,
               PART_NAME, PROBLEM_TYPE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
        FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, CREATION_TIME,
               PART_NAME, PROBLEM_TYPE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
        FROM at_qm_defect_info
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE ${where}
      GROUP BY wo.VIN, wo.MODEL
      ORDER BY wo.VIN
    `;

    const [rows] = await pool.query(sql, params);
    const vins = rows.map(r => r.VIN);

    const remzoneMap = new Map();
    if (vins.length > 0) {
      const placeholders = vins.map(() => '?').join(',');
      const remSql = `
        SELECT tvv.VIN, 
               MIN(tvtlm.gmt_create) AS REM_IN,
               MAX(tvtlm.gmt_create) AS REM_OUT
        FROM tm_vhc_vehicle tvv
        JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN
        WHERE tvv.VIN IN (${placeholders})
          AND tvtlm.node_nature LIKE 'REP%'
          AND tvtlm.gmt_create IS NOT NULL
        GROUP BY tvv.VIN
      `;
      const [remRows] = await mesPool.query(remSql, vins);
      remRows.forEach(r => {
        const remIn = r.REM_IN ? new Date(r.REM_IN) : null;
        const remOut = r.REM_OUT ? new Date(r.REM_OUT) : null;
        let durationStr = '—';
        if (remIn && remOut) {
          const diffMs = remOut - remIn;
          if (diffMs <= 0) {
            durationStr = 'В ремзоне';
          } else {
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            durationStr = `${days}д ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }
        }
        remzoneMap.set(r.VIN, {
          in: r.REM_IN ? r.REM_IN.replace('T', ' ').slice(0, 19) : null,
          out: r.REM_OUT ? r.REM_OUT.replace('T', ' ').slice(0, 19) : null,
          duration: durationStr,
        });
      });
    }

    const result = rows.map(row => {
      const rem = remzoneMap.get(row.VIN);
      return {
        VIN: row.VIN,
        MODEL: row.MODEL,
        DEFECT_TIME: row.DEFECT_TIME ? row.DEFECT_TIME.replace('T', ' ').slice(0, 19) : null,
        IN_REMZONE: !!rem,
        REM_IN: rem ? rem.in : null,
        REM_OUT: rem ? rem.out : null,
        REM_DURATION: rem ? rem.duration : '—',
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Ошибка mpp-vins:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== СУММАРНОЕ ВРЕМЯ В РЕМЗОНЕ ПО MPP ==================
app.get('/api/mpp-remzone-duration', async (req, res) => {
  try {
    const { dateFrom, dateTo, checkpoint, model } = req.query;
    if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom и dateTo обязательны' });

    // Списки постов (аналогично mpp-weekly-top)
    const pipPosts = ['EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'];
    const cp7Posts = ['CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate', 'REPAIR', 'REPAIR_Final', 'EXT1', 'PIP2', 'PIP4', 'PIP9'];
    const cp8Posts = ['CP8', 'CP8 Gate', 'CP8-gate', '360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT'];
    const tlPosts  = ['360', 'ADAS', 'ADAS+RB', 'TEST TRACK', 'TRACK', 'WA', 'WT',, 'CP8 Touch Up'];

    let postList = [];
    if (!checkpoint || checkpoint === 'ALL') {
      postList = [...new Set([...pipPosts, ...cp7Posts, ...cp8Posts])];
    } else if (checkpoint === 'CP7') postList = cp7Posts;
    else if (checkpoint === 'CP8') postList = cp8Posts;
    else if (checkpoint === 'PIP') postList = pipPosts;
    else if (checkpoint === 'TL')  postList = tlPosts;
    else postList = [...new Set([...pipPosts, ...cp7Posts, ...cp8Posts])];

    const postListStr = postList.map(p => `'${p}'`).join(',');

    // Получаем все дефекты (офлайн) с их VIN и MPP
    const params = [dateFrom, dateTo];
    let modelCondition = '';
    if (model && model !== 'ALL') {
      modelCondition = ' AND wo.MODEL = ?';
      params.push(model);
    }

    const defectsSql = `
      SELECT
        CONCAT(wo.MODEL, ' ', QM_DEF.PART_NAME, ' ', QM_DEF.PROBLEM_TYPE) AS MPP,
        wo.MODEL,
        wo.VIN
      FROM (
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE
        FROM at_qm_defect_info
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE QM_DEF.POST_NAME IN (${postListStr})
        AND QM_DEF.S_OFFLINE = 1
        AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
        ${modelCondition}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
      GROUP BY MPP, wo.MODEL, wo.VIN
    `;

    const [defectRows] = await pool.query(defectsSql, params);

    // Для каждого VIN получаем суммарное время в ремзоне (из MES)
    const vins = [...new Set(defectRows.map(r => r.VIN))];
    const remDurationMap = new Map(); // vin -> total duration in hours

    if (vins.length > 0) {
      const placeholders = vins.map(() => '?').join(',');
      const remSql = `
        SELECT tvv.VIN, 
               MIN(tvtlm.gmt_create) AS REM_IN,
               MAX(tvtlm.gmt_create) AS REM_OUT
        FROM tm_vhc_vehicle tvv
        JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN
        WHERE tvv.VIN IN (${placeholders})
          AND tvtlm.node_nature LIKE 'REP%'
          AND tvtlm.gmt_create IS NOT NULL
        GROUP BY tvv.VIN
      `;
      const [remRows] = await mesPool.query(remSql, vins);
      remRows.forEach(r => {
        if (r.REM_IN && r.REM_OUT) {
          const diffMs = new Date(r.REM_OUT) - new Date(r.REM_IN);
          if (diffMs > 0) {
            remDurationMap.set(r.VIN, diffMs / (1000 * 60 * 60)); // часы
          }
        }
      });
    }

    // Группируем по MPP и модели, суммируем время
    const mppDurationMap = {};
    defectRows.forEach(row => {
      const key = row.MPP;
      if (!mppDurationMap[key]) {
        mppDurationMap[key] = {
          MPP: key,
          MODEL: row.MODEL,
          totalDurationHours: 0,
          vinCount: 0,
        };
      }
      const duration = remDurationMap.get(row.VIN) || 0;
      if (duration > 0) {
        mppDurationMap[key].totalDurationHours += duration;
        mppDurationMap[key].vinCount += 1;
      }
    });

    const result = Object.values(mppDurationMap)
      .filter(item => item.totalDurationHours > 0)
      .sort((a, b) => b.totalDurationHours - a.totalDurationHours)
      .map(item => ({
        ...item,
        totalDurationDays: (item.totalDurationHours / 24).toFixed(2),
        totalDurationHours: item.totalDurationHours.toFixed(2),
      }));

    // Общая сумма времени по всем дефектам
    const totalHours = result.reduce((sum, item) => sum + parseFloat(item.totalDurationHours), 0);

    res.json({
      items: result,
      totalHours: totalHours.toFixed(2),
      totalDays: (totalHours / 24).toFixed(2),
    });
  } catch (err) {
    console.error('Ошибка mpp-remzone-duration:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== АНАЛИТИКА ПО DRR (ВРЕМЯ В РЕМЗОНЕ) ==================
app.get('/api/mpp-drr-analytics', async (req, res) => {
  try {
    const { dateFrom, dateTo, checkpoint, model } = req.query;
    if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom, dateTo обязательны' });

    // ========== 1. Список постов для дефектов (зависит от фильтра чекпоинтов) ==========
    const pipPosts = ['EXT1','PIP1','PIP2','PIP4','PIP5','PIP6','PIP8','PIP9'];
    const cp7Posts = ['CP7','CP7 Audit','CP7 Gate','CP7-gate','REPAIR','REPAIR_Final','EXT1','PIP2','PIP4','PIP9'];
    const cp8Posts = ['CP8','CP8 Gate','CP8-gate','360','ADAS','ADAS+RB','TEST TRACK','TRACK','WA','WT','CP8 Touch Up'];

    let defectPostList = [];
    if (!checkpoint || checkpoint === 'ALL') defectPostList = [...new Set([...pipPosts, ...cp7Posts, ...cp8Posts])];
    else if (checkpoint === 'CP7') defectPostList = cp7Posts;
    else if (checkpoint === 'CP8') defectPostList = cp8Posts;
    else if (checkpoint === 'PIP') defectPostList = pipPosts;
    else defectPostList = [...new Set([...pipPosts, ...cp7Posts, ...cp8Posts])];

    const defectPostListStr = defectPostList.map(p => `'${p}'`).join(',');

    // ========== 2. Общее количество машин и в ремзоне – ВСЕГДА по CP72 ==========
    const cp72PostList = ['CP72'];
    const cp72PostListStr = cp72PostList.map(p => `'${p}'`).join(',');

    const days = [];
    let current = new Date(dateFrom);
    const end = new Date(dateTo);
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    let totalVins = 0;
    let totalRemVins = 0;

    for (const day of days) {
      // Параметры для CP72
      const carsParams = [day];
      if (model && model !== 'ALL') carsParams.push(model);

      // Количество уникальных VIN за день по CP72
      const [[{ CNT }]] = await pool.query(`
        SELECT COUNT(DISTINCT VIN) AS CNT
        FROM at_om_wiptrackinghistory
        WHERE WC_NAME IN (${cp72PostListStr})
          AND DATE(CREATION_TIME) = ?
          ${model && model !== 'ALL' ? ' AND MODEL = ?' : ''}
      `, carsParams);

      totalVins += CNT || 0;

      if (CNT > 0) {
        // Список VIN за день для проверки ремзоны
        const [vinsRows] = await pool.query(`
          SELECT DISTINCT VIN
          FROM at_om_wiptrackinghistory
          WHERE WC_NAME IN (${cp72PostListStr})
            AND DATE(CREATION_TIME) = ?
            ${model && model !== 'ALL' ? ' AND MODEL = ?' : ''}
        `, carsParams);

        const vinsList = vinsRows.map(r => r.VIN);
        const placeholders = vinsList.map(() => '?').join(',');

        const [remRows] = await mesPool.query(`
          SELECT COUNT(DISTINCT tvv.VIN) AS CNT
          FROM tm_vhc_vehicle tvv
          JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN
          WHERE tvv.VIN IN (${placeholders})
            AND tvtlm.node_nature LIKE 'REP%'
        `, vinsList);

        totalRemVins += remRows[0]?.CNT || 0;
      }
    }

    // ========== 3. Данные по дефектам (с фильтром чекпоинтов) ==========
    let modelCondition = '';
    const params = [dateFrom, dateTo];
    if (model && model !== 'ALL') {
      modelCondition = ' AND wo.MODEL = ?';
      params.push(model);
    }

    const sqlDefects = `
      SELECT
        CONCAT(wo.MODEL, ' ', QM_DEF.PART_NAME, ' ', QM_DEF.PROBLEM_TYPE) AS MPP,
        QM_DEF.PART_NAME,
        QM_DEF.PROBLEM_TYPE,
        wo.MODEL,
        COUNT(*) AS DEFECT_COUNT,
        GROUP_CONCAT(DISTINCT wo.VIN) AS VIN_LIST
      FROM (
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE, POST_NAME
        FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE, POST_NAME
        FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, DATE(CREATION_TIME) AS CREATION_DATE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE,
               PART_NAME, PROBLEM_TYPE, POST_NAME
        FROM at_qm_defect_info
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE QM_DEF.POST_NAME IN (${defectPostListStr})
        AND QM_DEF.S_OFFLINE = 1
        AND QM_DEF.CREATION_DATE BETWEEN ? AND ?
        ${modelCondition}
        AND QM_DEF.PART_NAME IS NOT NULL AND TRIM(QM_DEF.PART_NAME) <> ''
        AND QM_DEF.PROBLEM_TYPE IS NOT NULL AND TRIM(QM_DEF.PROBLEM_TYPE) <> ''
      GROUP BY MPP, QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, wo.MODEL
      ORDER BY DEFECT_COUNT DESC
      LIMIT 50
    `;
    const [defectRows] = await pool.query(sqlDefects, params);

    const result = [];
    for (let row of defectRows) {
      const vins = row.VIN_LIST ? row.VIN_LIST.split(',') : [];
      let totalHours = 0;
      let remzoneCount = 0;

      if (vins.length > 0) {
        const placeholders = vins.map(() => '?').join(',');
        const [remRows] = await mesPool.query(`
          SELECT tvv.VIN, 
                 MIN(tvtlm.gmt_create) AS REM_IN,
                 MAX(tvtlm.gmt_create) AS REM_OUT
          FROM tm_vhc_vehicle tvv
          JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN
          WHERE tvv.VIN IN (${placeholders})
            AND tvtlm.node_nature LIKE 'REP%'
          GROUP BY tvv.VIN
        `, vins);

        remRows.forEach(r => {
          if (r.REM_IN && r.REM_OUT) {
            const diffMs = new Date(r.REM_OUT) - new Date(r.REM_IN);
            if (diffMs > 0) {
              totalHours += diffMs / (1000 * 60 * 60);
              remzoneCount++;
            }
          }
        });
      }

      result.push({
        MPP: row.MPP,
        MODEL: row.MODEL,
        DEFECT_COUNT: row.DEFECT_COUNT,
        REMZONE_COUNT: remzoneCount,
        TOTAL_HOURS: totalHours,
      });
    }

    res.json({
      data: result,
      summary: {
        totalVins: totalVins,       // сумма дневных уникальных VIN по CP72
        totalRemVins: totalRemVins, // из них в ремзоне
      }
    });
  } catch (err) {
    console.error('Ошибка mpp-drr-analytics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/part-defect-search', async (req, res) => {
  try {
    const { part, defect, model, dateFrom, dateTo } = req.query;
    if (!part && !defect && !model) {
      return res.status(400).json({ error: 'Укажите хотя бы один параметр' });
    }

    let where = '1=1';
    const params = [];

    if (part) {
      where += ' AND QM_DEF.PART_NAME LIKE ?';
      params.push(`%${part}%`);
    }
    if (defect) {
      where += ' AND QM_DEF.PROBLEM_TYPE LIKE ?';
      params.push(`%${defect}%`);
    }
    if (model && model !== 'ALL') {
      where += ' AND wo.MODEL = ?';
      params.push(model);
    }
    if (dateFrom) {
      where += ' AND QM_DEF.CREATION_TIME >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      where += ' AND QM_DEF.CREATION_TIME <= ?';
      params.push(dateTo);
    }

    const defectSql = `
      SELECT QM_DEF.VIN, QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, QM_DEF.PROBLEM_REPLENISH, QM_DEF.CREATION_TIME
      FROM (
        SELECT VIN, CREATION_TIME, PART_NAME, PROBLEM_TYPE, PROBLEM_REPLENISH FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, CREATION_TIME, PART_NAME, PROBLEM_TYPE, PROBLEM_REPLENISH FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, CREATION_TIME, PART_NAME, PROBLEM_TYPE, PROBLEM_REPLENISH FROM at_qm_defect_info
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE ${where}
      ORDER BY QM_DEF.CREATION_TIME DESC
    `;

    const [defectRows] = await pool.query(defectSql, params);
    if (defectRows.length === 0) return res.json([]);

    const vins = [...new Set(defectRows.map(r => r.VIN))];
    const placeholders = vins.map(() => '?').join(',');

    const timePointsSql = `
      SELECT
        too.vin,
        too.material_no AS material_code,
        tvv.sequence_number,
        uvkmm.kd_material_no,
        too.product AS model,
        tbmr.material_desc,
        tbmr.ps_material_desc AS colour,
        t.CP5, t.CP6, t.TRIMIN, t.CP7, t.CP72, t.CPFINAL, t.CP8
      FROM tm_ofm_order too
      LEFT JOIN tm_vhc_vehicle tvv ON too.vin = tvv.vin
      LEFT JOIN tm_bas_material_relation tbmr 
        ON tbmr.material_no = too.material_no AND tbmr.is_deleted = 0
      LEFT JOIN udt_vsp_kd_material_mapping uvkmm 
        ON CONCAT(LEFT(tbmr.material_no, 7), '**', RIGHT(tbmr.material_no, 6)) = uvkmm.material_no 
        AND uvkmm.kd_material_no = tbmr.kd_material_no
      LEFT JOIN (
        SELECT vin,
               MAX(IF(uloc_no = 'AGMBS01002', scan_time, NULL)) AS CP5,
               MAX(IF(uloc_no = 'AGMPS01002', scan_time, NULL)) AS CP6,
               MAX(IF(uloc_no = 'AGMAS01001', scan_time, NULL)) AS TRIMIN,
               MAX(IF(uloc_no = 'AGMAS01003', scan_time, NULL)) AS CP7,
               MAX(IF(uloc_no = 'CP72', scan_time, NULL)) AS CP72,
               MAX(IF(uloc_no = 'CPFINAL', scan_time, NULL)) AS CPFINAL,
               MAX(IF(uloc_no = 'AGMAS01004', scan_time, NULL)) AS CP8
        FROM ti_mes_movement
        WHERE is_deleted = 0
        GROUP BY vin
      ) t ON t.vin = too.vin
      WHERE too.vin IN (${placeholders})
    `;
    const [vehicles] = await mesPool.query(timePointsSql, vins);
    const vehicleMap = new Map(vehicles.map(v => [v.vin, v]));

    const [storageRows] = await lesPool.query(`
      SELECT vin, in_storage_time, out_storage_time,
             in_storage_status,
             ck_no, kq_no, kw_no
      FROM tv_biz_storage_car
      WHERE vin IN (${placeholders})
    `, vins);
    const storageMap = new Map(storageRows.map(r => [r.vin, r]));

    const [iotRows] = await pool.query(`
      SELECT wo.vin,
             MAX(IF(aow.wc_name = 'TLWA', aow.creation_time, NULL)) AS TLWA,
             MAX(IF(aow.wc_name = 'TLRT', aow.creation_time, NULL)) AS TLRT,
             MAX(IF(aow.wc_name = 'TLADAS', aow.creation_time, NULL)) AS TLADAS,
             MAX(IF(aow.wc_name = 'TLTT', aow.creation_time, NULL)) AS TLTT
      FROM work_order wo
      LEFT JOIN at_om_wiptrackinghistory aow ON wo.vin = aow.vin
      WHERE wo.vin IN (${placeholders})
      GROUP BY wo.vin
    `, vins);
    const iotMap = new Map(iotRows.map(r => [r.vin, r]));

    const result = defectRows.map(defect => {
      const v = vehicleMap.get(defect.VIN);
      if (!v) return null;

      const les = storageMap.get(defect.VIN) || {};
      const iot = iotMap.get(defect.VIN) || {};

      const times = {
        CP5: v.CP5, CP6: v.CP6, TRIMIN: v.TRIMIN, CP7: v.CP7, CP72: v.CP72,
        TLWA: iot.TLWA, TLRT: iot.TLRT, TLADAS: iot.TLADAS, TLTT: iot.TLTT,
        CPFINAL: v.CPFINAL, CP8: v.CP8
      };

      const checkpoints = ['CP5','CP6','TRIMIN','CP7','CP72','TLWA','TLRT','TLADAS','TLTT','CPFINAL','CP8'];
      let latestCheckpoint = null;
      let latestTime = null;
      for (const cp of checkpoints) {
        if (times[cp]) {
          const t = new Date(times[cp]);
          if (!latestTime || t > latestTime) {
            latestTime = t;
            latestCheckpoint = cp;
          }
        }
      }

      const storageStatus = les.in_storage_status || '';
      const isSold = storageStatus === 'Key_Car_In_Storage_Status_3';
      const hasStorageData = les.ck_no && les.kq_no && les.kw_no &&
                             les.ck_no !== 'N/A' && les.kq_no !== 'N/A' && les.kw_no !== 'N/A';
      const isInStorage = !isSold && hasStorageData;

      let currentZone;
      if (isSold) currentZone = 'Продан';
      else if (isInStorage) currentZone = `${les.ck_no}-${les.kq_no}-${les.kw_no}`;
      else currentZone = latestCheckpoint || 'Планирование';

      return {
        vin: defect.VIN,
        part_name: defect.PART_NAME || '',
        problem_type: defect.PROBLEM_TYPE || '',
        problem_replenish: defect.PROBLEM_REPLENISH || '',
        defect_creation_time: defect.CREATION_TIME,
        material_code: v.material_code,
        sequence_number: v.sequence_number,
        kd_material_no: v.kd_material_no,
        model: v.model,
        material_desc: v.material_desc,
        colour: v.colour,
        CP5: v.CP5, CP6: v.CP6, TRIMIN: v.TRIMIN, CP7: v.CP7, CP72: v.CP72,
        TLWA: iot.TLWA || null, TLRT: iot.TLRT || null, TLADAS: iot.TLADAS || null, TLTT: iot.TLTT || null,
        CPFINAL: v.CPFINAL, CP8: v.CP8,
        in_storage_time: les.in_storage_time || null,
        out_storage_time: les.out_storage_time || null,
        location: currentZone,
        current_zone: currentZone,
      };
    }).filter(Boolean);

    res.json(result);
  } catch (err) {
    console.error('Ошибка part-defect-search:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vin-defect-search', async (req, res) => {
  try {
    const { vin, model, dateFrom, dateTo } = req.query;
    if (!vin && !model) {
      return res.status(400).json({ error: 'Укажите VIN или модель' });
    }

    let where = '1=1';
    const params = [];

    if (vin) {
      where += ' AND QM_DEF.VIN LIKE ?';
      params.push(`%${vin}%`);
    }
    if (model && model !== 'ALL') {
      where += ' AND wo.MODEL = ?';
      params.push(model);
    }
    if (dateFrom) {
      where += ' AND QM_DEF.CREATION_TIME >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      where += ' AND QM_DEF.CREATION_TIME <= ?';
      params.push(dateTo);
    }

    const defectSql = `
      SELECT QM_DEF.VIN, QM_DEF.PART_NAME, QM_DEF.PROBLEM_TYPE, QM_DEF.PROBLEM_REPLENISH, QM_DEF.CREATION_TIME
      FROM (
        SELECT VIN, CREATION_TIME, PART_NAME, PROBLEM_TYPE, PROBLEM_REPLENISH FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, CREATION_TIME, PART_NAME, PROBLEM_TYPE, PROBLEM_REPLENISH FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, CREATION_TIME, PART_NAME, PROBLEM_TYPE, PROBLEM_REPLENISH FROM at_qm_defect_info
      ) QM_DEF
      JOIN work_order wo ON wo.VIN = QM_DEF.VIN
      WHERE ${where}
      ORDER BY QM_DEF.CREATION_TIME DESC
    `;

    const [defectRows] = await pool.query(defectSql, params);
    if (defectRows.length === 0) return res.json([]);

    const vins = [...new Set(defectRows.map(r => r.VIN))];
    const placeholders = vins.map(() => '?').join(',');

    // Получаем time-points из MES
    const timePointsSql = `
      SELECT
        too.vin,
        too.material_no AS material_code,
        tvv.sequence_number,
        uvkmm.kd_material_no,
        too.product AS model,
        tbmr.material_desc,
        tbmr.ps_material_desc AS colour,
        t.CP5, t.CP6, t.TRIMIN, t.CP7, t.CP72, t.CPFINAL, t.CP8
      FROM tm_ofm_order too
      LEFT JOIN tm_vhc_vehicle tvv ON too.vin = tvv.vin
      LEFT JOIN tm_bas_material_relation tbmr 
        ON tbmr.material_no = too.material_no AND tbmr.is_deleted = 0
      LEFT JOIN udt_vsp_kd_material_mapping uvkmm 
        ON CONCAT(LEFT(tbmr.material_no, 7), '**', RIGHT(tbmr.material_no, 6)) = uvkmm.material_no 
        AND uvkmm.kd_material_no = tbmr.kd_material_no
      LEFT JOIN (
        SELECT vin,
               MAX(IF(uloc_no = 'AGMBS01002', scan_time, NULL)) AS CP5,
               MAX(IF(uloc_no = 'AGMPS01002', scan_time, NULL)) AS CP6,
               MAX(IF(uloc_no = 'AGMAS01001', scan_time, NULL)) AS TRIMIN,
               MAX(IF(uloc_no = 'AGMAS01003', scan_time, NULL)) AS CP7,
               MAX(IF(uloc_no = 'CP72', scan_time, NULL)) AS CP72,
               MAX(IF(uloc_no = 'CPFINAL', scan_time, NULL)) AS CPFINAL,
               MAX(IF(uloc_no = 'AGMAS01004', scan_time, NULL)) AS CP8
        FROM ti_mes_movement
        WHERE is_deleted = 0
        GROUP BY vin
      ) t ON t.vin = too.vin
      WHERE too.vin IN (${placeholders})
    `;
    const [vehicles] = await mesPool.query(timePointsSql, vins);
    const vehicleMap = new Map(vehicles.map(v => [v.vin, v]));

    // Получаем складские данные (LES)
    const [storageRows] = await lesPool.query(`
      SELECT vin, in_storage_time, out_storage_time,
             in_storage_status,
             ck_no, kq_no, kw_no
      FROM tv_biz_storage_car
      WHERE vin IN (${placeholders})
    `, vins);
    const storageMap = new Map(storageRows.map(r => [r.vin, r]));

    // Получаем TL времена из IoT
    const [iotRows] = await pool.query(`
      SELECT wo.vin,
             MAX(IF(aow.wc_name = 'TLWA', aow.creation_time, NULL)) AS TLWA,
             MAX(IF(aow.wc_name = 'TLRT', aow.creation_time, NULL)) AS TLRT,
             MAX(IF(aow.wc_name = 'TLADAS', aow.creation_time, NULL)) AS TLADAS,
             MAX(IF(aow.wc_name = 'TLTT', aow.creation_time, NULL)) AS TLTT
      FROM work_order wo
      LEFT JOIN at_om_wiptrackinghistory aow ON wo.vin = aow.vin
      WHERE wo.vin IN (${placeholders})
      GROUP BY wo.vin
    `, vins);
    const iotMap = new Map(iotRows.map(r => [r.vin, r]));

    // Формируем результат
    const result = defectRows.map(defect => {
      const v = vehicleMap.get(defect.VIN);
      if (!v) return null;

      const les = storageMap.get(defect.VIN) || {};
      const iot = iotMap.get(defect.VIN) || {};

      const times = {
        CP5: v.CP5,
        CP6: v.CP6,
        TRIMIN: v.TRIMIN,
        CP7: v.CP7,
        CP72: v.CP72,
        TLWA: iot.TLWA,
        TLRT: iot.TLRT,
        TLADAS: iot.TLADAS,
        TLTT: iot.TLTT,
        CPFINAL: v.CPFINAL,
        CP8: v.CP8,
      };

      const checkpoints = ['CP5','CP6','TRIMIN','CP7','CP72','TLWA','TLRT','TLADAS','TLTT','CPFINAL','CP8'];
      let latestCheckpoint = null;
      let latestTime = null;
      for (const cp of checkpoints) {
        if (times[cp]) {
          const t = new Date(times[cp]);
          if (!latestTime || t > latestTime) {
            latestTime = t;
            latestCheckpoint = cp;
          }
        }
      }

      const storageStatus = les.in_storage_status || '';
      const isSold = storageStatus === 'Key_Car_In_Storage_Status_3';
      const hasStorageData = les.ck_no && les.kq_no && les.kw_no &&
                             les.ck_no !== 'N/A' && les.kq_no !== 'N/A' && les.kw_no !== 'N/A';
      const isInStorage = !isSold && hasStorageData;

      let currentZone;
      if (isSold) currentZone = 'Продан';
      else if (isInStorage) currentZone = `${les.ck_no}-${les.kq_no}-${les.kw_no}`;
      else currentZone = latestCheckpoint || 'Планирование';

      return {
        vin: defect.VIN,
        part_name: defect.PART_NAME || '',
        problem_type: defect.PROBLEM_TYPE || '',
        problem_replenish: defect.PROBLEM_REPLENISH || '',
        defect_creation_time: defect.CREATION_TIME,
        material_code: v.material_code,
        sequence_number: v.sequence_number,
        kd_material_no: v.kd_material_no,
        model: v.model,
        material_desc: v.material_desc,
        colour: v.colour,
        CP5: v.CP5,
        CP6: v.CP6,
        TRIMIN: v.TRIMIN,
        CP7: v.CP7,
        CP72: v.CP72,
        TLWA: iot.TLWA || null,
        TLRT: iot.TLRT || null,
        TLADAS: iot.TLADAS || null,
        TLTT: iot.TLTT || null,
        CPFINAL: v.CPFINAL,
        CP8: v.CP8,
        in_storage_time: les.in_storage_time || null,
        out_storage_time: les.out_storage_time || null,
        location: currentZone,
        current_zone: currentZone,
      };
    }).filter(Boolean);

    res.json(result);
  } catch (err) {
    console.error('Ошибка vin-defect-search:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drr-retrospective', async (req, res) => {
  try {
    const { period = 'all', count, fromDate, toDate } = req.query;

    // Функция получения DRR для одного периода
    const getDrr = async (startDate, endDate, label, type) => {
      const sql = `
        SELECT
          all_cars.MODEL,
          COALESCE(all_cars.TOTAL, 0) AS TOTAL,
          COALESCE(remzone.REMZONE_COUNT, 0) AS REMZONE_COUNT,
          ROUND(100 - COALESCE(remzone.REMZONE_COUNT, 0) * 100.0 / NULLIF(all_cars.TOTAL, 0), 1) AS DRR_PERCENT
        FROM (
          SELECT
            too.product AS MODEL,
            COUNT(DISTINCT tvv.VIN) AS TOTAL
          FROM tm_vhc_vehicle tvv
          JOIN tm_ofm_order too ON too.VIN = tvv.VIN
          JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
          WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
            AND DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) BETWEEN ? AND ?
          GROUP BY MODEL
        ) all_cars
        LEFT JOIN (
          SELECT
            too.product AS MODEL,
            COUNT(DISTINCT tvv.VIN) AS REMZONE_COUNT
          FROM tm_vhc_vehicle tvv
          JOIN tm_ofm_order too ON too.VIN = tvv.VIN
          JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
          JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN AND tvtlm.node_nature LIKE 'REP%'
          WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
            AND DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) BETWEEN ? AND ?
          GROUP BY MODEL
        ) remzone ON all_cars.MODEL = remzone.MODEL
        ORDER BY all_cars.MODEL
      `;

      const [rows] = await mesPool.query(sql, [startDate, endDate, startDate, endDate]);
      const result = { label, type };
      let totalSum = 0, cnt = 0;
      rows.forEach(row => {
        result[row.MODEL] = row.DRR_PERCENT;
        if (row.DRR_PERCENT !== null) {
          totalSum += row.DRR_PERCENT;
          cnt++;
        }
      });
      result.total = cnt > 0 ? +(totalSum / cnt).toFixed(1) : 0;
      return result;
    };

    // Вспомогательные функции
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const getISOWeek = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const pad = (num) => String(num).padStart(2, '0');

    const now = new Date();
    const periods = [];

    const typeOrder = { year: 0, month: 1, week: 2, day: 3 };

    if (period === 'all') {
      // существующая логика для всех периодов
      for (let i = 1; i >= 0; i--) {
        const y = now.getFullYear() - i;
        periods.push({ label: String(y), startDate: `${y}-01-01`, endDate: `${y}-12-31`, type: 'year' });
      }
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
        const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
        periods.push({ label: `${monthName} ${y}`, startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`, type: 'month' });
      }
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      for (let i = 3; i >= 0; i--) {
        const start = new Date(monday);
        start.setDate(monday.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const weekNum = getISOWeek(start);
        periods.push({ label: `W${weekNum} ${start.getFullYear()}`, startDate: formatDate(start), endDate: formatDate(end), type: 'week' });
      }
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        periods.push({ label: `${pad(d.getDate())}.${pad(d.getMonth()+1)}`, startDate: formatDate(d), endDate: formatDate(d), type: 'day' });
      }
    } else {
      if (fromDate && toDate) {
        // Генерация периодов на основе заданного диапазона
        let from = new Date(fromDate + 'T00:00:00');
        let to = new Date(toDate + 'T00:00:00');
        if (from > to) [from, to] = [to, from];

        if (period === 'day') {
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);
            periods.push({
              label: `${pad(d.getDate())}.${pad(d.getMonth()+1)}`,
              startDate: dateStr,
              endDate: dateStr,
              type: 'day'
            });
          }
        } else if (period === 'month') {
          let d = new Date(from.getFullYear(), from.getMonth(), 1);
          while (d <= to) {
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const lastDay = new Date(y, m, 0).getDate();
            const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
            periods.push({
              label: `${monthName} ${y}`,
              startDate: `${y}-${pad(m)}-01`,
              endDate: `${y}-${pad(m)}-${lastDay}`,
              type: 'month'
            });
            d.setMonth(d.getMonth() + 1);
          }
        } else if (period === 'week') {
          const day = from.getDay();
          const monday = new Date(from);
          monday.setDate(from.getDate() - (day === 0 ? 6 : day - 1));
          for (let start = new Date(monday); start <= to; start.setDate(start.getDate() + 7)) {
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            periods.push({
              label: `W${getISOWeek(start)} ${start.getFullYear()}`,
              startDate: formatDate(start),
              endDate: formatDate(end),
              type: 'week'
            });
          }
        } else if (period === 'year') {
          for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
            periods.push({
              label: String(y),
              startDate: `${y}-01-01`,
              endDate: `${y}-12-31`,
              type: 'year'
            });
          }
        }
      } else {
        // Существующая логика на основе count
        const defaultCount = { year: 2, month: 3, week: 4, day: 14 }[period] || 7;
        const limit = parseInt(count, 10) || defaultCount;

        if (period === 'year') {
          for (let i = limit - 1; i >= 0; i--) {
            const y = now.getFullYear() - i;
            periods.push({ label: String(y), startDate: `${y}-01-01`, endDate: `${y}-12-31`, type: 'year' });
          }
        } else if (period === 'month') {
          for (let i = limit - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
            const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
            periods.push({ label: `${monthName} ${y}`, startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`, type: 'month' });
          }
        } else if (period === 'week') {
          const dayOfWeek = now.getDay();
          const monday = new Date(now);
          monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          for (let i = limit - 1; i >= 0; i--) {
            const start = new Date(monday);
            start.setDate(monday.getDate() - i * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            const weekNum = getISOWeek(start);
            periods.push({ label: `W${weekNum} ${start.getFullYear()}`, startDate: formatDate(start), endDate: formatDate(end), type: 'week' });
          }
        } else if (period === 'day') {
          for (let i = limit - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            periods.push({ label: `${pad(d.getDate())}.${pad(d.getMonth()+1)}`, startDate: formatDate(d), endDate: formatDate(d), type: 'day' });
          }
        }
      }
    }

    periods.sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.startDate.localeCompare(b.startDate));

    const result = [];
    for (const p of periods) {
      result.push(await getDrr(p.startDate, p.endDate, p.label, p.type));
    }

    res.json({ dataPoints: result });
  } catch (err) {
    console.error('Ошибка drr-retrospective:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/problem-grades', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT PROBLEM_GRADE
      FROM (
        SELECT PROBLEM_GRADE FROM at_biw_qm_defect_info
        UNION ALL
        SELECT PROBLEM_GRADE FROM at_paint_qm_defect_info
        UNION ALL
        SELECT PROBLEM_GRADE FROM at_qm_defect_info
      ) t
      WHERE PROBLEM_GRADE IS NOT NULL AND TRIM(PROBLEM_GRADE) <> ''
      ORDER BY PROBLEM_GRADE
    `);
    const grades = rows.map(r => r.PROBLEM_GRADE).filter(Boolean);
    res.json(grades);
  } catch (err) {
    console.error('Ошибка получения классов дефектов:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/daily-dashboard-week', async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.query;

    // Определяем неделю по умолчанию (текущую), если не передана
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const start = weekStart || monday.toISOString().split('T')[0];
    const end   = weekEnd   || saturday.toISOString().split('T')[0];

    const days = [];
    for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    const cp7Posts = ['CP7','CP7 Audit','CP7 Gate','CP7-gate','CP8 Touch Up','REPAIR','REPAIR_Final','EXT1','PIP2','PIP4','PIP9','REPAIR VERIFICATION','Topcoat preparation'];
    const cp8Posts = ['CP8','CP8 Gate','CP8-gate','360','ADAS','ADAS+RB','TEST TRACK','TRACK','WA','WT'];
    const allCpPosts = [...cp7Posts, ...cp8Posts];
    const postListStr = allCpPosts.map(p => `'${p}'`).join(',');

    // DRR за день
    const getMaxDrrForDay = async (date) => {
      const [rows] = await mesPool.query(`
        SELECT
          ROUND(100 - COALESCE(remzone.REMZONE_COUNT, 0) * 100.0 / NULLIF(all_cars.TOTAL, 0), 1) AS DRR
        FROM (
          SELECT too.product AS MODEL, COUNT(DISTINCT tvv.VIN) AS TOTAL
          FROM tm_vhc_vehicle tvv
          JOIN tm_ofm_order too ON too.VIN = tvv.VIN
          JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
          WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
            AND DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) = ?
          GROUP BY too.product
        ) all_cars
        LEFT JOIN (
          SELECT too.product AS MODEL, COUNT(DISTINCT tvv.VIN) AS REMZONE_COUNT
          FROM tm_vhc_vehicle tvv
          JOIN tm_ofm_order too ON too.VIN = tvv.VIN
          JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
          JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN AND tvtlm.node_nature LIKE 'REP%'
          WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
            AND DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) = ?
          GROUP BY too.product
        ) remzone ON all_cars.MODEL = remzone.MODEL
      `, [date, date]);
      const values = rows.map(r => r.DRR).filter(v => v !== null);
      return values.length > 0 ? Math.max(...values) : 0;
    };

    // DPU за день
    const getDpu = async (date) => {
      const [carsRows] = await pool.query(`
        SELECT COUNT(DISTINCT VIN) AS CARS
        FROM at_om_wiptrackinghistory
        WHERE WC_NAME IN (${postListStr}) AND DATE(CREATION_TIME) = ?
      `, [date]);
      const CARS = Number(carsRows?.[0]?.CARS) || 0;
      const [defRows] = await pool.query(`
        SELECT COUNT(*) AS DEFECTS
        FROM (
          SELECT VIN FROM at_biw_qm_defect_info WHERE DATE(CREATION_TIME) = ? AND (OFFLINE OR OFFLINE1 OR OFFLINE2) AND POST_NAME IN (${postListStr})
          UNION ALL
          SELECT VIN FROM at_paint_qm_defect_info WHERE DATE(CREATION_TIME) = ? AND (OFFLINE OR OFFLINE1 OR OFFLINE2) AND POST_NAME IN (${postListStr})
          UNION ALL
          SELECT VIN FROM at_qm_defect_info WHERE DATE(CREATION_TIME) = ? AND (OFFLINE OR OFFLINE1 OR OFFLINE2) AND POST_NAME IN (${postListStr})
        ) t
      `, [date, date, date]);
      const DEFECTS = Number(defRows?.[0]?.DEFECTS) || 0;
      return CARS > 0 ? (DEFECTS / CARS).toFixed(1) : '0.0';
    };

    // Недельный DRR
    // Недельный DRR – исправлено: берём максимум по моделям
    const [weekDrrRows] = await mesPool.query(`
      SELECT
        ROUND(100 - COALESCE(remzone.REMZONE_COUNT, 0) * 100.0 / NULLIF(all_cars.TOTAL, 0), 1) AS DRR
      FROM (
        SELECT too.product AS MODEL, COUNT(DISTINCT tvv.VIN) AS TOTAL
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
          AND DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) BETWEEN ? AND ?
        GROUP BY too.product
      ) all_cars
      LEFT JOIN (
        SELECT too.product AS MODEL, COUNT(DISTINCT tvv.VIN) AS REMZONE_COUNT
        FROM tm_vhc_vehicle tvv
        JOIN tm_ofm_order too ON too.VIN = tvv.VIN
        JOIN tm_vhc_vehicle_movement tvvm ON tvv.id = tvvm.tm_vhc_vehicle_id
        JOIN tm_vhc_test_line_movement tvtlm ON tvtlm.VIN = tvv.VIN AND tvtlm.node_nature LIKE 'REP%'
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CPFINAL'
          AND DATE(DATE_SUB(tvvm.scan_time, INTERVAL 470 MINUTE)) BETWEEN ? AND ?
        GROUP BY too.product
      ) remzone ON all_cars.MODEL = remzone.MODEL
    `, [start, end, start, end]);

    const weekDrrValues = weekDrrRows.map(r => r.DRR).filter(v => v !== null);
    const weekDrr = weekDrrValues.length > 0 ? Math.max(...weekDrrValues) : 0;

    // Недельный DPU
    const [weekCarsRows] = await pool.query(`
      SELECT COUNT(DISTINCT VIN) AS CARS
      FROM at_om_wiptrackinghistory
      WHERE WC_NAME IN (${postListStr}) AND DATE(CREATION_TIME) BETWEEN ? AND ?
    `, [start, end]);
    const weekCars = Number(weekCarsRows?.[0]?.CARS) || 0;
    const [weekDefRows] = await pool.query(`
      SELECT COUNT(*) AS DEFECTS
      FROM (
        SELECT VIN FROM at_biw_qm_defect_info WHERE DATE(CREATION_TIME) BETWEEN ? AND ? AND (OFFLINE OR OFFLINE1 OR OFFLINE2) AND POST_NAME IN (${postListStr})
        UNION ALL
        SELECT VIN FROM at_paint_qm_defect_info WHERE DATE(CREATION_TIME) BETWEEN ? AND ? AND (OFFLINE OR OFFLINE1 OR OFFLINE2) AND POST_NAME IN (${postListStr})
        UNION ALL
        SELECT VIN FROM at_qm_defect_info WHERE DATE(CREATION_TIME) BETWEEN ? AND ? AND (OFFLINE OR OFFLINE1 OR OFFLINE2) AND POST_NAME IN (${postListStr})
      ) t
    `, [start, end, start, end, start, end]);
    const weekDefects = Number(weekDefRows?.[0]?.DEFECTS) || 0;
    const weekDpu = weekCars > 0 ? (weekDefects / weekCars).toFixed(1) : '0.0';

    // Дневные значения
    const drrValues = [];
    const dpuValues = [];
    for (const day of days) {
      drrValues.push(await getMaxDrrForDay(day));
      dpuValues.push(await getDpu(day));
    }

    const weekNum = (() => {
      const target = new Date(start);
      const dayNr = (target.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      return 1 + Math.ceil((firstThursday - target) / 604800000);
    })();

    res.json({
      weekNumber: weekNum,
      weekStart: start,
      weekEnd: end,
      days,
      drr: drrValues,
      dpu: dpuValues,
      weekDrr,
      weekDpu,
    });
  } catch (err) {
    console.error('Ошибка daily-dashboard-week:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/daily-dashboard-top3', async (req, res) => {
  try {
    const { date } = req.query; // теперь только один параметр date

    const cp7Posts = [
      'CP7','CP7 Audit','CP7 Gate','CP7-gate','CP8 Touch Up','REPAIR','REPAIR_Final','EXT1','PIP2','PIP4','PIP9',
      'REPAIR VERIFICATION','Topcoat preparation'
    ];
    const cp8Posts = [
      'CP8','CP8 Gate','CP8-gate','360','ADAS','ADAS+RB','TEST TRACK','TRACK','WA','WT'
    ];
    const allCpPosts = [...cp7Posts, ...cp8Posts];
    const postListStr = allCpPosts.map(p => `'${p}'`).join(',');

    // Если дата не передана, берём вчера
    let queryDate = date;
    if (!queryDate) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      queryDate = d.toISOString().split('T')[0];
    }

    const [rows] = await pool.query(`
      SELECT CONCAT(wo.MODEL, ' - ', d.PART_NAME, ' - ', d.PROBLEM_TYPE) AS DEFECT, COUNT(*) AS CNT
      FROM (
        SELECT VIN, PART_NAME, PROBLEM_TYPE, CREATION_TIME, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS OFFLINE
        FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, PART_NAME, PROBLEM_TYPE, CREATION_TIME, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS OFFLINE
        FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, PART_NAME, PROBLEM_TYPE, CREATION_TIME, POST_NAME,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS OFFLINE
        FROM at_qm_defect_info
      ) d
      JOIN work_order wo ON wo.VIN = d.VIN
      WHERE d.POST_NAME IN (${postListStr}) AND d.OFFLINE = 1
        AND DATE(d.CREATION_TIME) = ?
      GROUP BY DEFECT
      ORDER BY CNT DESC
      LIMIT 3
    `, [queryDate]);

    res.json(rows.map(r => ({ defect: r.DEFECT, count: r.CNT })));
  } catch (err) {
    console.error('Ошибка daily-dashboard-top3:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/daily-dashboard-top5', async (req, res) => {
  try {
    const { date, grades } = req.query;

    const cp7Posts = [
      'CP7','CP7 Audit','CP7 Gate','CP7-gate','CP8 Touch Up','REPAIR','REPAIR_Final','EXT1','PIP2','PIP4','PIP9',
      'REPAIR VERIFICATION','Topcoat preparation'
    ];
    const cp8Posts = [
      'CP8','CP8 Gate','CP8-gate','360','ADAS','ADAS+RB','TEST TRACK','TRACK','WA','WT'
    ];
    const allCpPosts = [...cp7Posts, ...cp8Posts];
    const postListStr = allCpPosts.map(p => `'${p}'`).join(',');

    let queryDate = date;
    if (!queryDate) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      queryDate = d.toISOString().split('T')[0];
    }

    let where = `WHERE d.POST_NAME IN (${postListStr}) AND d.OFFLINE = 1 AND DATE(d.CREATION_TIME) = ?`;
    const params = [queryDate];

    if (grades) {
      const gradesList = grades.split(',').map(g => g.trim()).filter(Boolean);
      if (gradesList.length > 0) {
        where += ` AND d.PROBLEM_GRADE IN (${gradesList.map(() => '?').join(',')})`;
        params.push(...gradesList);
      }
    }

    const [rows] = await pool.query(`
      SELECT CONCAT(wo.MODEL, ' - ', d.PART_NAME, ' - ', d.PROBLEM_TYPE) AS DEFECT, COUNT(*) AS CNT
      FROM (
        SELECT VIN, PART_NAME, PROBLEM_TYPE, CREATION_TIME, POST_NAME, PROBLEM_GRADE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS OFFLINE
        FROM at_biw_qm_defect_info
        UNION ALL
        SELECT VIN, PART_NAME, PROBLEM_TYPE, CREATION_TIME, POST_NAME, PROBLEM_GRADE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS OFFLINE
        FROM at_paint_qm_defect_info
        UNION ALL
        SELECT VIN, PART_NAME, PROBLEM_TYPE, CREATION_TIME, POST_NAME, PROBLEM_GRADE,
               (OFFLINE OR OFFLINE1 OR OFFLINE2) AS OFFLINE
        FROM at_qm_defect_info
      ) d
      JOIN work_order wo ON wo.VIN = d.VIN
      ${where}
      GROUP BY DEFECT
      ORDER BY CNT DESC
      LIMIT 5
    `, params);

    res.json(rows.map(r => ({ defect: r.DEFECT, count: r.CNT })));
  } catch (err) {
    console.error('Ошибка daily-dashboard-top5:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== WARRANTY ==================

// Проверка пароля
app.post('/api/warranty/check-password', (req, res) => {
  const { password } = req.body;
  const correctPassword = '1234561';
  if (password === correctPassword) {
    res.json({ success: true });
  } else {
    res.status(403).json({ success: false, error: 'Неверный пароль' });
  }
});

// Загрузка Excel-данных
app.post('/api/warranty/upload', express.json({ limit: '100mb' }), async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !rows.length) return res.status(400).json({ error: 'Нет данных' });

    const normalizeKey = (str) => String(str).trim().toLowerCase().replace(/\s+/g, ' ');
    const getVal = (row, ...possibleNames) => {
      for (const name of possibleNames) {
        if (row[name] !== undefined) return row[name];
      }
      const rowNormalized = {};
      Object.keys(row).forEach(key => { rowNormalized[normalizeKey(key)] = row[key]; });
      for (const name of possibleNames) {
        const normName = normalizeKey(name);
        if (rowNormalized[normName] !== undefined) return rowNormalized[normName];
      }
      return undefined;
    };

    const parseDate = (val) => {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
      }
      if (typeof val === 'string') {
        let d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        const parts = val.split('.');
        if (parts.length === 3) {
          d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        return null;
      }
      return null;
    };

    const dayDiff = (d1, d2) => {
      if (!d1 || !d2) return 0;
      return Math.round((new Date(d1) - new Date(d2)) / 86400000);
    };

    // Формируем значения (без batch_number)
    const allValues = rows.map(row => {
      const vin_id = getVal(row, 'vin_id', 'VIN', 'vin', 'Vin ID') || '';
      const brand = getVal(row, 'brand', 'Brand', 'Марка') || '';
      const model = getVal(row, 'model', 'Model', 'Модель') || '';
      const production_date = parseDate(getVal(row, 'production_date', 'Production Date', 'Дата производства'));
      const sold_date = parseDate(getVal(row, 'sold date', 'sold_date', 'Sold Date', 'Дата продажи'));
      const claim_id = getVal(row, 'Claim ID', 'claim_id', 'ClaimID') || '';
      const document_number = getVal(row, 'Document Number', 'document_number', 'Doc Number') || '';
      const warranty_start_date = parseDate(getVal(row, 'warranty start date', 'warranty_start_date', 'Warranty Start'));
      const customer_complain_date = parseDate(getVal(row, 'Customer complain date', 'customer_complain_date', 'Complain Date'));
      const claims_qty = parseInt(getVal(row, 'Claims qty', 'claims_qty', 'Claims Qty')) || 0;
      const diagnostic_result = getVal(row, 'Diagnostic result', 'diagnostic_result', 'Diagnostic') || '';
      const main_part = getVal(row, 'Main part', 'main_part', 'Main Part') || '';
      const main_part_name = getVal(row, 'Main part name', 'main_part_name', 'Part Name') || '';
      const category = getVal(row, 'Категория', 'category', 'Category') || '';
      const totalPaid = parseFloat(getVal(row, 'Total amount paid to dealers RUR', 'total_amount_paid_dealers_rur', 'Стоимость', 'cost', 'Cost')) || 0;

      const qty_sell = vin_id ? 1 : 0;
      const delta = customer_complain_date && warranty_start_date ? dayDiff(customer_complain_date, warranty_start_date) : 0;
      const mis_0 = customer_complain_date && warranty_start_date ? (delta >= -60 && delta <= 7 ? 1 : 0) : 0;
      const mis_3 = customer_complain_date && warranty_start_date ? (delta >= -60 && delta <= 90 ? 1 : 0) : 0;
      const mis_0_count = mis_0 * claims_qty;
      const mis_3_count = mis_3 * claims_qty;
      const sold_cars_qty = vin_id ? 1 : 0;
      const unique_vin_by_qr = vin_id ? 1 : 0;

      return [
        vin_id, sold_cars_qty, unique_vin_by_qr, brand, model,
        production_date, sold_date, claim_id, document_number,
        warranty_start_date, customer_complain_date, claims_qty,
        diagnostic_result, main_part, main_part_name, mis_0, mis_3,
        qty_sell, delta, mis_0_count, mis_3_count, category, totalPaid
      ];
    });

    const sql = `
      INSERT INTO warranty_claims 
        (vin_id, sold_cars_qty, unique_vin_by_qr, brand, model, production_date, sold_date,
         claim_id, document_number, warranty_start_date, customer_complain_date, claims_qty,
         diagnostic_result, main_part, main_part_name, mis_0, mis_3, qty_sell, delta,
         mis_0_count, mis_3_count, category, total_amount_paid_dealers_rur)
      VALUES ?
    `;

    // Разбивка на батчи по 10000 строк
    const batchSize = 10000;
    let insertedCount = 0;

    for (let i = 0; i < allValues.length; i += batchSize) {
      const batch = allValues.slice(i, i + batchSize);
      await notesPool.query(sql, [batch]);
      insertedCount += batch.length;
    }

    res.json({ success: true, inserted: insertedCount });
  } catch (err) {
    console.error('Ошибка загрузки warranty:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Получение списка загрузок (по uploaded_at)
app.get('/api/warranty/upload-times', async (req, res) => {
  try {
    const [rows] = await notesPool.query(`
      SELECT DISTINCT DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i:%s') AS uploaded_at
      FROM warranty_claims
      WHERE uploaded_at IS NOT NULL
      ORDER BY uploaded_at DESC
    `);
    res.json(rows.map(r => r.uploaded_at));
  } catch (err) {
    console.error('Ошибка получения upload times:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Получение загруженных записей
app.get('/api/warranty/claims', async (req, res) => {
  try {
    const { uploadedAt } = req.query;
    let sql = 'SELECT * FROM warranty_claims';
    const params = [];
    if (uploadedAt) {
      sql += ' WHERE uploaded_at = ?';
      params.push(uploadedAt);
    }
    sql += ' ORDER BY id DESC LIMIT 1000';
    const [rows] = await notesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения warranty claims:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Аналитика Total (Prod Related)
app.get('/api/warranty/analytics', async (req, res) => {
  try {
    const { uploadedAt } = req.query;
    let sql = `
      SELECT 
        DATE_FORMAT(production_date, '%Y-%m') AS month,
        model,
        SUM(qty_sell) AS qty_sell,
        SUM(mis_0_count) AS mis_0,
        SUM(mis_3_count) AS mis_3
      FROM warranty_claims
      WHERE production_date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
        AND production_date IS NOT NULL
    `;
    const params = [];
    if (uploadedAt && uploadedAt !== '') {
      sql += ' AND DATE_FORMAT(uploaded_at, "%Y-%m-%d %H:%i:%s") = ?';
      params.push(uploadedAt);
    }
    sql += ' GROUP BY month, model ORDER BY month, model';
    const [rows] = await notesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка warranty аналитики:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Аналитика Model Based (Prod Related)
app.get('/api/warranty/analytics-by-model', async (req, res) => {
  try {
    const { uploadedAt } = req.query;
    let sql = `
      SELECT 
        DATE_FORMAT(production_date, '%Y-%m') AS month,
        model,
        SUM(qty_sell) AS qty_sell,
        SUM(mis_3_count) AS mis_3_count
      FROM warranty_claims
      WHERE production_date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
        AND production_date IS NOT NULL
    `;
    const params = [];
    if (uploadedAt && uploadedAt !== '') {
      sql += ' AND DATE_FORMAT(uploaded_at, "%Y-%m-%d %H:%i:%s") = ?';
      params.push(uploadedAt);
    }
    sql += ' GROUP BY month, model ORDER BY month, model';
    const [rows] = await notesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка аналитики по моделям:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Аналитика 0 MIS/3MIS by sales date
app.get('/api/warranty/analytics-by-sales-date', async (req, res) => {
  try {
    const { uploadedAt } = req.query;
    let sql = `
      SELECT 
        DATE_FORMAT(warranty_start_date, '%Y-%m') AS month,
        model,
        SUM(qty_sell) AS qty_sell,
        SUM(mis_0_count) AS mis_0_count,
        SUM(mis_3_count) AS mis_3_count
      FROM warranty_claims
      WHERE warranty_start_date IS NOT NULL
    `;
    const params = [];
    if (uploadedAt && uploadedAt !== '') {
      sql += ' AND DATE_FORMAT(uploaded_at, "%Y-%m-%d %H:%i:%s") = ?';
      params.push(uploadedAt);
    }
    sql += ' GROUP BY month, model ORDER BY month, model';
    const [rows] = await notesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка аналитики по sales date:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Топ категорий
app.get('/api/warranty/categories-summary', async (req, res) => {
  try {
    const { model, uploadedAt } = req.query;
    let sql = `
      SELECT model, category, SUM(claims_qty) AS total_claims
      FROM warranty_claims
      WHERE category IS NOT NULL AND category != ''
    `;
    const params = [];
    if (model && model !== 'ALL') {
      sql += ' AND model = ?';
      params.push(model);
    }
    if (uploadedAt && uploadedAt !== '') {
      sql += ' AND DATE_FORMAT(uploaded_at, "%Y-%m-%d %H:%i:%s") = ?';
      params.push(uploadedAt);
    }
    sql += ' GROUP BY model, category ORDER BY model, total_claims DESC';
    const [rows] = await notesPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения категорий:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Эндпоинт для TL Map
app.get('/api/tl-map', async (req, res) => {
  try {
    const sql = `
      SELECT 
        tlo.vin,
        tlo.node_nature AS vehicle_status,
        SUBSTRING_INDEX(ord.product, ' ', -1) AS model,
        IFNULL(LEFT(SUBSTRING_INDEX(mat.material_desc, '_', 1), 5), '???') AS spec,
        RIGHT(ord.plan_unit_code, 4) AS lot,
        SUBSTR(vh.material_no, 8, 2) AS color,
        vh.sequence_number AS seq,
        MAX(mv.gmt_create) AS entry_time
      FROM tm_vhc_test_line_online tlo
      INNER JOIN tm_vhc_vehicle vh ON tlo.vin = vh.vin
      LEFT JOIN tm_bas_material_relation mat ON mat.material_no = vh.material_no AND mat.is_deleted = 0
      INNER JOIN tm_ofm_order ord ON tlo.vin = ord.vin
      LEFT JOIN tm_vhc_test_line_movement mv ON mv.vin = tlo.vin AND mv.node_nature = tlo.node_nature AND mv.is_deleted = 0
      WHERE tlo.node_nature IN ('TLWA','TLRT','TLADAS','TLTT','CPA')
        AND vh.vehicle_status IN ('Key_Uloc_Type_CP72', 'Key_Uloc_Type_CP7')
      GROUP BY tlo.vin, tlo.node_nature, ord.product, mat.material_desc, ord.plan_unit_code, vh.material_no, vh.sequence_number
      ORDER BY tlo.node_nature, tlo.vin
    `;
    const [rows] = await mesPool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка TL Map:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 1. Количество уникальных машин, прошедших через посты за сегодня
app.get('/api/tl-map-passed-today', async (req, res) => {
  try {
    const sql = `
      SELECT 
        node_nature AS zone_name,
        COUNT(DISTINCT vin) AS passed_count
      FROM tm_vhc_test_line_movement
      WHERE node_nature IN ('TLWA','TLRT','TLADAS','TLTT','CPA')
        AND DATE(gmt_create) = CURDATE()
        AND is_deleted = 0
      GROUP BY node_nature
    `;
    const [rows] = await mesPool.query(sql);
    const result = {};
    rows.forEach(row => {
      result[row.zone_name] = row.passed_count;
    });
    res.json(result);
  } catch (err) {
    console.error('Ошибка TL Map passed today:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Список ВСЕХ записей прохождения через пост за сегодня (для таблицы)
app.get('/api/tl-map-passed-today-details', async (req, res) => {
  try {
    const { zone } = req.query;
    if (!zone) return res.status(400).json({ error: 'Не указана зона' });

    // Определяем следующий узел для выхода из зоны
    const nextZoneMap = {
      'TLWA': 'TLRT',
      'TLRT': 'TLADAS',
      'TLADAS': 'TLTT',
      'TLTT': 'CPFINAL',
    };
    const nextZone = nextZoneMap[zone] || null;

    // Получаем все записи входов в выбранную зону за сегодня
    const sql = `
      SELECT 
        tvtlm.vin,
        tvtlm.vhc_model AS model,
        tvtlm.material_no,
        tvtlm.sequence_number AS seq,
        tvtlm.gmt_create AS pass_time
      FROM tm_vhc_test_line_movement tvtlm
      WHERE tvtlm.node_nature = ?
        AND DATE(tvtlm.gmt_create) = CURDATE()
        AND tvtlm.is_deleted = 0
      ORDER BY tvtlm.vin, tvtlm.gmt_create ASC
    `;
    const [rows] = await mesPool.query(sql, [zone]);

    if (rows.length === 0 || !nextZone) {
      // Для зон без следующего (например, CPA) выход и длительность не считаем
      const result = rows.map(r => ({ ...r, exit_time: null, duration: null }));
      return res.json(result);
    }

    const vins = [...new Set(rows.map(r => r.vin))];
    const placeholders = vins.map(() => '?').join(',');

    let exitsByVin = {};

    if (nextZone === 'CPFINAL') {
      // Выход из TLTT ищем в ti_mes_movement (uloc_no = 'CPFINAL')
      const cpfinalSql = `
        SELECT vin, scan_time AS gmt_create
        FROM ti_mes_movement
        WHERE vin IN (${placeholders})
          AND uloc_no = 'CPFINAL'
          AND is_deleted = 0
        ORDER BY vin, scan_time ASC
      `;
      const [cpfinalRows] = await mesPool.query(cpfinalSql, vins);
      cpfinalRows.forEach(r => {
        if (!exitsByVin[r.vin]) exitsByVin[r.vin] = [];
        exitsByVin[r.vin].push(new Date(r.gmt_create));
      });
    } else {
      // Выход для TLWA, TLRT, TLADAS ищем в tm_vhc_test_line_movement
      const exitsAllSql = `
        SELECT vin, gmt_create
        FROM tm_vhc_test_line_movement
        WHERE vin IN (${placeholders})
          AND node_nature = ?
          AND is_deleted = 0
        ORDER BY vin, gmt_create ASC
      `;
      const [exitRows] = await mesPool.query(exitsAllSql, [...vins, nextZone]);
      exitRows.forEach(e => {
        if (!exitsByVin[e.vin]) exitsByVin[e.vin] = [];
        exitsByVin[e.vin].push(new Date(e.gmt_create));
      });
    }

    // Для каждой записи входа находим первый выход после входа
    const enriched = rows.map(r => {
      const vinExits = exitsByVin[r.vin] || [];
      const passDate = new Date(r.pass_time);
      let exitTime = null;
      for (const exit of vinExits) {
        if (exit > passDate) {
          exitTime = exit;
          break;
        }
      }
      let duration = null;
      if (exitTime) {
        const diffSec = Math.floor((exitTime - passDate) / 1000);
        if (diffSec >= 0) duration = diffSec;
      }
      return {
        ...r,
        exit_time: exitTime ? exitTime.toISOString() : null,
        duration,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Ошибка TL Map passed today details:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tl-map-analytics', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    // ---------- 1. VIN, прошедшие CP72 за период ----------
    let cp72Condition = '';
    const cp72Params = [];
    if (startTime) {
      cp72Condition += ' AND cp72.scan_time >= ?';
      cp72Params.push(startTime);
    }
    if (endTime) {
      cp72Condition += ' AND cp72.scan_time <= ?';
      cp72Params.push(endTime);
    }

    const cp72Sql = `
      SELECT DISTINCT vin
      FROM ti_mes_movement AS cp72
      WHERE uloc_no = 'CP72'
        AND is_deleted = 0
        ${cp72Condition}
    `;
    const [cp72Rows] = await mesPool.query(cp72Sql, cp72Params);
    const vins = cp72Rows.map(r => r.vin);
    if (vins.length === 0) return res.json([]);

    const placeholders = vins.map(() => '?').join(',');

    // ---------- 2. Получаем времена CP72 и CPFINAL ----------
    const cp72TimesSql = `
      SELECT vin, MIN(scan_time) AS cp72_time
      FROM ti_mes_movement
      WHERE vin IN (${placeholders})
        AND uloc_no = 'CP72'
        AND is_deleted = 0
      GROUP BY vin
    `;
    const [cp72TimesRows] = await mesPool.query(cp72TimesSql, vins);
    const cp72TimeMap = {};
    cp72TimesRows.forEach(r => { cp72TimeMap[r.vin] = r.cp72_time; });

    const cpfinalTimesSql = `
      SELECT vin, MIN(scan_time) AS cpfinal_time
      FROM ti_mes_movement
      WHERE vin IN (${placeholders})
        AND uloc_no = 'CPFINAL'
        AND is_deleted = 0
      GROUP BY vin
    `;
    const [cpfinalTimesRows] = await mesPool.query(cpfinalTimesSql, vins);
    const cpfinalTimeMap = {};
    cpfinalTimesRows.forEach(r => { cpfinalTimeMap[r.vin] = r.cpfinal_time; });

    // ---------- 3. Все движения TL/REP/CPA из tm_vhc_test_line_movement ----------
    const movementSql = `
      SELECT vin, node_nature, gmt_create
      FROM tm_vhc_test_line_movement
      WHERE vin IN (${placeholders})
        AND is_deleted = 0
      ORDER BY vin, gmt_create ASC
    `;
    const [movementRows] = await mesPool.query(movementSql, vins);

    const movementsByVin = {};
    vins.forEach(vin => { movementsByVin[vin] = []; });
    movementRows.forEach(row => {
      if (movementsByVin[row.vin]) {
        movementsByVin[row.vin].push({ zone: row.node_nature, time: new Date(row.gmt_create) });
      }
    });

    // ---------- 4. Все MES-точки (CP5..CP8, CP72, CPFINAL) ----------
    const mesAllSql = `
      SELECT vin, uloc_no, scan_time
      FROM ti_mes_movement
      WHERE vin IN (${placeholders})
        AND is_deleted = 0
      ORDER BY vin, scan_time ASC
    `;
    const [mesAllRows] = await mesPool.query(mesAllSql, vins);
    const mesPointsByVin = {};
    vins.forEach(vin => { mesPointsByVin[vin] = []; });
    mesAllRows.forEach(r => {
      if (mesPointsByVin[r.vin]) {
        mesPointsByVin[r.vin].push({
          zone: r.uloc_no === 'AGMBS01002' ? 'CP5' :
                r.uloc_no === 'AGMPS01002' ? 'CP6' :
                r.uloc_no === 'AGMAS01001' ? 'TRIMIN' :
                r.uloc_no === 'AGMAS01003' ? 'CP7' :
                r.uloc_no === 'CP72' ? 'CP72' :
                r.uloc_no === 'CPFINAL' ? 'CPFINAL' :
                r.uloc_no === 'AGMAS01004' ? 'CP8' : r.uloc_no,
          time: new Date(r.scan_time)
        });
      }
    });

    // ---------- 5. Складские точки (Inbound/Outbound) ----------
    const [lesRows] = await lesPool.query(
      `SELECT tbs.vin, tbs.in_storage_time, tbs.out_storage_time
       FROM tv_biz_storage_car tbs
       WHERE tbs.vin IN (${placeholders})`,
      vins
    );
    const lesMap = new Map(lesRows.map(r => [r.vin, r]));

    // ---------- 6. Обработка каждого VIN ----------
    const result = [];

    for (const vin of vins) {
      const moves = movementsByVin[vin] || [];
      const mesPoints = mesPointsByVin[vin] || [];
      const les = lesMap.get(vin);

      const cp72Time = cp72TimeMap[vin] ? new Date(cp72TimeMap[vin]) : null;
      const cpfinalTime = cpfinalTimeMap[vin] ? new Date(cpfinalTimeMap[vin]) : null;

      // --- Все точки после CP72 ---
      const allPointsAfterCp72 = [];
      if (cp72Time) {
        mesPoints.forEach(p => {
          if (p.time > cp72Time) allPointsAfterCp72.push(p);
        });
        moves.forEach(m => {
          if (m.time > cp72Time) allPointsAfterCp72.push(m);
        });
        if (les) {
          if (les.in_storage_time && new Date(les.in_storage_time) > cp72Time) {
            allPointsAfterCp72.push({ zone: 'Inbound', time: new Date(les.in_storage_time) });
          }
          if (les.out_storage_time && new Date(les.out_storage_time) > cp72Time) {
            allPointsAfterCp72.push({ zone: 'Outbound', time: new Date(les.out_storage_time) });
          }
        }
      }

      // --- Суммарное время на TL: CPFINAL - CP72, либо последняя точка после CP72 ---
      let totalSec = 0;
      if (cp72Time && cpfinalTime) {
        totalSec = Math.floor((cpfinalTime - cp72Time) / 1000);
        if (totalSec < 0) totalSec = 0;
      } else if (cp72Time && allPointsAfterCp72.length > 0) {
        const lastTime = allPointsAfterCp72.reduce((max, p) => p.time > max ? p.time : max, allPointsAfterCp72[0].time);
        totalSec = Math.floor((lastTime - cp72Time) / 1000);
        if (totalSec < 0) totalSec = 0;
      }

      // --- Ремзоны: суммируем все завершённые сессии + текущая, если есть ---
      let totalRemSeconds = 0;
      let inRem = false;
      let currentRemStart = null;
      let lastRemStart = null;
      let lastRemExit = null;

      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        if (m.zone.startsWith('REP')) {
          if (!inRem) {
            inRem = true;
            currentRemStart = m.time;
            lastRemStart = m.time;
            lastRemExit = null;
          }
        } else {
          if (inRem) {
            const exitTime = m.time;
            const diffMs = exitTime - currentRemStart;
            if (diffMs > 0) {
              totalRemSeconds += Math.floor(diffMs / 1000);
              lastRemExit = exitTime;
            }
            inRem = false;
            currentRemStart = null;
          }
        }
      }

      // Если последняя сессия не завершена (сейчас в ремзоне), добавляем время до текущего момента
      const stillInRem = inRem;
      if (stillInRem && currentRemStart) {
        const now = new Date();
        const diffMs = now - currentRemStart;
        if (diffMs > 0) {
          totalRemSeconds += Math.floor(diffMs / 1000);
        }
      }

      // --- Текущее расположение: самая поздняя точка среди всех источников ---
      const allPointsForLocation = [
        ...mesPoints,
        ...moves,
      ];
      if (les) {
        if (les.in_storage_time) allPointsForLocation.push({ zone: 'Inbound', time: new Date(les.in_storage_time) });
        if (les.out_storage_time) allPointsForLocation.push({ zone: 'Outbound', time: new Date(les.out_storage_time) });
      }

      let currentZone = 'Планирование';
      let maxTime = null;
      allPointsForLocation.forEach(p => {
        if (!maxTime || p.time > maxTime) {
          maxTime = p.time;
          currentZone = p.zone;
        }
      });

      result.push({
        vin,
        current_zone: currentZone,
        total_stay_seconds: totalSec,
        rem_in: lastRemStart ? lastRemStart.toISOString() : null,
        rem_out: stillInRem ? null : (lastRemExit ? lastRemExit.toISOString() : null),
        rem_duration_seconds: totalRemSeconds > 0 ? totalRemSeconds : null,
        in_rem: stillInRem,
      });
    }

    // Сортировка по убыванию суммарного времени
    result.sort((a, b) => b.total_stay_seconds - a.total_stay_seconds);

    // Кумулятивный процент
    const totalAllSeconds = result.reduce((sum, r) => sum + r.total_stay_seconds, 0);
    let cumSum = 0;
    const enriched = result.map(r => {
      cumSum += r.total_stay_seconds;
      r.cum_percent = totalAllSeconds > 0 ? +((cumSum / totalAllSeconds) * 100).toFixed(2) : 0;
      return r;
    });

    res.json(enriched);
  } catch (err) {
    console.error('Ошибка TL Map Analytics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tl-map-vin-history', async (req, res) => {
  try {
    const { vin } = req.query;
    if (!vin) return res.status(400).json({ error: 'VIN не указан' });

    // 1. TL и REP зоны из tm_vhc_test_line_movement
    const [tlRows] = await mesPool.query(
      `SELECT 
         vin,
         node_nature AS zone,
         gmt_create AS event_time
       FROM tm_vhc_test_line_movement
       WHERE vin = ? AND is_deleted = 0
       ORDER BY gmt_create ASC`,
      [vin]
    );

    // 2. MES чекпоинты из ti_mes_movement
    const [mesRows] = await mesPool.query(
      `SELECT 
         vin,
         CASE 
           WHEN uloc_no = 'AGMBS01002' THEN 'CP5'
           WHEN uloc_no = 'AGMPS01002' THEN 'CP6'
           WHEN uloc_no = 'AGMAS01001' THEN 'TRIMIN'
           WHEN uloc_no = 'AGMAS01003' THEN 'CP7'
           WHEN uloc_no = 'CP72' THEN 'CP72'
           WHEN uloc_no = 'CPFINAL' THEN 'CPFINAL'
           WHEN uloc_no = 'AGMAS01004' THEN 'CP8'
           ELSE uloc_no
         END AS zone,
         scan_time AS event_time
       FROM ti_mes_movement
       WHERE vin = ? AND is_deleted = 0
       ORDER BY scan_time ASC`,
      [vin]
    );

    // 3. Складские события Inbound/Outbound из tv_biz_storage_car
    const [lesRows] = await lesPool.query(
      `SELECT 
         vin,
         'Inbound' AS zone,
         in_storage_time AS event_time
       FROM tv_biz_storage_car
       WHERE vin = ? AND in_storage_time IS NOT NULL
       UNION ALL
       SELECT 
         vin,
         'Outbound' AS zone,
         out_storage_time AS event_time
       FROM tv_biz_storage_car
       WHERE vin = ? AND out_storage_time IS NOT NULL`,
      [vin, vin]
    );

    // Формируем единый массив с указанием источника
    const history = [
      ...tlRows.map(r => ({
        vin: r.vin,
        zone: r.zone,
        event_time: r.event_time,
        source: 'TL Movement'
      })),
      ...mesRows.map(r => ({
        vin: r.vin,
        zone: r.zone,
        event_time: r.event_time,
        source: 'MES Movement'
      })),
      ...lesRows.map(r => ({
        vin: r.vin,
        zone: r.zone,
        event_time: r.event_time,
        source: 'LES Storage'
      }))
    ];

    // Сортируем по времени
    history.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));

    res.json(history);
  } catch (err) {
    console.error('Ошибка TL Map VIN history:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/holds-sgp', async (req, res) => {
  try {
    const sql = `
      SELECT 
        qid.model AS model,
        qid.issue_desc AS issue_desc,
        COUNT(DISTINCT qid.vin) AS quantity,
        MIN(qid.gmt_create) AS hold_date,
        DATEDIFF(CURDATE(), MIN(qid.gmt_create)) AS days_waiting,
        COALESCE(qid.clear_man, qid.create_man) AS responsible,
        '' AS actions,
        DATE_ADD(MIN(qid.gmt_create), INTERVAL 7 DAY) AS planned_date,
        'В процессе' AS status,
        '' AS comment
      FROM higoplat_fusion_les.tv_quality_issue_detail qid
      WHERE qid.is_deleted = 0
        AND qid.status = 0
        AND qid.clear_time IS NULL
      GROUP BY 
        qid.model,
        qid.issue_desc,
        COALESCE(qid.clear_man, qid.create_man)
      ORDER BY 
        qid.model,
        MIN(qid.gmt_create) DESC
    `;
    
    const [rows] = await lesPool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка Holds SGP:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/holds-sgp-retrospective', async (req, res) => {
  try {
    const { models } = req.query;
    
    // Генерируем последние 14 дней (включая сегодня)
    const dates = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Конец текущего дня
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(23, 59, 59, 999); // Конец дня
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push({
        dateStr: `${year}-${month}-${day}`,
        endOfDay: d
      });
    }
    
    // Получаем все записи, которые были созданы до конца последнего дня (14 дней назад)
    let sql = `
      SELECT 
        qid.model AS model,
        qid.issue_desc AS issue_desc,
        qid.vin,
        qid.gmt_create,
        qid.clear_time
      FROM higoplat_fusion_les.tv_quality_issue_detail qid
      WHERE qid.is_deleted = 0
        AND qid.gmt_create <= ?
    `;
    
    const params = [dates[dates.length - 1].endOfDay];
    
    if (models && models !== '') {
      const modelList = models.split(',').map(m => m.trim()).filter(Boolean);
      if (modelList.length > 0) {
        sql += ` AND qid.model IN (${modelList.map(() => '?').join(',')})`;
        params.push(...modelList);
      }
    }
    
    sql += ` ORDER BY qid.model, qid.issue_desc, qid.gmt_create`;
    
    const [rows] = await lesPool.query(sql, params);
    
    // Группируем по model + issue_desc
    const groupedMap = {};
    rows.forEach(row => {
      const key = `${row.model}_|_${row.issue_desc}`;
      if (!groupedMap[key]) {
        groupedMap[key] = {
          model: row.model,
          issue_desc: row.issue_desc,
          vins: [],
        };
      }
      groupedMap[key].vins.push({
        vin: row.vin,
        gmt_create: row.gmt_create ? new Date(row.gmt_create) : null,
        clear_time: row.clear_time ? new Date(row.clear_time) : null,
      });
    });
    
    // Для каждой группы считаем количество активных VIN на конец каждого дня
    const result = [];
    Object.values(groupedMap).forEach(group => {
      const rowResult = {
        model: group.model,
        issue_desc: group.issue_desc,
      };
      
      dates.forEach(({ dateStr, endOfDay }) => {
        // Считаем VIN, которые активны на конец этого дня
        const activeVins = new Set();
        
        group.vins.forEach(v => {
          if (!v.gmt_create) return;
          
          // VIN создан до или в этот день
          const created = v.gmt_create <= endOfDay;
          
          // VIN не закрыт или закрыт после конца этого дня
          const notCleared = !v.clear_time || v.clear_time > endOfDay;
          
          if (created && notCleared) {
            activeVins.add(v.vin);
          }
        });
        
        const activeCount = activeVins.size;
        
        if (activeCount > 0) {
          rowResult[dateStr] = activeCount;
        }
      });
      
      // Добавляем только если есть хоть одно значение
      if (dates.some(({ dateStr }) => rowResult[dateStr] && rowResult[dateStr] > 0)) {
        result.push(rowResult);
      }
    });
    
    // Сортируем: по последнему дню от большего к меньшему, затем по модели
    const lastDate = dates[dates.length - 1].dateStr;
    result.sort((a, b) => {
      const aLast = a[lastDate] || 0;
      const bLast = b[lastDate] || 0;
      if (bLast !== aLast) return bLast - aLast;
      return a.model.localeCompare(b.model);
    });
    
    res.json(result);
  } catch (err) {
    console.error('Ошибка Holds SGP retrospective:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Получение VIN для конкретного холда на конкретную дату
app.get('/api/holds-sgp-retrospective-vins', async (req, res) => {
  try {
    const { model, issue_desc, date } = req.query;
    if (!model || !issue_desc || !date) {
      return res.status(400).json({ error: 'model, issue_desc, date обязательны' });
    }
    
    // Конец указанного дня
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const sql = `
      SELECT DISTINCT qid.vin
      FROM higoplat_fusion_les.tv_quality_issue_detail qid
      WHERE qid.is_deleted = 0
        AND qid.model = ?
        AND qid.issue_desc = ?
        AND qid.gmt_create <= ?
        AND (qid.clear_time > ? OR qid.clear_time IS NULL)
      ORDER BY qid.vin
    `;
    
    const [rows] = await lesPool.query(sql, [model, issue_desc, endOfDay, endOfDay]);
    res.json(rows.map(r => r.vin));
  } catch (err) {
    console.error('Ошибка получения VIN для ретроспективы:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Справочник дефектов по цехам
app.get('/api/part-defect-shop-mapping', async (req, res) => {
  try {
    const [rows] = await notesPool.query('SELECT * FROM part_defect_shop_mapping ORDER BY part_name, defect_type');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения справочника:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Обновление справочника
app.post('/api/part-defect-shop-mapping', async (req, res) => {
  try {
    const { mappings } = req.body;
    if (!mappings || !mappings.length) return res.status(400).json({ error: 'Нет данных' });
    
    const sql = 'INSERT INTO part_defect_shop_mapping (part_name, defect_type, shop) VALUES ? ON DUPLICATE KEY UPDATE shop = VALUES(shop)';
    const values = mappings.map(m => [m.part_name, m.defect_type, m.shop]);
    
    await notesPool.query(sql, [values]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка обновления справочника:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DRR по цехам
// ================== DRR ПО ЦЕХАМ ==================
app.get('/api/drr-by-shop', async (req, res) => {
  try {
    const { weeks = 10 } = req.query;
    
    // Получаем справочник
    const [mappingRows] = await notesPool.query('SELECT * FROM part_defect_shop_mapping');
    
    if (!mappingRows.length) {
      return res.json({ weeks: [], AS: [], BS: [], PS: [], hasMapping: false });
    }
    
    // Группируем по цехам
    const shopMapping = { AS: [], BS: [], PS: [] };
    mappingRows.forEach(m => {
      if (shopMapping[m.shop]) {
        shopMapping[m.shop].push({ part_name: m.part_name, defect_type: m.defect_type });
      }
    });
    
    // Генерируем последние N недель
    const today = new Date();
    const currentMonday = new Date(today);
    const dayOfWeek = today.getDay();
    currentMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const result = { weeks: [], AS: [], BS: [], PS: [], hasMapping: true };
    
    for (let i = 0; i < weeks; i++) {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() - i * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const weekStart = monday.toISOString().split('T')[0];
      const weekEnd = sunday.toISOString().split('T')[0];
      const weekNum = getISOWeek(monday);
      
      result.weeks.unshift(`CW${weekNum}`);
      
      for (const shop of ['AS', 'BS', 'PS']) {
        const parts = shopMapping[shop];
        
        if (!parts.length) {
          result[shop].unshift(0);
          continue;
        }
        
        // Общее количество VIN за неделю
        const [carsRows] = await pool.query(`
          SELECT COUNT(DISTINCT VIN) AS TOTAL
          FROM at_om_wiptrackinghistory
          WHERE DATE(CREATION_TIME) BETWEEN ? AND ?
        `, [weekStart, weekEnd]);
        const totalCars = carsRows[0]?.TOTAL || 0;
        
        // Строим условия для каждого part+defect
        const conditions = [];
        const params = [];
        
        parts.forEach(p => {
          conditions.push('(PART_NAME = ? AND PROBLEM_TYPE = ?)');
          params.push(p.part_name, p.defect_type);
        });
        
        const whereClause = conditions.join(' OR ');
        
        // VIN с оффлайн дефектами
        const [defectRows] = await pool.query(`
          SELECT COUNT(DISTINCT VIN) AS DEFECT_VINS
          FROM (
            SELECT VIN, PART_NAME, PROBLEM_TYPE, DATE(CREATION_TIME) AS CREATION_DATE,
                   (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
            FROM at_biw_qm_defect_info
            WHERE DATE(CREATION_TIME) BETWEEN ? AND ?
            UNION ALL
            SELECT VIN, PART_NAME, PROBLEM_TYPE, DATE(CREATION_TIME) AS CREATION_DATE,
                   (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
            FROM at_paint_qm_defect_info
            WHERE DATE(CREATION_TIME) BETWEEN ? AND ?
            UNION ALL
            SELECT VIN, PART_NAME, PROBLEM_TYPE, DATE(CREATION_TIME) AS CREATION_DATE,
                   (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
            FROM at_qm_defect_info
            WHERE DATE(CREATION_TIME) BETWEEN ? AND ?
          ) QM_DEF
          WHERE QM_DEF.S_OFFLINE = 1
            AND (${whereClause})
        `, [weekStart, weekEnd, weekStart, weekEnd, weekStart, weekEnd, ...params]);
        
        const defectVins = defectRows[0]?.DEFECT_VINS || 0;
        
        let drr = 0;
        if (totalCars > 0) {
          drr = (1 - (defectVins / totalCars)) * 100;
        }
        
        result[shop].unshift(parseFloat(drr.toFixed(2)));
      }
    }
    
    res.json(result);
  } catch (err) {
    console.error('Ошибка DRR по цехам:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== ТОП ДЕФЕКТОВ ПО ЦЕХУ ==================
app.get('/api/shop-top-defects', async (req, res) => {
  try {
    const { shop, model } = req.query;
    if (!shop) return res.status(400).json({ error: 'shop обязателен' });
    
    // Получаем справочник для цеха
    const [mappingRows] = await notesPool.query(
      'SELECT part_name, defect_type FROM part_defect_shop_mapping WHERE shop = ?',
      [shop]
    );
    
    if (!mappingRows.length) {
      return res.json({ weeks: [], data: [], hasMapping: false });
    }
    
    // Генерируем последние 5 недель
    const today = new Date();
    const currentMonday = new Date(today);
    const dayOfWeek = today.getDay();
    currentMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const weeks = [];
    for (let i = 4; i >= 0; i--) {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() - i * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      weeks.push({
        weekNum: getISOWeek(monday),
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      });
    }
    
    // Строим условия
    const conditions = [];
    const mappingParams = [];
    mappingRows.forEach(m => {
      conditions.push('(PART_NAME = ? AND PROBLEM_TYPE = ?)');
      mappingParams.push(m.part_name, m.defect_type);
    });
    const whereClause = conditions.join(' OR ');
    
    const allResults = {};
    
    for (const week of weeks) {
      const params = [
        week.start, week.end,
        week.start, week.end,
        week.start, week.end,
        ...mappingParams,
      ];
      
      let modelCondition = '';
      if (model && model !== 'ALL') {
        modelCondition = ' AND wo.MODEL = ?';
        params.push(model);
      }
      
      const sql = `
        SELECT 
          CONCAT(QM_DEF.PART_NAME, '_', QM_DEF.PROBLEM_TYPE) AS defect_name,
          COUNT(DISTINCT QM_DEF.VIN) AS defect_count
        FROM (
          SELECT VIN, PART_NAME, PROBLEM_TYPE, DATE(CREATION_TIME) AS CREATION_DATE,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_biw_qm_defect_info
          WHERE DATE(CREATION_TIME) BETWEEN ? AND ?
          UNION ALL
          SELECT VIN, PART_NAME, PROBLEM_TYPE, DATE(CREATION_TIME) AS CREATION_DATE,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_paint_qm_defect_info
          WHERE DATE(CREATION_TIME) BETWEEN ? AND ?
          UNION ALL
          SELECT VIN, PART_NAME, PROBLEM_TYPE, DATE(CREATION_TIME) AS CREATION_DATE,
                 (OFFLINE OR OFFLINE1 OR OFFLINE2) AS S_OFFLINE
          FROM at_qm_defect_info
          WHERE DATE(CREATION_TIME) BETWEEN ? AND ?
        ) QM_DEF
        JOIN work_order wo ON wo.VIN = QM_DEF.VIN
        WHERE QM_DEF.S_OFFLINE = 1
          AND (${whereClause})
          ${modelCondition}
        GROUP BY defect_name
        ORDER BY defect_count DESC
      `;
      
      const [rows] = await pool.query(sql, params);
      
      rows.forEach(row => {
        if (!allResults[row.defect_name]) {
          allResults[row.defect_name] = {};
        }
        allResults[row.defect_name][`CW${week.weekNum}`] = row.defect_count;
      });
    }
    
    const data = Object.entries(allResults).map(([name, counts]) => ({
      name,
      ...counts,
    }));
    
    // Сортируем по последней неделе
    const lastWeekKey = `CW${weeks[weeks.length - 1].weekNum}`;
    data.sort((a, b) => (b[lastWeekKey] || 0) - (a[lastWeekKey] || 0));
    
    res.json({ 
      weeks: weeks.map(w => `CW${w.weekNum}`), 
      data,
      hasMapping: true,
    });
  } catch (err) {
    console.error('Ошибка shop-top-defects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SGP Management - данные по всем моделям
app.get('/api/sgp-management', async (req, res) => {
  try {
    const sql = `
      SELECT
        s.vin,
        s.vehicle_type AS model,
        IF(s.block_msg IS NOT NULL AND s.block_msg <> '', 'Блок', 'Не блок') AS block_status,
        q.issue_desc AS reason,
        q.gmt_create AS hold_date,
        CASE 
            WHEN q.status = 1 THEN 'Устранено'
            WHEN q.status = 0 THEN 'Не устранено'
            ELSE '—'
        END AS resolution_status,
        CASE
            WHEN s.in_storage_status = 'Key_Car_In_Storage_Status_3' THEN 'Outbound'
            WHEN s.in_storage_status = 'Key_Car_In_Storage_Status_1' THEN 'In stock'
            WHEN s.in_storage_status = 'Key_Car_In_Storage_Status_2' THEN 'In stock'
            ELSE 'Unknown'
        END AS storage_status,
        CONCAT_WS('-', COALESCE(s.ck_no, ''), COALESCE(s.kq_no, ''), COALESCE(s.kw_no, '')) AS location
      FROM tv_biz_storage_car s
      LEFT JOIN tv_quality_issue_detail q ON q.vin = s.vin
        AND q.is_deleted = 0
      ORDER BY s.vehicle_type, s.vin, q.gmt_create DESC
    `;
    
    const [rows] = await lesPool.query(sql);
    
    // Собираем уникальные VIN
    const vins = [...new Set(rows.map(r => r.vin).filter(Boolean))];
    
    // Получаем комплектацию из MES
    let complectMap = {};
    if (vins.length > 0) {
      const placeholders = vins.map(() => '?').join(',');
      const [complectRows] = await mesPool.query(`
        SELECT too.vin, tbmr.material_desc AS complectation
        FROM tm_ofm_order too
        LEFT JOIN tm_vhc_vehicle tvv ON too.vin = tvv.vin
        LEFT JOIN tm_bas_material_relation tbmr ON tbmr.material_no = too.material_no AND tbmr.is_deleted = 0
        WHERE too.vin IN (${placeholders})
      `, vins);
      complectRows.forEach(r => { complectMap[r.vin] = r.complectation || ''; });
    }
    
    const result = rows.map(row => ({
      vin: row.vin,
      model: row.model,
      complectation: complectMap[row.vin] || '—',
      block_status: row.block_status,
      reason: row.reason || '',
      hold_date: row.hold_date || null,
      resolution_status: row.resolution_status || '—',
      storage_status: row.storage_status,
      location: row.location || '—',
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Ошибка SGP Management:', err.message);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/sgp-management-reasons', async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT 
        SUBSTRING_INDEX(issue_desc, ' - ', 1) AS reason
      FROM tv_quality_issue_detail
      WHERE issue_desc IS NOT NULL AND issue_desc != ''
        AND is_deleted = 0
      ORDER BY reason
    `;
    const [rows] = await lesPool.query(sql);
    res.json(rows.map(r => r.reason).filter(Boolean));
  } catch (err) {
    console.error('Ошибка получения причин:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== TIME POINTS (ВРЕМЯ ПРОХОЖДЕНИЯ ТОЧЕК) ==================

app.get('/api/time-points', async (req, res) => {
  try {
    const {
      vin, materialCode, seqFrom, seqTo, batchNum, partNo,
      kdMaterialNo, model, materialDesc, colour,
      cp5From, cp5To, cp6From, cp6To, trimInFrom, trimInTo,
      cp7From, cp7To, cp72From, cp72To, cpFinalFrom, cpFinalTo, cp8From, cp8To,
      tlwaFrom, tlwaTo, tlrtFrom, tlrtTo, tladasFrom, tladasTo, tlttFrom, tlttTo,
      inboundFrom, inboundTo, outboundFrom, outboundTo,
      currentLocations, excludeLocations,
    } = req.query;

    const kdArray = kdMaterialNo ? kdMaterialNo.split(',').map(s => s.trim()).filter(Boolean) : [];
    const modelArray = model ? model.split(',').map(s => s.trim()).filter(Boolean) : [];
    const complectArray = materialDesc ? materialDesc.split(',').map(s => s.trim()).filter(Boolean) : [];

    const hasLesFilters = inboundFrom || inboundTo || outboundFrom || outboundTo;
    const hasIotFilters = batchNum;

    // --- MES запрос (CP5, CP6, TRIMIN, CP7, CP72, CPFINAL, CP8) ---
    let mesQuery = `
      WITH times AS (
        SELECT
          vin,
          MAX(IF(uloc_no = 'AGMBS01002', scan_time, NULL)) AS CP5,
          MAX(IF(uloc_no = 'AGMPS01002', scan_time, NULL)) AS CP6,
          MAX(IF(uloc_no = 'AGMAS01001', scan_time, NULL)) AS TRIMIN,
          MAX(IF(uloc_no = 'AGMAS01003', scan_time, NULL)) AS CP7,
          MAX(IF(uloc_no = 'CP72', scan_time, NULL)) AS CP72,
          MAX(IF(uloc_no = 'CPFINAL', scan_time, NULL)) AS CPFINAL,
          MAX(IF(uloc_no = 'AGMAS01004', scan_time, NULL)) AS CP8
        FROM ti_mes_movement
        WHERE uloc_no IN ('AGMBS01002','AGMPS01002','AGMAS01001','AGMAS01003','CP72','CPFINAL','AGMAS01004')
          AND is_deleted = 0
        GROUP BY vin
      )
      SELECT
        too.vin,
        too.material_no AS material_code,
        tvv.sequence_number,
        uvkmm.kd_material_no,
        too.product AS model,
        tbmr.material_desc,
        tbmr.ps_material_desc AS colour,
        t.CP5, t.CP6, t.TRIMIN, t.CP7, t.CP72, t.CPFINAL, t.CP8
      FROM tm_ofm_order too 
        LEFT JOIN tm_vhc_vehicle tvv ON too.vin = tvv.vin 
        LEFT JOIN (SELECT DISTINCT material_no, kd_material_no, material_desc, vehicle_type, ps_material_desc FROM tm_bas_material_relation WHERE is_deleted = 0) tbmr ON tbmr.material_no = too.material_no 
        LEFT JOIN (SELECT DISTINCT material_no, kd_material_no FROM udt_vsp_kd_material_mapping WHERE is_deleted = 0) uvkmm ON CONCAT(LEFT(tbmr.material_no, 7), '**', RIGHT(tbmr.material_no, 6)) = uvkmm.material_no AND uvkmm.kd_material_no = tbmr.kd_material_no
        LEFT JOIN times t ON t.vin = too.vin
      WHERE too.is_deleted = 0
    `;
    const mesParams = [];

    if (vin) {
      mesQuery += ' AND too.vin LIKE ?';
      mesParams.push(`%${vin}%`);
    }
    if (materialCode) {
      mesQuery += ' AND too.material_no LIKE ?';
      mesParams.push(`%${materialCode}%`);
    }
    if (colour) {
      mesQuery += ' AND tbmr.ps_material_desc = ?';
      mesParams.push(colour);
    }
    if (seqFrom && seqTo) {
      mesQuery += ' AND CAST(tvv.sequence_number AS UNSIGNED) BETWEEN ? AND ?';
      mesParams.push(seqFrom, seqTo);
    } else if (seqFrom) {
      mesQuery += ' AND CAST(tvv.sequence_number AS UNSIGNED) >= ?';
      mesParams.push(seqFrom);
    } else if (seqTo) {
      mesQuery += ' AND CAST(tvv.sequence_number AS UNSIGNED) <= ?';
      mesParams.push(seqTo);
    }
    if (partNo) {
      mesQuery += ` AND EXISTS (
        SELECT 1 FROM r_mat_scanning_records rmsr 
          JOIN r_mat_scanning_detail rmsd ON rmsr.id = rmsd.r_mat_scanning_records_id
        WHERE rmsr.vin = too.vin
          AND rmsd.is_deleted = 0
          AND rmsd.material_code = ?
      )`;
      mesParams.push(partNo);
    }
    if (kdArray.length > 0) {
      mesQuery += ` AND uvkmm.kd_material_no IN (${kdArray.map(() => '?').join(',')})`;
      mesParams.push(...kdArray);
    }
    if (modelArray.length > 0) {
      mesQuery += ` AND too.product IN (${modelArray.map(() => '?').join(',')})`;
      mesParams.push(...modelArray);
    }
    if (complectArray.length > 0) {
      mesQuery += ` AND tbmr.material_desc IN (${complectArray.map(() => '?').join(',')})`;
      mesParams.push(...complectArray);
    }
    if (cp5From) { mesQuery += ' AND t.CP5 >= ?'; mesParams.push(cp5From); }
    if (cp5To) { mesQuery += ' AND t.CP5 <= ?'; mesParams.push(cp5To); }
    if (cp6From) { mesQuery += ' AND t.CP6 >= ?'; mesParams.push(cp6From); }
    if (cp6To) { mesQuery += ' AND t.CP6 <= ?'; mesParams.push(cp6To); }
    if (trimInFrom) { mesQuery += ' AND t.TRIMIN >= ?'; mesParams.push(trimInFrom); }
    if (trimInTo) { mesQuery += ' AND t.TRIMIN <= ?'; mesParams.push(trimInTo); }
    if (cp7From) { mesQuery += ' AND t.CP7 >= ?'; mesParams.push(cp7From); }
    if (cp7To) { mesQuery += ' AND t.CP7 <= ?'; mesParams.push(cp7To); }
    if (cp72From) { mesQuery += ' AND t.CP72 >= ?'; mesParams.push(cp72From); }
    if (cp72To) { mesQuery += ' AND t.CP72 <= ?'; mesParams.push(cp72To); }
    if (cpFinalFrom) { mesQuery += ' AND t.CPFINAL >= ?'; mesParams.push(cpFinalFrom); }
    if (cpFinalTo) { mesQuery += ' AND t.CPFINAL <= ?'; mesParams.push(cpFinalTo); }
    if (cp8From) { mesQuery += ' AND t.CP8 >= ?'; mesParams.push(cp8From); }
    if (cp8To) { mesQuery += ' AND t.CP8 <= ?'; mesParams.push(cp8To); }

    mesQuery += ' ORDER BY t.CP5 DESC';

    const [mesRows] = await mesPool.query(mesQuery, mesParams);
    
    if (mesRows.length === 0) {
      return res.json([]);
    }

    let vehicles = mesRows;
    const vins = vehicles.map(v => v.vin);

    // --- LES фильтр (Inbound/Outbound) ---
    if (hasLesFilters) {
      const lesFilterQuery = `SELECT DISTINCT tbs.vin FROM tv_biz_storage_car tbs WHERE 1=1` +
        (inboundFrom ? ' AND tbs.in_storage_time >= ?' : '') +
        (inboundTo ? ' AND tbs.in_storage_time <= ?' : '') +
        (outboundFrom ? ' AND tbs.out_storage_time >= ?' : '') +
        (outboundTo ? ' AND tbs.out_storage_time <= ?' : '');
      const lesFilterParams = [
        ...(inboundFrom ? [inboundFrom] : []),
        ...(inboundTo ? [inboundTo] : []),
        ...(outboundFrom ? [outboundFrom] : []),
        ...(outboundTo ? [outboundTo] : [])
      ];
      const [lesFilterRows] = await lesPool.query(lesFilterQuery, lesFilterParams);
      const lesVins = new Set(lesFilterRows.map(r => r.vin));
      vehicles = vehicles.filter(v => lesVins.has(v.vin));
    }

    // --- IOT фильтр (batch_num) ---
    if (hasIotFilters) {
      const iotFilterQuery = `SELECT DISTINCT wo.vin FROM work_order wo WHERE 1=1` +
        (batchNum ? ' AND wo.batch_num = ?' : '');
      const iotFilterParams = batchNum ? [batchNum] : [];
      const [iotFilterRows] = await pool.query(iotFilterQuery, iotFilterParams);
      const iotVins = new Set(iotFilterRows.map(r => r.vin));
      vehicles = vehicles.filter(v => iotVins.has(v.vin));
    }

    if (vehicles.length === 0) {
      return res.json([]);
    }

    const filteredVins = vehicles.map(v => v.vin);
    const placeholders = filteredVins.map(() => '?').join(',');

    // --- Обогащение LES (in_storage_time, out_storage_time, складские поля) ---
    const lesDataPromise = lesPool.query(
      `SELECT tbs.vin, tbs.in_storage_time, tbs.out_storage_time,
              tbs.ck_no, tbs.kq_no, tbs.kw_no
       FROM tv_biz_storage_car tbs
       WHERE tbs.vin IN (${placeholders})`,
      [...filteredVins]
    );

    // --- Обогащение IOT (batch_num, TLWA, TLRT, TLADAS, TLTT) ---
    const iotDataPromise = pool.query(
      `SELECT wo.vin, wo.batch_num,
              MAX(IF(aow.wc_name = 'TLWA', aow.creation_time, NULL)) AS TLWA,
              MAX(IF(aow.wc_name = 'TLRT', aow.creation_time, NULL)) AS TLRT,
              MAX(IF(aow.wc_name = 'TLADAS', aow.creation_time, NULL)) AS TLADAS,
              MAX(IF(aow.wc_name = 'TLTT', aow.creation_time, NULL)) AS TLTT
       FROM work_order wo
       LEFT JOIN at_om_wiptrackinghistory aow ON wo.vin = aow.vin
       WHERE wo.vin IN (${placeholders})
       GROUP BY wo.vin, wo.batch_num`,
      [...filteredVins]
    );

    const [[lesRows], [iotRows]] = await Promise.all([lesDataPromise, iotDataPromise]);

    // Слияние LES + добавление storage_location
    const lesMap = new Map(lesRows.map(r => [r.vin, r]));
    vehicles = vehicles.map(v => {
      const les = lesMap.get(v.vin);
      const storageLocation = les 
        ? [les.ck_no, les.kq_no, les.kw_no].filter(Boolean).join('-') 
        : '';
      return {
        ...v,
        in_storage_time: les?.in_storage_time || null,
        out_storage_time: les?.out_storage_time || null,
        storage_location: storageLocation || null,
      };
    });

    // Слияние IoT
    const iotMap = new Map(iotRows.map(r => [r.vin, r]));
    vehicles = vehicles.map(v => ({
      ...v,
      batch_num: iotMap.get(v.vin)?.batch_num || null,
      TLWA: iotMap.get(v.vin)?.TLWA || null,
      TLRT: iotMap.get(v.vin)?.TLRT || null,
      TLADAS: iotMap.get(v.vin)?.TLADAS || null,
      TLTT: iotMap.get(v.vin)?.TLTT || null,
    }));

    // Вычисление location
    vehicles = vehicles.map(v => {
      let location = 'Планирование';
      if (v.out_storage_time) location = 'Продан';
      else if (v.in_storage_time) location = 'На складе';
      else if (v.CP8) location = 'CP8';
      else if (v.CPFINAL) location = 'CPFINAL';
      else if (v.TLWA || v.TLRT || v.TLADAS || v.TLTT) location = 'На тестах';
      else if (v.CP72) location = 'CP72';
      else if (v.CP7) location = 'CP7';
      else if (v.TRIMIN) location = 'TRIMIN';
      else if (v.CP6) location = 'CP6';
      else if (v.CP5) location = 'CP5';
      return { ...v, location };
    });

    // Фильтрация по расположению
    if (currentLocations) {
      const curArr = currentLocations.split(',').map(s => s.trim()).filter(Boolean);
      vehicles = vehicles.filter(v => curArr.includes(v.location));
    }
    if (excludeLocations) {
      const excArr = excludeLocations.split(',').map(s => s.trim()).filter(Boolean);
      vehicles = vehicles.filter(v => !excArr.includes(v.location));
    }

    // Фильтры TLWA/TLRT/TLADAS/TLTT
    if (tlwaFrom) vehicles = vehicles.filter(v => v.TLWA && new Date(v.TLWA) >= new Date(tlwaFrom));
    if (tlwaTo) vehicles = vehicles.filter(v => v.TLWA && new Date(v.TLWA) <= new Date(tlwaTo));
    if (tlrtFrom) vehicles = vehicles.filter(v => v.TLRT && new Date(v.TLRT) >= new Date(tlrtFrom));
    if (tlrtTo) vehicles = vehicles.filter(v => v.TLRT && new Date(v.TLRT) <= new Date(tlrtTo));
    if (tladasFrom) vehicles = vehicles.filter(v => v.TLADAS && new Date(v.TLADAS) >= new Date(tladasFrom));
    if (tladasTo) vehicles = vehicles.filter(v => v.TLADAS && new Date(v.TLADAS) <= new Date(tladasTo));
    if (tlttFrom) vehicles = vehicles.filter(v => v.TLTT && new Date(v.TLTT) >= new Date(tlttFrom));
    if (tlttTo) vehicles = vehicles.filter(v => v.TLTT && new Date(v.TLTT) <= new Date(tlttTo));

    res.json(vehicles);
  } catch (err) {
    console.error('Ошибка time-points:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Компоненты автомобиля
app.get('/api/time-points/:vin/components', async (req, res) => {
  try {
    const { vin } = req.params;
    const materialCode = req.query.materialCode;
    if (!materialCode) return res.status(400).json({ error: 'materialCode required' });

    const query = `
      SELECT *
      FROM (
        SELECT t.material_desc, t.material, d.code_value
        FROM b_tra_m_s_relation t
        LEFT JOIN (
          SELECT rmsd.material_code, rmsd.code_value, rmsr.vin
          FROM r_mat_scanning_detail rmsd
          JOIN r_mat_scanning_records rmsr ON rmsd.r_mat_scanning_records_id = rmsr.id
          WHERE rmsr.vin = ? AND rmsd.material_code IS NOT NULL AND rmsd.is_deleted = 0
        ) d ON t.material = d.material_code
        WHERE t.material_code = ? AND t.is_deleted = 0
        UNION ALL
        SELECT btmsr.material_desc, rmsd.material_code, rmsd.code_value
        FROM r_mat_scanning_detail rmsd
        JOIN r_mat_scanning_records rmsr ON rmsd.r_mat_scanning_records_id = rmsr.id
        LEFT JOIN b_tra_m_s_relation btmsr ON btmsr.material = rmsd.material_code AND btmsr.is_deleted = 0
        WHERE rmsr.vin = ? AND rmsd.material_code IS NOT NULL AND btmsr.material_desc IS NULL
      ) main
      ORDER BY material_desc
    `;
    const [rows] = await mesPool.query(query, [vin, materialCode, vin]);
    
    res.json(rows.map(r => ({
      material: r.material,
      material_desc: r.material_desc,
      code_value: r.code_value,
    })));
  } catch (err) {
    console.error('Ошибка компонентов:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Фильтры
app.get('/api/filters/kd-material-nos', async (req, res) => {
  try {
    const [rows] = await mesPool.query(`
      SELECT DISTINCT kd_material_no
      FROM udt_vsp_kd_material_mapping
      WHERE kd_material_no IS NOT NULL AND kd_material_no != ''
        AND is_deleted = 0
      ORDER BY kd_material_no
      LIMIT 500
    `);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка kd-material-nos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/filters/vehicle-types', async (req, res) => {
  try {
    const [rows] = await mesPool.query(`
      SELECT DISTINCT product AS vehicle_type
      FROM tm_ofm_order
      WHERE product IS NOT NULL AND product != ''
        AND is_deleted = 0
      ORDER BY product
    `);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка vehicle-types:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/filters/material-descs', async (req, res) => {
  try {
    const [rows] = await mesPool.query(`
      SELECT DISTINCT material_desc
      FROM tm_bas_material_relation
      WHERE material_desc IS NOT NULL AND material_desc != ''
        AND is_deleted = 0
      ORDER BY material_desc
      LIMIT 500
    `);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка material-descs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/filters/colours', async (req, res) => {
  try {
    const [rows] = await mesPool.query(`
      SELECT DISTINCT ps_material_desc AS colour
      FROM tm_bas_material_relation
      WHERE ps_material_desc IS NOT NULL AND ps_material_desc != ''
        AND is_deleted = 0
      ORDER BY ps_material_desc
    `);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка colours:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/time-point-neighbors', async (req, res) => {
  try {
    const { checkpoint, vin, limitBefore = 100, limitAfter = 100 } = req.query;
    if (!vin || !checkpoint) return res.status(400).json({ error: 'vin и checkpoint обязательны' });

    const beforeLimit = parseInt(limitBefore, 10) || 100;
    const afterLimit = parseInt(limitAfter, 10) || 100;
    const targetVin = vin.trim();

    const mesPoints = {
      CP5: 'AGMBS01002',
      CP6: 'AGMPS01002',
      TRIMIN: 'AGMAS01001',
      CP7: 'AGMAS01003',
      CP72: 'CP72',
      CPFINAL: 'CPFINAL',
      CP8: 'AGMAS01004',
    };
    const iotPoints = ['TLWA', 'TLRT', 'TLADAS', 'TLTT'];
    const lesPoints = ['Inbound', 'Outbound'];

    let rows;
    let targetTime = null;

    if (mesPoints[checkpoint]) {
      const uloc = mesPoints[checkpoint];
      const [targetRows] = await mesPool.query(
        `SELECT MAX(scan_time) AS point_time FROM ti_mes_movement WHERE vin = ? AND uloc_no = ? AND is_deleted = 0`,
        [targetVin, uloc]
      );
      targetTime = targetRows[0]?.point_time;
      if (!targetTime) return res.json({ data: [], targetTime: null });

      const sql = `
        WITH all_points AS (
          SELECT vin, MAX(scan_time) AS point_time
          FROM ti_mes_movement
          WHERE uloc_no = ? AND is_deleted = 0
          GROUP BY vin
        )
        SELECT vin, point_time FROM (
          (SELECT vin, point_time FROM all_points WHERE point_time <= ? ORDER BY point_time DESC LIMIT ?)
          UNION ALL
          (SELECT vin, point_time FROM all_points WHERE point_time > ? ORDER BY point_time ASC LIMIT ?)
        ) AS neighbors
        ORDER BY point_time ASC
      `;
      const [resultRows] = await mesPool.query(sql, [uloc, targetTime, beforeLimit, targetTime, afterLimit]);
      rows = resultRows;
    } else if (iotPoints.includes(checkpoint)) {
      const [targetRows] = await pool.query(
        `SELECT MAX(CREATION_TIME) AS point_time FROM at_om_wiptrackinghistory WHERE vin = ? AND WC_NAME = ?`,
        [targetVin, checkpoint]
      );
      targetTime = targetRows[0]?.point_time;
      if (!targetTime) return res.json({ data: [], targetTime: null });

      const sql = `
        WITH all_points AS (
          SELECT vin, MAX(CREATION_TIME) AS point_time
          FROM at_om_wiptrackinghistory
          WHERE WC_NAME = ?
          GROUP BY vin
        )
        SELECT vin, point_time FROM (
          (SELECT vin, point_time FROM all_points WHERE point_time <= ? ORDER BY point_time DESC LIMIT ?)
          UNION ALL
          (SELECT vin, point_time FROM all_points WHERE point_time > ? ORDER BY point_time ASC LIMIT ?)
        ) AS neighbors
        ORDER BY point_time ASC
      `;
      const [resultRows] = await pool.query(sql, [checkpoint, targetTime, beforeLimit, targetTime, afterLimit]);
      rows = resultRows;
    } else if (lesPoints.includes(checkpoint)) {
      const column = checkpoint === 'Inbound' ? 'in_storage_time' : 'out_storage_time';
      const [targetRows] = await lesPool.query(
        `SELECT ${column} AS point_time FROM tv_biz_storage_car WHERE vin = ? LIMIT 1`,
        [targetVin]
      );
      targetTime = targetRows[0]?.point_time;
      if (!targetTime) return res.json({ data: [], targetTime: null });

      const sql = `
        SELECT vin, ${column} AS point_time FROM (
          (SELECT vin, ${column} FROM tv_biz_storage_car WHERE ${column} <= ? ORDER BY ${column} DESC LIMIT ?)
          UNION ALL
          (SELECT vin, ${column} FROM tv_biz_storage_car WHERE ${column} > ? ORDER BY ${column} ASC LIMIT ?)
        ) AS neighbors
        ORDER BY point_time ASC
      `;
      const [resultRows] = await lesPool.query(sql, [targetTime, beforeLimit, targetTime, afterLimit]);
      rows = resultRows;
    } else {
      return res.status(400).json({ error: 'Неверный checkpoint' });
    }

    res.json({ data: rows, targetTime });
  } catch (err) {
    console.error('Ошибка time-point-neighbors:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles-current-location', async (req, res) => {
  try {
    const { vins } = req.query;
    if (!vins) return res.status(400).json({ error: 'vins обязателен' });
    const vinList = vins.split(',').map(v => v.trim()).filter(Boolean);
    if (vinList.length === 0) return res.json([]);

    const placeholders = vinList.map(() => '?').join(',');

    // 1. MES: времена прохождения точек
    const [mesRows] = await mesPool.query(
      `SELECT vin,
              MAX(IF(uloc_no = 'AGMBS01002', scan_time, NULL)) AS CP5,
              MAX(IF(uloc_no = 'AGMPS01002', scan_time, NULL)) AS CP6,
              MAX(IF(uloc_no = 'AGMAS01001', scan_time, NULL)) AS TRIMIN,
              MAX(IF(uloc_no = 'AGMAS01003', scan_time, NULL)) AS CP7,
              MAX(IF(uloc_no = 'CP72', scan_time, NULL)) AS CP72,
              MAX(IF(uloc_no = 'CPFINAL', scan_time, NULL)) AS CPFINAL,
              MAX(IF(uloc_no = 'AGMAS01004', scan_time, NULL)) AS CP8
       FROM ti_mes_movement
       WHERE vin IN (${placeholders}) AND is_deleted = 0
       GROUP BY vin`,
      vinList
    );

    // 2. IOT: TL-точки (используем WC_NAME)
    const [iotRows] = await pool.query(
      `SELECT wo.vin,
              MAX(IF(aow.WC_NAME = 'TLWA', aow.CREATION_TIME, NULL)) AS TLWA,
              MAX(IF(aow.WC_NAME = 'TLRT', aow.CREATION_TIME, NULL)) AS TLRT,
              MAX(IF(aow.WC_NAME = 'TLADAS', aow.CREATION_TIME, NULL)) AS TLADAS,
              MAX(IF(aow.WC_NAME = 'TLTT', aow.CREATION_TIME, NULL)) AS TLTT
       FROM work_order wo
       LEFT JOIN at_om_wiptrackinghistory aow ON wo.vin = aow.vin
       WHERE wo.vin IN (${placeholders})
       GROUP BY wo.vin`,
      vinList
    );

    // 3. LES: складские данные + статус
    const [storageRows] = await lesPool.query(
      `SELECT vin, ck_no, kq_no, kw_no, out_storage_time, in_storage_status
       FROM tv_biz_storage_car
       WHERE vin IN (${placeholders})`,
      vinList
    );

    const mesMap = new Map(mesRows.map(r => [r.vin, r]));
    const iotMap = new Map(iotRows.map(r => [r.vin, r]));
    const storageMap = new Map(storageRows.map(r => [r.vin, r]));

    const checkpoints = ['CP5','CP6','TRIMIN','CP7','CP72','TLWA','TLRT','TLADAS','TLTT','CPFINAL','CP8'];

    const result = vinList.map(vin => {
      const m = mesMap.get(vin) || {};
      const i = iotMap.get(vin) || {};
      const s = storageMap.get(vin);

      const times = {
        CP5: m.CP5,
        CP6: m.CP6,
        TRIMIN: m.TRIMIN,
        CP7: m.CP7,
        CP72: m.CP72,
        TLWA: i.TLWA,
        TLRT: i.TLRT,
        TLADAS: i.TLADAS,
        TLTT: i.TLTT,
        CPFINAL: m.CPFINAL,
        CP8: m.CP8,
      };

      let latestCheckpoint = null;
      let latestTime = null;
      for (const cp of checkpoints) {
        if (times[cp]) {
          const t = new Date(times[cp]);
          if (!latestTime || t > latestTime) {
            latestTime = t;
            latestCheckpoint = cp;
          }
        }
      }

      // Определяем статус: продан, если in_storage_status = 'Key_Car_In_Storage_Status_3'
      const isSold = s && s.in_storage_status === 'Key_Car_In_Storage_Status_3';
      
      // На складе, если есть все три координаты и не продан
      const hasStorageData = s && s.ck_no && s.kq_no && s.kw_no &&
                             s.ck_no !== 'N/A' && s.kq_no !== 'N/A' && s.kw_no !== 'N/A';
      const isInStorage = !isSold && hasStorageData;
      const storageString = hasStorageData ? `${s.ck_no}-${s.kq_no}-${s.kw_no}` : null;

      return {
        vin,
        isInStorage,
        isSold,
        storageString,
        checkpoint: isSold ? 'Продан' : (isInStorage ? null : latestCheckpoint),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Ошибка vehicles-current-location:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles-models', async (req, res) => {
  try {
    const { vins } = req.query;
    if (!vins) return res.status(400).json({ error: 'vins обязателен' });
    const vinList = vins.split(',').map(v => v.trim()).filter(Boolean);
    if (vinList.length === 0) return res.json({});

    const placeholders = vinList.map(() => '?').join(',');

    const [rows] = await mesPool.query(
      `SELECT vin, product AS model
       FROM tm_ofm_order
       WHERE vin IN (${placeholders})`,
      vinList
    );

    const map = {};
    rows.forEach(r => { map[r.vin] = r.model; });

    res.json(map);
  } catch (err) {
    console.error('Ошибка vehicles-models:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles-model-complect', async (req, res) => {
  try {
    const { vins } = req.query;
    if (!vins) return res.status(400).json({ error: 'vins обязателен' });
    const vinList = vins.split(',').map(v => v.trim()).filter(Boolean);
    if (vinList.length === 0) return res.json({});

    const placeholders = vinList.map(() => '?').join(',');

    const [rows] = await mesPool.query(
      `SELECT 
         too.vin,
         too.product AS model,
         tbmr.material_desc AS material_desc
       FROM tm_ofm_order too
       LEFT JOIN tm_vhc_vehicle tvv ON too.vin = tvv.vin
       LEFT JOIN tm_bas_material_relation tbmr 
         ON tbmr.material_no = too.material_no AND tbmr.is_deleted = 0
       WHERE too.vin IN (${placeholders})`,
      vinList
    );

    const map = {};
    rows.forEach(r => { 
      map[r.vin] = { 
        model: r.model || '-', 
        material_desc: r.material_desc || '-' 
      }; 
    });

    res.json(map);
  } catch (err) {
    console.error('Ошибка vehicles-model-complect:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drr-cp7-dashboard', async (req, res) => {
  try {
    const { filter = 'all', startTime, endTime } = req.query;

    let rangeStart, rangeEnd;
    if (startTime && endTime) {
      rangeStart = startTime;
      rangeEnd = endTime;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      rangeStart = `${y}-${m}-${d} 00:00:00`;
      rangeEnd = `${y}-${m}-${d} 23:59:59`;
    }

    const postLists = {
      all: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ],
      cp7: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1','PIP9'
      ],
      pip: [
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ]
    };

    const postList = postLists[filter] || postLists.all;
    const postListStr = postList.map(p => `'${p}'`).join(',');

    // 1. Все VIN, прошедшие CP72 в заданном окне
    const [cp72Rows] = await pool.query(`
      SELECT VIN
      FROM at_om_wiptrackinghistory
      WHERE WC_NAME = 'CP72'
        AND CREATION_TIME >= ?
        AND CREATION_TIME <= ?
      GROUP BY VIN
    `, [rangeStart, rangeEnd]);
    const totalVins = cp72Rows.length;

    if (totalVins === 0) {
      return res.json({ totalVins: 0, closedVins: 0, drrPercent: 0 });
    }

    // 2. Дефекты по выбранным постам и времени
    const [defectRows] = await pool.query(`
      SELECT
        d.VIN,
        d.STATUS
      FROM at_qm_defect_info d
      WHERE d.POST_NAME IN (${postListStr})
        AND d.CREATION_TIME >= ?
        AND d.CREATION_TIME <= ?
        AND d.VIN IN (
          SELECT VIN FROM at_om_wiptrackinghistory
          WHERE WC_NAME = 'CP72'
            AND CREATION_TIME >= ?
            AND CREATION_TIME <= ?
        )
    `, [rangeStart, rangeEnd, rangeStart, rangeEnd]);

    const vinDefectMap = new Map();
    defectRows.forEach(row => {
      const vin = row.VIN;
      if (!vinDefectMap.has(vin)) {
        vinDefectMap.set(vin, { total: 0, closed: 0 });
      }
      const stat = vinDefectMap.get(vin);
      stat.total += 1;
      if (row.STATUS && row.STATUS.toLowerCase() === 'closed') {
        stat.closed += 1;
      }
    });

    let closedVins = 0;
    cp72Rows.forEach(row => {
      const vin = row.VIN;
      const stat = vinDefectMap.get(vin);
      if (!stat || stat.total === stat.closed) {
        closedVins += 1;
      }
    });

    const drrPercent = totalVins > 0 ? (closedVins / totalVins) * 100 : 0;

    res.json({
      totalVins,
      closedVins,
      drrPercent: Math.round(drrPercent * 10) / 10,
    });
  } catch (err) {
    console.error('Ошибка DRR CP7 Dashboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drr-cp7-top-defects', async (req, res) => {
  try {
    const { filter = 'all', startTime, endTime } = req.query;

    let rangeStart, rangeEnd;
    if (startTime && endTime) {
      rangeStart = startTime;
      rangeEnd = endTime;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      rangeStart = `${y}-${m}-${d} 00:00:00`;
      rangeEnd = `${y}-${m}-${d} 23:59:59`;
    }

    const postLists = {
      all: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ],
      cp7: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1', 'PIP2', 'PIP4', 'PIP9'
      ],
      pip: [
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ]
    };

    const postList = postLists[filter] || postLists.all;
    const postListStr = postList.map(p => `'${p}'`).join(',');

    // 1. VIN, прошедшие CP72 в окне
    const [cp72Rows] = await pool.query(`
      SELECT VIN
      FROM at_om_wiptrackinghistory
      WHERE WC_NAME = 'CP72'
        AND CREATION_TIME >= ?
        AND CREATION_TIME <= ?
      GROUP BY VIN
    `, [rangeStart, rangeEnd]);

    if (cp72Rows.length === 0) {
      return res.json([]);
    }

    // 2. Все дефекты (выбранные посты) для этих VIN в окне
    const [defectRows] = await pool.query(`
      SELECT
        d.VIN,
        wo.MODEL,
        d.PART_NAME,
        d.PROBLEM_TYPE,
        d.PROBLEM_GRADE,
        d.STATUS
      FROM at_qm_defect_info d
      LEFT JOIN work_order wo ON wo.VIN = d.VIN
      WHERE d.POST_NAME IN (${postListStr})
        AND d.CREATION_TIME >= ?
        AND d.CREATION_TIME <= ?
        AND d.VIN IN (
          SELECT VIN FROM at_om_wiptrackinghistory
          WHERE WC_NAME = 'CP72'
            AND CREATION_TIME >= ?
            AND CREATION_TIME <= ?
        )
    `, [rangeStart, rangeEnd, rangeStart, rangeEnd]);

    // 3. Определяем NOK VIN (у которых есть хотя бы один незакрытый дефект)
    const vinStatusMap = new Map();
    defectRows.forEach(row => {
      const vin = row.VIN;
      if (!vinStatusMap.has(vin)) {
        vinStatusMap.set(vin, { hasOpen: false });
      }
      if (row.STATUS && row.STATUS.toLowerCase() !== 'closed') {
        vinStatusMap.get(vin).hasOpen = true;
      }
    });

    const openVins = new Set();
    vinStatusMap.forEach((val, vin) => {
      if (val.hasOpen) openVins.add(vin);
    });

    // 4. Группируем только незакрытые дефекты NOK VIN, считаем количество строк
    const defectGroupMap = new Map();
    defectRows.forEach(row => {
      if (!openVins.has(row.VIN)) return;
      // Учитываем только незакрытые дефекты
      if (row.STATUS && row.STATUS.toLowerCase() === 'closed') return;

      const mpp = `${row.MODEL || '-'} ${row.PART_NAME || ''} ${row.PROBLEM_TYPE || ''}`.trim();
      if (!defectGroupMap.has(mpp)) {
        defectGroupMap.set(mpp, {
          mpp,
          grade: row.PROBLEM_GRADE || '-',
          defectCount: 0,
        });
      }
      defectGroupMap.get(mpp).defectCount += 1;
    });

    const topDefects = Array.from(defectGroupMap.values())
      .map(d => ({
        mpp: d.mpp,
        grade: d.grade,
        defectCount: d.defectCount,
      }))
      .sort((a, b) => b.defectCount - a.defectCount)
      .slice(0, 20);

    res.json(topDefects);
  } catch (err) {
    console.error('Ошибка DRR CP7 Top Defects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== EMAIL SETTINGS ==================

// Создание таблицы, если её ещё нет
async function initEmailSettingsTable() {
  try {
    await notesPool.query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        to_email VARCHAR(1000) NOT NULL DEFAULT '',
        cc_email VARCHAR(1000) NOT NULL DEFAULT '',
        subject VARCHAR(500) NOT NULL DEFAULT '',
        body TEXT,
        signature_text TEXT,
        signature_image LONGTEXT,
        sender_name VARCHAR(255) DEFAULT 'MBS Quality System',
        schedule_days VARCHAR(100) DEFAULT '1,2,3,4,5',
        schedule_times VARCHAR(500) DEFAULT '08:00,12:00,16:00',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица email_settings готова');
  } catch (err) {
    console.error('Ошибка создания таблицы email_settings:', err.message);
  }
}

// Вызываем при старте сервера (можно в startServer перед app.listen)
initEmailSettingsTable();

// Получить настройки
app.get('/api/email-settings', async (req, res) => {
  try {
    const [rows] = await notesPool.query('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) {
      return res.json({
        to: '',
        cc: '',
        subject: '',
        body: '',
        signature_text: '',
        signature_image: '',
        sender_name: 'MBS Quality System',
        schedule: { days: [1,2,3,4,5], times: ['08:00','12:00','16:00'] },
      });
    }
    const row = rows[0];
    res.json({
      to: row.to_email,
      cc: row.cc_email,
      subject: row.subject,
      body: row.body,
      signature_text: row.signature_text,
      signature_image: row.signature_image,
      sender_name: row.sender_name,
      schedule: {
        days: row.schedule_days ? row.schedule_days.split(',').map(Number) : [],
        times: row.schedule_times ? row.schedule_times.split(',') : [],
      },
    });
  } catch (err) {
    console.error('Ошибка получения email-settings:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Сохранить настройки
app.post('/api/email-settings', async (req, res) => {
  try {
    const {
      to, cc, subject, body,
      signature_text, signature_image, sender_name, schedule,
    } = req.body;

    const daysStr = Array.isArray(schedule?.days) ? schedule.days.join(',') : '';
    const timesStr = Array.isArray(schedule?.times) ? schedule.times.join(',') : '';

    // Удаляем старые записи и вставляем новую (одна строка настроек)
    await notesPool.query('DELETE FROM email_settings');
    await notesPool.query(`
      INSERT INTO email_settings 
        (to_email, cc_email, subject, body, signature_text, signature_image, sender_name, schedule_days, schedule_times)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [to, cc, subject, body, signature_text, signature_image, sender_name, daysStr, timesStr]);

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка сохранения email-settings:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

app.get('/api/drr-cp7-history', async (req, res) => {
  try {
    const { filter = 'all', period = 'all', count, fromDate, toDate } = req.query;

    const postLists = {
      all: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ],
      cp7: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1', 'PIP2', 'PIP4', 'PIP9'
      ],
      pip: [
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ]
    };
    const postList = postLists[filter] || postLists.all;
    const postListStr = postList.map(p => `'${p}'`).join(',');

    const calcModelsForRange = async (startDate, endDate) => {
      const sql = `
        WITH cp72_vins AS (
            SELECT a.VIN, MIN(a.CREATION_TIME) AS CP72_TIME, wo.MODEL
            FROM at_om_wiptrackinghistory a
            JOIN work_order wo ON wo.VIN = a.VIN
            WHERE a.WC_NAME = 'CP72'
              AND DATE(a.CREATION_TIME) BETWEEN ? AND ?
            GROUP BY a.VIN, wo.MODEL
        ),
        defect_status AS (
            SELECT 
                d.VIN,
                COALESCE(d.REPAIR_TIME, d.REPAIR_TIME1) AS repair_time,
                cp.CP72_TIME,
                DATE_ADD(cp.CP72_TIME, INTERVAL 17 MINUTE) AS ADJUSTED_CP72_TIME,
                CASE 
                    WHEN (d.PART_NAME IS NULL OR TRIM(d.PART_NAME) = '') 
                         AND (d.PROBLEM_TYPE IS NULL OR TRIM(d.PROBLEM_TYPE) = '') 
                    THEN 'CLOSED'
                    WHEN COALESCE(d.REPAIR_TIME, d.REPAIR_TIME1) IS NULL THEN 'CLOSED'
                    WHEN COALESCE(d.REPAIR_TIME, d.REPAIR_TIME1) < DATE_ADD(cp.CP72_TIME, INTERVAL 17 MINUTE) THEN 'CLOSED'
                    ELSE 'OFF'
                END AS calculated_status
            FROM at_qm_defect_info d
            JOIN cp72_vins cp ON d.VIN = cp.VIN
            WHERE d.POST_NAME IN (${postListStr})
              AND d.CREATION_TIME >= ? AND d.CREATION_TIME <= ?
        ),
        vin_summary AS (
            SELECT VIN, MAX(CASE WHEN calculated_status = 'OFF' THEN 1 ELSE 0 END) AS has_off
            FROM defect_status
            GROUP BY VIN
        )
        SELECT 
            cp.VIN,
            cp.MODEL,
            CASE WHEN vs.has_off = 0 OR vs.has_off IS NULL THEN 1 ELSE 0 END AS all_closed
        FROM cp72_vins cp
        LEFT JOIN vin_summary vs ON vs.VIN = cp.VIN
      `;
      const [rows] = await pool.query(sql, [
        startDate, endDate,
        startDate + ' 00:00:00', endDate + ' 23:59:59'
      ]);

      const models = {};
      rows.forEach(r => {
        const model = r.MODEL || '-';
        if (!models[model]) models[model] = { totalVins: 0, closedVins: 0 };
        models[model].totalVins += 1;
        models[model].closedVins += r.all_closed;
      });

      const totalVins = rows.length;
      const closedVins = rows.reduce((sum, r) => sum + r.all_closed, 0);
      const drr = totalVins > 0 ? (closedVins / totalVins) * 100 : 0;

      Object.keys(models).forEach(model => {
        const m = models[model];
        m.drr = m.totalVins > 0 ? (m.closedVins / m.totalVins) * 100 : 0;
        m.drr = Math.round(m.drr * 10) / 10;
      });

      return { totalVins, closedVins, drr: Math.round(drr * 10) / 10, models };
    };

    const calcModelsForToday = async () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const start = `${y}-${m}-${d} 00:00:00`;
      const end = `${y}-${m}-${d} 23:59:59`;

      const [cp72Rows] = await pool.query(`
        SELECT a.VIN, wo.MODEL
        FROM at_om_wiptrackinghistory a
        JOIN work_order wo ON wo.VIN = a.VIN
        WHERE a.WC_NAME = 'CP72'
          AND a.CREATION_TIME >= ? AND a.CREATION_TIME <= ?
        GROUP BY a.VIN, wo.MODEL
      `, [start, end]);

      const totalVins = cp72Rows.length;
      if (totalVins === 0) return { totalVins: 0, closedVins: 0, drr: 0, models: {} };

      const [defectRows] = await pool.query(`
        SELECT d.VIN, d.STATUS
        FROM at_qm_defect_info d
        WHERE d.POST_NAME IN (${postListStr})
          AND d.CREATION_TIME >= ? AND d.CREATION_TIME <= ?
          AND d.VIN IN (
            SELECT a.VIN FROM at_om_wiptrackinghistory a
            WHERE a.WC_NAME = 'CP72' AND a.CREATION_TIME >= ? AND a.CREATION_TIME <= ?
          )
      `, [start, end, start, end]);

      const vinDefectMap = new Map();
      defectRows.forEach(row => {
        if (!vinDefectMap.has(row.VIN)) vinDefectMap.set(row.VIN, { total: 0, closed: 0 });
        const stat = vinDefectMap.get(row.VIN);
        stat.total += 1;
        if (row.STATUS && row.STATUS.toLowerCase() === 'closed') stat.closed += 1;
      });

      const models = {};
      let closedVins = 0;
      cp72Rows.forEach(row => {
        const stat = vinDefectMap.get(row.VIN);
        const allClosed = !stat || stat.total === stat.closed;
        if (allClosed) closedVins += 1;
        const model = row.MODEL || '-';
        if (!models[model]) models[model] = { totalVins: 0, closedVins: 0 };
        models[model].totalVins += 1;
        if (allClosed) models[model].closedVins += 1;
      });

      Object.keys(models).forEach(model => {
        const m = models[model];
        m.drr = m.totalVins > 0 ? (m.closedVins / m.totalVins) * 100 : 0;
        m.drr = Math.round(m.drr * 10) / 10;
      });

      const drr = totalVins > 0 ? (closedVins / totalVins) * 100 : 0;
      return { totalVins, closedVins, drr: Math.round(drr * 10) / 10, models };
    };

    const getISOWeek = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    };

    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const pad = (num) => String(num).padStart(2, '0');

    const now = new Date();
    let periods = [];

    const typeOrder = { year: 0, month: 1, week: 2, day: 3 };

    if (period === 'all') {
      // существующая логика для всех периодов
      for (let i = 1; i >= 0; i--) {
        const y = now.getFullYear() - i;
        periods.push({ label: String(y), startDate: `${y}-01-01`, endDate: `${y}-12-31`, type: 'year' });
      }
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
        const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
        periods.push({ label: `${monthName} ${y}`, startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${lastDay}`, type: 'month' });
      }
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      for (let i = 3; i >= 0; i--) {
        const start = new Date(monday);
        start.setDate(monday.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        periods.push({ label: `W${getISOWeek(start)}`, startDate: formatDate(start), endDate: formatDate(end), type: 'week' });
      }
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        periods.push({ label: `${pad(d.getDate())}.${pad(d.getMonth()+1)}`, startDate: formatDate(d), endDate: formatDate(d), type: 'day' });
      }
    } else {
      if (fromDate && toDate && period !== 'all') {
        // Генерация периодов на основе заданного диапазона
        let from = new Date(fromDate + 'T00:00:00');
        let to = new Date(toDate + 'T00:00:00');
        if (from > to) [from, to] = [to, from]; // меняем местами, если надо

        if (period === 'day') {
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);
            periods.push({
              label: `${pad(d.getDate())}.${pad(d.getMonth()+1)}`,
              startDate: dateStr,
              endDate: dateStr,
              type: 'day'
            });
          }
        } else if (period === 'month') {
          let d = new Date(from.getFullYear(), from.getMonth(), 1);
          while (d <= to) {
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const lastDay = new Date(y, m, 0).getDate();
            const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
            periods.push({
              label: `${monthName} ${y}`,
              startDate: `${y}-${pad(m)}-01`,
              endDate: `${y}-${pad(m)}-${lastDay}`,
              type: 'month'
            });
            d.setMonth(d.getMonth() + 1);
          }
        } else if (period === 'week') {
          const day = from.getDay();
          const monday = new Date(from);
          monday.setDate(from.getDate() - (day === 0 ? 6 : day - 1));
          for (let start = new Date(monday); start <= to; start.setDate(start.getDate() + 7)) {
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            periods.push({
              label: `W${getISOWeek(start)}`,
              startDate: formatDate(start),
              endDate: formatDate(end),
              type: 'week'
            });
          }
        } else if (period === 'year') {
          for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
            periods.push({
              label: String(y),
              startDate: `${y}-01-01`,
              endDate: `${y}-12-31`,
              type: 'year'
            });
          }
        }
      } else {
        // Существующая логика на основе count
        const defaultCount = { year: 2, month: 3, week: 4, day: 14 }[period] || 7;
        const limit = parseInt(count, 10) || defaultCount;
        if (period === 'year') {
          for (let i = limit - 1; i >= 0; i--) {
            const y = now.getFullYear() - i;
            periods.push({ label: String(y), startDate: `${y}-01-01`, endDate: `${y}-12-31`, type: 'year' });
          }
        } else if (period === 'month') {
          for (let i = limit - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
            const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
            periods.push({ label: `${monthName} ${y}`, startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${lastDay}`, type: 'month' });
          }
        } else if (period === 'week') {
          const dayOfWeek = now.getDay();
          const monday = new Date(now);
          monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          for (let i = limit - 1; i >= 0; i--) {
            const start = new Date(monday);
            start.setDate(monday.getDate() - i * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            periods.push({ label: `W${getISOWeek(start)}`, startDate: formatDate(start), endDate: formatDate(end), type: 'week' });
          }
        } else if (period === 'day') {
          for (let i = limit - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            periods.push({ label: `${pad(d.getDate())}.${pad(d.getMonth()+1)}`, startDate: formatDate(d), endDate: formatDate(d), type: 'day' });
          }
        }
      }
    }

    periods.sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.startDate.localeCompare(b.startDate));

    const results = [];
    for (const p of periods) {
      let calcResult;
      if (p.type === 'day' && p.startDate === formatDate(new Date())) {
        calcResult = await calcModelsForToday();
      } else {
        calcResult = await calcModelsForRange(p.startDate, p.endDate);
      }
      results.push({
        label: p.label,
        type: p.type,
        drr: calcResult.drr,
        totalVins: calcResult.totalVins,
        closedVins: calcResult.closedVins,
        models: calcResult.models
      });
    }

    res.json({ periods: results });
  } catch (err) {
    console.error('Ошибка DRR CP7 History:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/testpage-data', async (req, res) => {
  try {
    const { filter = 'all', startTime, endTime } = req.query;
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime и endTime обязательны' });
    }

    const postLists = {
      all: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ],
      cp7: [
        'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
        'REPAIR', 'REPAIR_Final',
        'EXT1', 'PIP2', 'PIP4', 'PIP9'
      ],
      pip: [
        'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9'
      ]
    };
    const postList = postLists[filter] || postLists.all;
    const postListStr = postList.map(p => `'${p}'`).join(',');

    const sql = `
      WITH cp72_vins AS (
          SELECT 
              VIN,
              MIN(CREATION_TIME) AS CP72_TIME
          FROM at_om_wiptrackinghistory
          WHERE WC_NAME = 'CP72'
            AND CREATION_TIME >= ?
            AND CREATION_TIME <= ?
          GROUP BY VIN
      ),
      defect_status AS (
          SELECT 
              d.VIN,
              d.PART_NAME,
              d.PROBLEM_TYPE,
              d.PROBLEM_GRADE,
              d.POST_NAME,
              d.CREATION_TIME,
              COALESCE(d.REPAIR_TIME, d.REPAIR_TIME1) AS repair_time,
              cp.CP72_TIME,
              DATE_ADD(cp.CP72_TIME, INTERVAL 17 MINUTE) AS ADJUSTED_CP72_TIME,
              CASE 
                  -- Пустые PART_NAME и PROBLEM_TYPE -> CLOSED
                  WHEN (d.PART_NAME IS NULL OR TRIM(d.PART_NAME) = '') 
                       AND (d.PROBLEM_TYPE IS NULL OR TRIM(d.PROBLEM_TYPE) = '') 
                  THEN 'CLOSED'
                  -- Если ремонт выполнен до скорректированного CP72 -> CLOSED
                  WHEN COALESCE(d.REPAIR_TIME, d.REPAIR_TIME1) < DATE_ADD(cp.CP72_TIME, INTERVAL 5 MINUTE) THEN 'CLOSED'
                  -- Всё остальное (включая repair_time IS NULL) -> OFF
                  ELSE 'OFF'
              END AS calculated_status
          FROM at_qm_defect_info d
          JOIN cp72_vins cp ON d.VIN = cp.VIN
          WHERE d.POST_NAME IN (${postListStr})
            AND d.CREATION_TIME >= ?
            AND d.CREATION_TIME <= ?
      ),
      vin_summary AS (
          SELECT 
              VIN,
              COUNT(*) AS total_defects,
              SUM(CASE WHEN calculated_status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_defects,
              SUM(CASE WHEN calculated_status = 'OFF' THEN 1 ELSE 0 END) AS off_defects
          FROM defect_status
          GROUP BY VIN
      )
      SELECT 
          d.VIN,
          wo.MODEL,
          d.PART_NAME,
          d.PROBLEM_TYPE,
          d.PROBLEM_GRADE,
          d.POST_NAME,
          d.calculated_status AS STATUS,
          d.CREATION_TIME,
          d.repair_time AS REPAIR_TIME,
          d.CP72_TIME,
          d.ADJUSTED_CP72_TIME,
          CASE 
              WHEN vs.off_defects = 0 THEN 1 
              ELSE 0 
          END AS ALL_DEFECTS_CLOSED
      FROM defect_status d
      LEFT JOIN work_order wo ON wo.VIN = d.VIN
      LEFT JOIN vin_summary vs ON vs.VIN = d.VIN
      ORDER BY d.VIN, d.CREATION_TIME
    `;

    const [rows] = await pool.query(sql, [startTime, endTime, startTime, endTime]);

    if (!rows.length) {
      return res.json({ totalVins: 0, closedVins: 0, drrPercent: 0, topDefects: [] });
    }

    const vinMap = new Map();
    rows.forEach(row => {
      const vin = row.VIN;
      if (!vinMap.has(vin)) {
        vinMap.set(vin, { allClosed: row.ALL_DEFECTS_CLOSED === 1, model: row.MODEL || '-' });
      }
      if (row.ALL_DEFECTS_CLOSED === 0) {
        vinMap.get(vin).allClosed = false;
      }
      if (row.MODEL) {
        vinMap.get(vin).model = row.MODEL;
      }
    });

    const totalVins = vinMap.size;
    const closedVins = Array.from(vinMap.values()).filter(v => v.allClosed).length;
    const drrPercent = totalVins > 0 ? (closedVins / totalVins) * 100 : 0;

    const notClosedVins = new Set(
      Array.from(vinMap.entries())
        .filter(([, v]) => !v.allClosed)
        .map(([vin]) => vin)
    );

    const defectMap = new Map();
    rows.forEach(row => {
      if (!notClosedVins.has(row.VIN)) return;
      const mpp = `${row.MODEL || '-'} ${row.PART_NAME || ''} ${row.PROBLEM_TYPE || ''}`.trim();
      if (!defectMap.has(mpp)) {
        defectMap.set(mpp, { mpp, grade: row.PROBLEM_GRADE || '-', affectedVins: new Set() });
      }
      defectMap.get(mpp).affectedVins.add(row.VIN);
    });

    const topDefects = Array.from(defectMap.values())
      .map(d => ({
        mpp: d.mpp,
        grade: d.grade,
        affectedVins: d.affectedVins.size,
      }))
      .sort((a, b) => b.affectedVins - a.affectedVins)
      .slice(0, 20);

    res.json({
      totalVins,
      closedVins,
      drrPercent: Math.round(drrPercent * 10) / 10,
      topDefects,
    });
  } catch (err) {
    console.error('Ошибка testpage-data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drr-cp8-dashboard', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    let rangeStart, rangeEnd;
    if (startTime && endTime) {
      rangeStart = startTime;
      rangeEnd = endTime;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      rangeStart = `${y}-${m}-${d} 00:00:00`;
      rangeEnd = `${y}-${m}-${d} 23:59:59`;
    }

    // 1. VIN, прошедшие CP72 за период (MES)
    const [cp72Rows] = await mesPool.query(`
      SELECT DISTINCT vin
      FROM ti_mes_movement
      WHERE uloc_no = 'CP72'
        AND scan_time >= ?
        AND scan_time < ?
    `, [rangeStart, rangeEnd]);

    if (cp72Rows.length === 0) {
      return res.json({ totalVins: 0, closedVins: 0, drrPercent: 0 });
    }

    const vins = cp72Rows.map(r => r.vin);
    const placeholders = vins.map(() => '?').join(',');

    // 2. Дефекты по расширенному списку постов для этих VIN
    const defectPosts = [
      'TLTT','CP8','TLADAS','TLWA','TLRT','CPA',
      'CP8 Gate','CP8-gate','360','ADAS','ADAS+RB',
      'TEST TRACK','TRACK','WA','WT','CP8 Touch Up'
    ];
    const defectPostsStr = defectPosts.map(p => `'${p}'`).join(',');

    const [defectRows] = await pool.query(`
      SELECT
        d.VIN,
        d.STATUS
      FROM at_qm_defect_info d
      WHERE d.POST_NAME IN (${defectPostsStr})
        AND d.CREATION_TIME >= ?
        AND d.CREATION_TIME < ?
        AND d.VIN IN (${placeholders})
    `, [rangeStart, rangeEnd, ...vins]);

    // 3. Для каждого VIN определяем, есть ли хотя бы один не closed дефект
    const vinHasOpenDefect = new Set();
    defectRows.forEach(row => {
      if (!row.STATUS || row.STATUS.toLowerCase() !== 'closed') {
        vinHasOpenDefect.add(row.VIN);
      }
    });

    // 4. Подсчёт closedVins (OK) – автомобиль OK, если нет открытых дефектов
    let closedVins = 0;
    cp72Rows.forEach(row => {
      if (!vinHasOpenDefect.has(row.vin)) closedVins += 1;
    });

    const drrPercent = (closedVins / cp72Rows.length) * 100;
    res.json({
      totalVins: cp72Rows.length,
      closedVins,
      drrPercent: Math.round(drrPercent * 10) / 10,
    });
  } catch (err) {
    console.error('Ошибка DRR CP8 Dashboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drr-cp8-top-defects', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    let rangeStart, rangeEnd;
    if (startTime && endTime) {
      rangeStart = startTime;
      rangeEnd = endTime;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      rangeStart = `${y}-${m}-${d} 00:00:00`;
      rangeEnd = `${y}-${m}-${d} 23:59:59`;
    }

    // 1. VIN, прошедшие CP72 (MES)
    const [cp72Rows] = await mesPool.query(`
      SELECT DISTINCT vin
      FROM ti_mes_movement
      WHERE uloc_no = 'CP72'
        AND scan_time >= ?
        AND scan_time < ?
    `, [rangeStart, rangeEnd]);

    if (cp72Rows.length === 0) return res.json([]);

    const vins = cp72Rows.map(r => r.vin);
    const placeholders = vins.map(() => '?').join(',');

    // 2. Дефекты по расширенному списку постов
    const defectPosts = [
      'TLTT','CP8','TLADAS','TLWA','TLRT','CPA',
      'CP8 Gate','CP8-gate','360','ADAS','ADAS+RB',
      'TEST TRACK','TRACK','WA','WT','CP8 Touch Up'
    ];
    const defectPostsStr = defectPosts.map(p => `'${p}'`).join(',');

    const [defectRows] = await pool.query(`
      SELECT
        d.VIN,
        wo.MODEL,
        d.PART_NAME,
        d.PROBLEM_TYPE,
        d.PROBLEM_GRADE,
        d.STATUS
      FROM at_qm_defect_info d
      LEFT JOIN work_order wo ON wo.VIN = d.VIN
      WHERE d.POST_NAME IN (${defectPostsStr})
        AND d.CREATION_TIME >= ?
        AND d.CREATION_TIME < ?
        AND d.VIN IN (${placeholders})
    `, [rangeStart, rangeEnd, ...vins]);

    // 3. Находим VIN, у которых есть хотя бы один не closed дефект
    const openVins = new Set();
    defectRows.forEach(row => {
      if (!row.STATUS || row.STATUS.toLowerCase() !== 'closed') {
        openVins.add(row.VIN);
      }
    });

    // 4. Группируем дефекты только для этих VIN
    const defectGroupMap = new Map();
    defectRows.forEach(row => {
      if (!openVins.has(row.VIN)) return;
      const mpp = `${row.MODEL || '-'} ${row.PART_NAME || ''} ${row.PROBLEM_TYPE || ''}`.trim();
      if (!defectGroupMap.has(mpp)) {
        defectGroupMap.set(mpp, {
          mpp,
          grade: row.PROBLEM_GRADE || '-',
          affectedVins: new Set(),
        });
      }
      defectGroupMap.get(mpp).affectedVins.add(row.VIN);
    });

    const topDefects = Array.from(defectGroupMap.values())
      .map(d => ({
        mpp: d.mpp,
        grade: d.grade,
        affectedVins: d.affectedVins.size,
      }))
      .sort((a, b) => b.affectedVins - a.affectedVins)
      .slice(0, 20);

    res.json(topDefects);
  } catch (err) {
    console.error('Ошибка DRR CP8 Top Defects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Эндпоинт для DRR Testline Dashboard
app.get('/api/drr-tl-dashboard', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime и endTime обязательны' });
    }

    // 1. Все VIN, прошедшие TLADAS за период
    const [tladRows] = await mesPool.query(`
      SELECT DISTINCT VIN
      FROM tm_vhc_test_line_movement
      WHERE node_nature = 'TLADAS'
        AND gmt_create >= ? AND gmt_create <= ?
        AND is_deleted = 0
    `, [startTime, endTime]);

    if (tladRows.length === 0) {
      return res.json({ totalVins: 0, closedVins: 0, drrPercent: 0, topDefects: [] });
    }

    const vins = tladRows.map(r => r.VIN);

    // 2. Получаем все движения этих VIN
    const placeholders = vins.map(() => '?').join(',');
    const [allMovements] = await mesPool.query(`
      SELECT VIN, node_nature, gmt_create
      FROM tm_vhc_test_line_movement
      WHERE VIN IN (${placeholders})
        AND is_deleted = 0
      ORDER BY VIN, gmt_create ASC
    `, vins);

    const movementsByVin = {};
    vins.forEach(vin => { movementsByVin[vin] = []; });
    allMovements.forEach(row => {
      movementsByVin[row.VIN].push({ zone: row.node_nature, time: new Date(row.gmt_create) });
    });

    // 3. Определяем OK/NOK
    let closedVins = 0;
    const nokVinsSet = new Set(); // VIN с не OK

    for (const vin of vins) {
      const moves = movementsByVin[vin] || [];
      // Найти первое TLADAS в периоде
      let tladIndex = -1;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].zone === 'TLADAS' && moves[i].time >= new Date(startTime) && moves[i].time <= new Date(endTime)) {
          tladIndex = i;
          break;
        }
      }
      if (tladIndex === -1) continue;

      // Следующая запись после TLADAS
      let next = null;
      if (tladIndex + 1 < moves.length) {
        next = moves[tladIndex + 1];
      }

      if (next && next.zone === 'TLTT') {
        closedVins++;
      } else {
        nokVinsSet.add(vin);
      }
    }

    const totalVins = vins.length;
    const drrPercent = totalVins > 0 ? (closedVins / totalVins) * 100 : 0;

    // 4. Топ дефектов для NOK VIN на указанных постах
    let topDefects = [];
    if (nokVinsSet.size > 0) {
      const nokPlaceholders = [...nokVinsSet].map(() => '?').join(',');
      const defectPosts = ['360','ADAS','ADAS+RB','WA'];
      const defectPostsStr = defectPosts.map(p => `'${p}'`).join(',');

      const [defectRows] = await pool.query(`
        SELECT
          d.VIN,
          wo.MODEL,
          d.PART_NAME,
          d.PROBLEM_TYPE,
          d.PROBLEM_GRADE
        FROM at_qm_defect_info d
        LEFT JOIN work_order wo ON wo.VIN = d.VIN
        WHERE d.VIN IN (${nokPlaceholders})
          AND d.POST_NAME IN (${defectPostsStr})
          AND d.CREATION_TIME >= ? AND d.CREATION_TIME <= ?
      `, [...nokVinsSet, startTime, endTime]);

      const defectGroupMap = new Map();
      defectRows.forEach(row => {
        const mpp = `${row.MODEL || '-'} ${row.PART_NAME || ''} ${row.PROBLEM_TYPE || ''}`.trim();
        if (!defectGroupMap.has(mpp)) {
          defectGroupMap.set(mpp, {
            mpp,
            grade: row.PROBLEM_GRADE || '-',
            affectedVins: new Set(),
          });
        }
        defectGroupMap.get(mpp).affectedVins.add(row.VIN);
      });

      topDefects = Array.from(defectGroupMap.values())
        .map(d => ({
          mpp: d.mpp,
          grade: d.grade,
          affectedVins: d.affectedVins.size,
        }))
        .sort((a, b) => b.affectedVins - a.affectedVins)
        .slice(0, 20);
    }

    res.json({
      totalVins,
      closedVins,
      drrPercent: Math.round(drrPercent * 10) / 10,
      topDefects,
    });
  } catch (err) {
    console.error('Ошибка DRR TL Dashboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drr-tl-top-defects', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime и endTime обязательны' });
    }

    // 1. VIN, прошедшие TLADAS за период
    const [tladRows] = await mesPool.query(`
      SELECT DISTINCT VIN
      FROM tm_vhc_test_line_movement
      WHERE node_nature = 'TLADAS'
        AND gmt_create >= ? AND gmt_create <= ?
        AND is_deleted = 0
    `, [startTime, endTime]);

    if (tladRows.length === 0) {
      return res.json([]);
    }

    const vins = tladRows.map(r => r.VIN);
    const placeholders = vins.map(() => '?').join(',');

    // 2. Все движения этих VIN
    const [allMovements] = await mesPool.query(`
      SELECT VIN, node_nature, gmt_create
      FROM tm_vhc_test_line_movement
      WHERE VIN IN (${placeholders})
        AND is_deleted = 0
      ORDER BY VIN, gmt_create ASC
    `, vins);

    const movementsByVin = {};
    vins.forEach(vin => { movementsByVin[vin] = []; });
    allMovements.forEach(row => {
      movementsByVin[row.VIN].push({ zone: row.node_nature, time: new Date(row.gmt_create) });
    });

    // 3. Определяем NOK VIN (после TLADAS не TLTT, а REP или нет следующего движения)
    const nokVinsSet = new Set();
    for (const vin of vins) {
      const moves = movementsByVin[vin] || [];
      let tladIndex = -1;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].zone === 'TLADAS' && moves[i].time >= new Date(startTime) && moves[i].time <= new Date(endTime)) {
          tladIndex = i;
          break;
        }
      }
      if (tladIndex === -1) continue;

      let next = null;
      if (tladIndex + 1 < moves.length) {
        next = moves[tladIndex + 1];
      }

      // OK только если следующая зона TLTT, иначе NOK
      if (!(next && next.zone === 'TLTT')) {
        nokVinsSet.add(vin);
      }
    }

    if (nokVinsSet.size === 0) {
      return res.json([]);
    }

    // 4. Дефекты для NOK VIN на указанных постах (только незакрытые)
    const nokPlaceholders = [...nokVinsSet].map(() => '?').join(',');
    const defectPosts = [
      'CP7', 'CP7 Audit', 'CP7 Gate', 'CP7-gate',
      'REPAIR', 'REPAIR_Final',
      'EXT1', 'PIP1', 'PIP2', 'PIP4', 'PIP5', 'PIP6', 'PIP8', 'PIP9',
      'CP8 Touch Up', '360', 'ADAS', 'ADAS+RB',
      'TEST TRACK', 'TRACK', 'WA'
    ];
    const defectPostsStr = defectPosts.map(p => `'${p}'`).join(',');

    const [defectRows] = await pool.query(`
      SELECT
        d.VIN,
        wo.MODEL,
        d.PART_NAME,
        d.PROBLEM_TYPE,
        d.PROBLEM_GRADE,
        d.STATUS
      FROM at_qm_defect_info d
      LEFT JOIN work_order wo ON wo.VIN = d.VIN
      WHERE d.VIN IN (${nokPlaceholders})
        AND d.POST_NAME IN (${defectPostsStr})
        AND d.CREATION_TIME >= ? AND d.CREATION_TIME <= ?
    `, [...nokVinsSet, startTime, endTime]);

    // 5. Оставляем только незакрытые дефекты и группируем по MPP
    const defectGroupMap = new Map();
    defectRows.forEach(row => {
      // Пропускаем закрытые дефекты
      if (row.STATUS && row.STATUS.toLowerCase() === 'closed') return;

      const mpp = `${row.MODEL || '-'} ${row.PART_NAME || ''} ${row.PROBLEM_TYPE || ''}`.trim();
      if (!defectGroupMap.has(mpp)) {
        defectGroupMap.set(mpp, {
          mpp,
          grade: row.PROBLEM_GRADE || '-',
          defectCount: 0,
        });
      }
      defectGroupMap.get(mpp).defectCount += 1;
    });

    const topDefects = Array.from(defectGroupMap.values())
      .map(d => ({
        mpp: d.mpp,
        grade: d.grade,
        defectCount: d.defectCount,
      }))
      .sort((a, b) => b.defectCount - a.defectCount)
      .slice(0, 20);

    res.json(topDefects);
  } catch (err) {
    console.error('Ошибка DRR TL Top Defects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== ЗАМЕТКИ ==================

// Получение всех заметок
app.get('/api/defect-notes', async (req, res) => {
  try {
    const [rows] = await notesPool.query(
      'SELECT * FROM defect_user_notes ORDER BY updated_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения заметок:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Сохранение или обновление заметки
app.post('/api/defect-notes', async (req, res) => {
  try {
    const { mpp, responsible, action } = req.body;
    if (!mpp) return res.status(400).json({ error: 'mpp обязателен' });

    // Проверяем существует ли запись
    const [existing] = await notesPool.query(
      'SELECT id FROM defect_user_notes WHERE mpp = ? LIMIT 1',
      [mpp]
    );

    if (existing.length > 0) {
      // Обновляем существующую
      await notesPool.query(
        'UPDATE defect_user_notes SET responsible = ?, action = ?, updated_at = CURRENT_TIMESTAMP WHERE mpp = ?',
        [responsible || '', action || '', mpp]
      );
    } else {
      // Вставляем новую
      await notesPool.query(
        'INSERT INTO defect_user_notes (mpp, responsible, action) VALUES (?, ?, ?)',
        [mpp, responsible || '', action || '']
      );
    }

    // Возвращаем обновленную запись
    const [updated] = await notesPool.query(
      'SELECT * FROM defect_user_notes WHERE mpp = ? LIMIT 1',
      [mpp]
    );

    res.json({ success: true, note: updated[0] || null });
  } catch (err) {
    console.error('Ошибка сохранения заметки:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Удаление заметки (опционально)
app.delete('/api/defect-notes/:mpp', async (req, res) => {
  try {
    const { mpp } = req.params;
    if (!mpp) return res.status(400).json({ error: 'mpp обязателен' });

    await notesPool.query(
      'DELETE FROM defect_user_notes WHERE mpp = ?',
      [mpp]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления заметки:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 40000;

async function startServer() {
  const dbOk = await checkDatabaseConnection();
  const notesOk = await checkNotesDatabaseConnection();
  const lesOk = await checkLesDatabaseConnection();

  if (!dbOk || !notesOk || !lesOk) {
    console.log('Сервер НЕ запущен из-за проблем с БД.');
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
 });
}

startServer();