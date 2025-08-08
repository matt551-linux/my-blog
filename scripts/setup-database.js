// scripts/setup-database.js - Database initialization script
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Setting up database...');

    // Read and execute the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully');

    // Create initial admin user (you'll need to hash the password)
    await pool.query(`
      INSERT INTO users (email, name, password) 
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
    `, [
      process.env.ADMIN_EMAIL || 'admin@example.com',
      process.env.ADMIN_NAME || 'Admin',
      process.env.ADMIN_PASSWORD || 'change-me-please'
    ]);

    console.log('✅ Admin user created');
    console.log('🎉 Database setup complete!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch(console.error);



