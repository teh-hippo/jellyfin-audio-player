import { db } from '@/store';
import type { SleepTimer } from './types';

/**
 * Read the current sleep timer row from the database.
 * Returns null when no timer has been set yet.
 */
export async function getSleepTimer(): Promise<SleepTimer | null> {
    return await db.query.sleepTimer.findFirst({ where: { id: 1 } }) ?? null;
}