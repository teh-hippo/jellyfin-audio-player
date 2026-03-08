import { db, sqliteDb } from '@/store';
import { and, eq, isNull } from 'drizzle-orm';

import syncCursors from './entity';
import { EntityType, type SyncCursor } from './types';

export async function getIncompleteCursors(): Promise<SyncCursor[]> {
    return db.select().from(syncCursors).where(eq(syncCursors.completed, false)).all();
}

export async function createCursorIfNotExists(
    sourceId: string,
    entityType: EntityType,
    parentEntityId?: string,
    parentEntityType?: string,
    pageSize: number = 500,
) {
    console.log('Creating cursor', { sourceId, entityType, parentEntityId, parentEntityType });

    await db.insert(syncCursors).values({
        sourceId,
        entityType,
        parentEntityId,
        parentEntityType,
        startIndex: 0,
        pageSize,
        completed: false,
    }).onConflictDoNothing();

    await sqliteDb.flushPendingReactiveQueries();

    console.log('Inserted cursor');

    const cursor = await db.select().from(syncCursors).where(and(
        eq(syncCursors.sourceId, sourceId),
        eq(syncCursors.entityType, entityType),
        parentEntityId !== undefined ? eq(syncCursors.parentEntityId, parentEntityId) : isNull(syncCursors.parentEntityId),
        parentEntityType !== undefined ? eq(syncCursors.parentEntityType, parentEntityType) : isNull(syncCursors.parentEntityType),
    )).get();

    console.log('Retrieved cursor', cursor);

    return cursor;
}

export async function updateCursorOffset(
    sourceId: string,
    entityType: EntityType,
    newOffset: number,
    parentEntityId?: string,
): Promise<void> {
    await db.update(syncCursors)
        .set({ startIndex: newOffset, updatedAt: Date.now() })
        .where(and(
            eq(syncCursors.sourceId, sourceId),
            eq(syncCursors.entityType, entityType),
            parentEntityId !== undefined ? eq(syncCursors.parentEntityId, parentEntityId) : isNull(syncCursors.parentEntityId),
        ));
}

export async function markCursorComplete(
    sourceId: string,
    entityType: EntityType,
    parentEntityId?: string,
): Promise<void> {
    await db.update(syncCursors)
        .set({ completed: true, updatedAt: Date.now() })
        .where(and(
            eq(syncCursors.sourceId, sourceId),
            eq(syncCursors.entityType, entityType),
            parentEntityId !== undefined ? eq(syncCursors.parentEntityId, parentEntityId) : isNull(syncCursors.parentEntityId),
        ));
}