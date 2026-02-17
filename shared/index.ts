export type Book = {
    id: string;
    title: string;
    author?: string;
    uploadDate: string;
    fileType: 'pdf' | 'epub';
    totalChunks: number;
    provider?: 'browser' | 'gemini' | 'openai' | 'elevenlabs';
    fileSize?: number;
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
