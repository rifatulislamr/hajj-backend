import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testDatabaseConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database!');
    client.release();
  } catch (err) {
    console.error('❌ Database connection error:', (err as Error).message);
    throw err;
  }
}

export const db = drizzle(pool);
export { pool };


// // src/config/database.ts
// import dotenv from 'dotenv';
// import mysql from 'mysql2/promise';
// import { drizzle } from 'drizzle-orm/mysql2';
// import * as schema from '../schemas';

// dotenv.config();

// // Define the connection configuration type
// interface DbConfig {
//   host: string;
//   user: string;
//   password: string;
//   database: string;
//   port: number;
  
// }

// // Create the connection configuration object
// const dbConfig: DbConfig = {
//   host: process.env.DB_HOST || '',
//   user: process.env.DB_USER || '',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || '',
//   port: parseInt(process.env.DB_PORT || '3306', 10),
  
// };

// // Create a connection pool instead of a single connection
// const pool = mysql.createPool({
//   ...dbConfig,
//   connectionLimit: 10, // Adjust this value based on your needs
//   waitForConnections: true,
//   queueLimit: 0,
// });

// // Create and export the Drizzle ORM instance
// export const db = drizzle(pool, { schema, mode: 'default' });

// // Test the database connection
// export async function testDatabaseConnection(): Promise<void> {
//   try {
//     const connection = await pool.getConnection();
//     console.log('Connected to the MySQL database!');
//     connection.release();
//   } catch (err) {
//     console.error('Error connecting to the database:', (err as Error).message);
//     throw err;
//   }
// }

// // Export the pool for direct usage if needed
// export { pool };