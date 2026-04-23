require('dotenv').config();
const sql = require('mssql');
const axios = require('axios');
const cron = require('node-cron');

// SQL 設定
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// 查昨天營業額
async function getYesterdaySales() {
  await sql.connect(dbConfig);

  const result = await sql.query(`
    SELECT SUM(stamt) AS total
    FROM gzd16
    WHERE sdate = CONVERT(VARCHAR(8), DATEADD(DAY, -1, GETDATE()), 112)
  `);

  return result.recordset[0].total || 0;
}

// 傳 LINE
async function sendToLine(message) {
  await axios.post(
    "https://notify-api.line.me/api/notify",
    new URLSearchParams({ message }),
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_TOKEN}`
      }
    }
  );
}

// 主程式
async function job() {
  try {
    const total = await getYesterdaySales();

    const msg = `📊 昨日營業額\n💰 ${Number(total).toLocaleString()} 元`;

    await sendToLine(msg);

    console.log("✅ 已發送:", msg);
  } catch (err) {
    console.error("❌ 錯誤:", err.message);
  }
}

// 每天早上 9 點執行
cron.schedule('0 10 * * *', () => {
  console.log("⏰ 執行排程");
  job();
});

// 測試用（啟動就跑一次）
job();
