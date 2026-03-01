import { useLiveQuery } from '@/store/live-queries';
import { db } from '@/store';

export function useDownloads(sourceId?: string) {
    return useLiveQuery(
        db.query.downloads.findMany({
            where: sourceId ? { sourceId } : undefined,
        })
    );
}

export function useDownload([sourceId, trackId]: [sourceId: string, trackId: string]) {
    return useLiveQuery(
        db.query.downloads.findFirst({
            where: { sourceId, id: trackId },
        })
    );
}
