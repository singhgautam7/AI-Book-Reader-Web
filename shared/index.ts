export type Book = {
    id: string;
    title: string;
    author?: string;
    uploadDate: string;
    fileType: 'pdf' | 'epub' | 'link';
    totalChunks: number;
    provider?: 'browser' | 'gemini' | 'openai' | 'elevenlabs';
    fileSize?: number;
    url?: string;
    sourceDomain?: string;
    lastPlayedAt?: string;
    history?: {
        playedAt: string;
        provider: string;
    }[];
};

export type TextChunk = {
    id: string;
    bookId: string;
    content: string;
    index: number;
};
