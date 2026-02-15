export type Book = {
    id: string;
    title: string;
    author?: string;
    uploadDate: string;
    fileType: 'pdf' | 'epub';
    totalChunks: number;
};

export type TextChunk = {
    id: string;
    bookId: string;
    content: string;
    index: number;
};
