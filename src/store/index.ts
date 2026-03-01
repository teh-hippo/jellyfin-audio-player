import { drizzle } from 'drizzle-orm/op-sqlite';
import { open } from '@op-engineering/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import migrations from './database/migrations/migrations.js';
import { relations } from './database/relations';

// Open the SQLite database
export const sqliteDb = open({
    name: 'fintunes.db',
    location: '../databases',
});

// Create drizzle instance with v2 relations — exported as singleton
export const db = drizzle(sqliteDb, { relations });

/**
 * Run database migrations
 * Migrations should be generated using drizzle-kit
 */
export async function runMigrations() {
    try {
        await migrate(db, migrations);
        console.log('Database migrations completed');
    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    }
}

/**
 * Initialize the database
 */
export async function initializeDatabase() {
    await runMigrations();
    return db;
}