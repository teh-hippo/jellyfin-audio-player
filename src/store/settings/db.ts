import { db } from '@/store';
import type { AppSettings } from './types';

/**
 * Read the current app settings row from the database.
 * Returns null when the row is missing (e.g. very first launch before initialisation).
 */
export async function getSettings(): Promise<AppSettings | null> {
    return await db.query.settings.findFirst({ where: { id: 1 } }) ?? null;
}
