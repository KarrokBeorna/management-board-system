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


// ================== MODEL STATUS – DRR (MES) – обновлённый ==================
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
        periodsMap[p] = { period: p, target: 80, values: {} }; // цель DRR = 80
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

// ================== MODEL STATUS – DPU CP8 (OFFLINE, CPFINAL) – обновлённый ==================
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
        WHERE aowth.WC_NAME = 'CPFINAL'
        GROUP BY aowth.MODEL, CREATION_TIME
      ) CARS
      GROUP BY MODEL, PERIOD
      ORDER BY PERIOD, MODEL
    `;

    const [rows] = await pool.query(sql, [dateFormat]);

    const periodsMap = {};
    rows.forEach(row => {
      const p = row.PERIOD;
      if (!periodsMap[p]) {
        periodsMap[p] = { period: p, target: 2, values: {} };
      }
      periodsMap[p].values[row.MODEL] = row.DPU;
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

// ================== MODEL STATUS – DRR CP7 (исправленный) ==================
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
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'   -- ← ЗАМЕНИТЕ НА ВАШ УЗЕЛ
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
        WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'   -- ← тот же узел
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

    // По умолчанию 3 месяца / 4 недели / 7 дней, если count не передан
    const defaultCount = period === 'month' ? 3 : period === 'week' ? 4 : 7;
    const limit = parseInt(count, 10) || defaultCount;

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
        WHERE aowth.WC_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9')
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
        AND aowth.WC_NAME IN ('CP7', 'CP7 Gate', 'CP78', 'CP79', 'EXT1', 'PIP2', 'PIP4', 'PIP9')
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
      WHERE tvvm.node_nature = 'Key_Uloc_Type_CP7'   -- ← ваш узел CP7!
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