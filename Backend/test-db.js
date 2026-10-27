
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();

async function testConnection() {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATABASE() AS database_name,
        COUNT(*) AS customer_count
      FROM customer
    `);

    console.log("MySQL connected successfully!");
    console.log(rows[0]);
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
