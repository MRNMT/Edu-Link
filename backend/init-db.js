import mysql from 'mysql2/promise';
import fs from 'fs';
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
};

const databaseName = process.env.MYSQL_DATABASE || 'guardian_link_local';

async function initDatabase() {
  let connection;
  try {
    console.log(`Connecting to MySQL at ${connectionConfig.host}:${connectionConfig.port}...`);
    connection = await mysql.createConnection(connectionConfig);
    console.log('✓ Connected to MySQL');

    // Create database if it doesn't exist
    console.log(`Creating database '${databaseName}' if it doesn't exist...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
    console.log(`✓ Database '${databaseName}' ready`);

    // Close and reconnect to the specific database
    await connection.end();
    
    const dbConnection = await mysql.createConnection({
      ...connectionConfig,
      database: databaseName,
    });
    console.log(`✓ Connected to database '${databaseName}'`);

    // Read and execute SQL file
    const sqlFilePath = path.join(__dirname, 'sql', 'mysql_pass_system.sql');
    console.log(`Reading SQL file from ${sqlFilePath}...`);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found at ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await dbConnection.execute(stmt);
        if (i % 10 === 0) {
          console.log(`  Executed ${i + 1}/${statements.length} statements`);
        }
      } catch (error) {
        // Skip errors for now, some statements might fail if they already exist
        console.log(`  ⚠ Statement ${i + 1} warning: ${error.message.substring(0, 80)}`);
      }
    }

    console.log(`✓ Database initialization complete`);
    
    // Verify data was inserted
    const [users] = await dbConnection.execute('SELECT COUNT(*) as count FROM users');
    const [children] = await dbConnection.execute('SELECT COUNT(*) as count FROM children');
    
    console.log(`\nDatabase Status:`);
    console.log(`  Users: ${users[0].count}`);
    console.log(`  Children: ${children[0].count}`);
    
    await dbConnection.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

initDatabase();
