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

async function checkDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);

    console.log('\n=== Schools ===');
    const [schools] = await connection.execute('SELECT id, name, code FROM schools');
    console.table(schools);

    console.log('\n=== Admin User ===');
    const [adminUser] = await connection.execute(
      'SELECT id, full_name, email, role, school_id FROM users WHERE email = ? LIMIT 1',
      ['admin@demo.school']
    );
    console.table(adminUser);

    if (adminUser.length > 0) {
      const schoolId = adminUser[0].school_id;

      console.log(`\n=== Children for School ID ${schoolId} ===`);
      const [children] = await connection.execute(
        'SELECT id, full_name, class_name, grade, school_id FROM children WHERE school_id = ?',
        [schoolId]
      );
      console.table(children);

      console.log(`\n=== Teachers for School ID ${schoolId} ===`);
      const [teachers] = await connection.execute(
        'SELECT id, full_name, email, role, school_id FROM users WHERE role = ? AND school_id = ?',
        ['teacher', schoolId]
      );
      console.table(teachers);

      console.log(`\n=== All Users ===`);
      const [allUsers] = await connection.execute(
        'SELECT id, full_name, email, role, school_id FROM users'
      );
      console.table(allUsers);
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
