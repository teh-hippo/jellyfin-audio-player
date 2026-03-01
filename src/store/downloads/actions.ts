import { db, sqliteDb } from '@/store';
import { and, eq } from 'drizzle-orm';
import downloads from './entity';
import type { EntityId } from '@/store/types';

export async function getAllDownloads() {
    return db.query.downloads.findMany();
}

export async function getDownload([sourceId, id]: EntityId) {
    return db.query.downloads.findFirst({
        where: { sourceId, id },
    });
}

export interface InitializeDownloadParams {
    hash?: string;
    filename?: string;
    mimetype?: string;
    fileSize?: number;
}

export async function initializeDownload(
    [sourceId, id]: EntityId,
    {
        hash,
        filename,
        mimetype,
        fileSize,
    }: InitializeDownloadParams = {}
): Promise<void> {
    await db.insert(downloads).values({
        sourceId,
        id,
        hash: hash ?? null,
        filename: filename,
        mimetype: mimetype,
        fileSize: fileSize ?? null,
        progress: 0,
        isFailed: false,
        isComplete: false,
        metadata: null,
    }).onConflictDoUpdate({
        target: downloads.id,
        set: {
            hash: hash ?? null,
            filename: filename,
            mimetype: mimetype,
            fileSize: fileSize ?? null,
            progress: 0,
            isFailed: false,
            isComplete: false,
        },
    });

    await sqliteDb.flushPendingReactiveQueries();
}

export async function updateDownloadProgress(
    [sourceId, id]: EntityId,
    progress: number,
): Promise<void> {
    await db.update(downloads)
        .set({ progress })
        .where(and(eq(downloads.sourceId, sourceId), eq(downloads.id, id)));

    await sqliteDb.flushPendingReactiveQueries();
}

export interface CompleteDownloadParams {
    filename?: string;
    fileSize?: number;
    artworkPath?: string;
}

export async function completeDownload(
    [sourceId, id]: EntityId,
    {
        filename,
        fileSize,
        artworkPath,
    }: CompleteDownloadParams = {}
): Promise<void> {
    const updates: Partial<typeof downloads.$inferInsert> = {
        isComplete: true,
        isFailed: false,
        progress: 1,
    };

    if (filename) updates.filename = filename;
    if (fileSize != null) updates.fileSize = fileSize;
    if (artworkPath) updates.artworkPath = artworkPath;

    await db.update(downloads)
        .set(updates)
        .where(and(eq(downloads.sourceId, sourceId), eq(downloads.id, id)));

    await sqliteDb.flushPendingReactiveQueries();
}

export async function failDownload([sourceId, id]: EntityId): Promise<void> {
    await db.update(downloads)
        .set({
            isFailed: true,
            isComplete: false,
            progress: 0,
        })
        .where(and(eq(downloads.sourceId, sourceId), eq(downloads.id, id)));

    await sqliteDb.flushPendingReactiveQueries();
}

export async function removeDownload([sourceId, id]: EntityId): Promise<void> {
    await db.delete(downloads)
        .where(and(eq(downloads.sourceId, sourceId), eq(downloads.id, id)));

    await sqliteDb.flushPendingReactiveQueries();
}
