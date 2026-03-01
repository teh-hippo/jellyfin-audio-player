import { db, sqliteDb } from '@/store';
import { and, eq } from 'drizzle-orm';

import syncCursors from './entity';
import { EntityType, type SyncCursor } from './types';

export async function getIncompleteCursors(): Promise<SyncCursor[]> {
    return db.query.syncCursors.findMany({
        where: { completed: false },
    });
}

export async function createCursorIfNotExists(
    sourceId: string,
    entityType: EntityType,
    parentEntityId: string = '',
    parentEntityType: EntityType | null = null,
    pageSize: number = 500,
): Promise<void> {
    await db.insert(syncCursors).values({
        sourceId,
        entityType,
        parentEntityId,
        parentEntityType,
        startIndex: 0,
        pageSize,
        completed: false,
        updatedAt: Date.now(),
    }).onConflictDoNothing();

    sqliteDb.flushPendingReactiveQueries();
}

export async function updateCursorOffset(
    sourceId: string,
    entityType: EntityType,
    newOffset: number,
    parentEntityId: string = '',
): Promise<void> {
    await db.update(syncCursors)
        .set({ startIndex: newOffset, updatedAt: Date.now() })
        .where(and(
            eq(syncCursors.sourceId, sourceId),
            eq(syncCursors.entityType, entityType),
            eq(syncCursors.parentEntityId, parentEntityId),
        ));
}

export async function markCursorComplete(
    sourceId: string,
    entityType: EntityType,
    parentEntityId: string = '',
): Promise<void> {
    await db.update(syncCursors)
        .set({ completed: true, updatedAt: Date.now() })
        .where(and(
            eq(syncCursors.sourceId, sourceId),
            eq(syncCursors.entityType, entityType),
            eq(syncCursors.parentEntityId, parentEntityId),
        ));
}
