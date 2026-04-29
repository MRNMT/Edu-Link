import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'bella',
  database: process.env.MYSQL_DATABASE || 'guardian_link_local',
};

async function checkTableStructure() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);

    console.log('\n=== Users Table Structure ===');
    const [columns] = await connection.execute(
      'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      ['guardian_link_local', 'users']
    );
    console.table(columns);

    console.log('\n=== Test SELECT from users table ===');
    try {
      const [rows] = await connection.execute(
        'SELECT id, full_name, email, role, school_id FROM users WHERE school_id = ? LIMIT 1',
        [1]
      );
      console.log('Basic SELECT works:', rows);
    } catch (err) {
      console.log('Error on basic SELECT:', err.message);
    }

    console.log('\n=== Test SELECT with all columns from endpoint ===');
    try {
      const [rows] = await connection.execute(
        `SELECT id, full_name, email, role, school_id, teacher_identifier, is_active, created_at
         FROM users
         WHERE school_id = ? AND role = 'teacher'
         ORDER BY created_at DESC`,
        [1]
      );
      console.log('Teachers SELECT works:', rows);
    } catch (err) {
      console.log('Error on teachers SELECT:', err.message);
    }

    await connection.end();
  } catch (error) {
    console.error('Connection Error:', error.message);
    process.exit(1);
  }
}

checkTableStructure();
