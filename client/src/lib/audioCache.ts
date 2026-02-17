import { openDB, type DBSchema } from 'idb';

interface AudioCacheSchema extends DBSchema {
    audio: {
        key: string;
        value: {
            key: string;
            audio: ArrayBuffer;
            timestamp: number;
            provider: string;
        };
    };
}

const DB_NAME = 'tts-audio-cache';
const STORE_NAME = 'audio';
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getDB() {
    return openDB<AudioCacheSchema>(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        },
    });
}

export async function generateCacheKey(provider: string, text: string, options: any): Promise<string> {
    const data = JSON.stringify({ provider, text, options });
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${provider}_${hashHex}`;
}

export async function getCachedAudio(key: string): Promise<ArrayBuffer | null> {
    try {
        const db = await getDB();
        const entry = await db.get(STORE_NAME, key);

        if (!entry) return null;

        // Check TTL
        if (Date.now() - entry.timestamp > MAX_CACHE_AGE) {
            await db.delete(STORE_NAME, key);
            return null;
        }

        return entry.audio;
    } catch (error) {
        console.warn('Failed to read from audio cache:', error);
        return null;
    }
}

export async function setCachedAudio(key: string, audio: ArrayBuffer, provider: string): Promise<void> {
    try {
        const db = await getDB();
        await db.put(STORE_NAME, {
            key,
            audio,
            timestamp: Date.now(),
            provider
        });
    } catch (error) {
        console.warn('Failed to write to audio cache:', error);
    }
}

export async function clearOldCache(): Promise<void> {
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        let cursor = await store.openCursor();

        const now = Date.now();
        while (cursor) {
            if (now - cursor.value.timestamp > MAX_CACHE_AGE) {
                await cursor.delete();
            }
            cursor = await cursor.continue();
        }
        await tx.done;
    } catch (error) {
        console.error('Failed to clear old cache:', error);
    }
}
