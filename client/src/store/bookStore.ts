import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book, TextChunk } from '@ai-book-reader/shared';

interface BookState {
    books: Book[];
    bookChunks: Record<string, TextChunk[]>;
    currentBookId: string | null;
    playbackProgress: Record<string, number>; // chunk index per book
    addBook: (book: Book) => void;
    setChunks: (bookId: string, chunks: TextChunk[]) => void;
    getChunks: (bookId: string) => TextChunk[] | undefined;
    removeBook: (bookId: string) => void;
    updateProgress: (bookId: string, chunkIndex: number) => void;
    setCurrentBook: (bookId: string) => void;
    recordPlayback: (bookId: string, provider: string) => void;
}

export const useBookStore = create<BookState>()(
    persist(
        (set, get) => ({
            books: [],
            bookChunks: {},
            currentBookId: null,
            playbackProgress: {},

            addBook: (book) =>
                set((state) => {
                    // Check for existing book by title + size OR url
                    const existingBook = state.books.find(
                        (b) => {
                            if (book.fileType === 'link' && book.url && b.url) {
                                return b.url === book.url;
                            }
                            return b.title === book.title && b.fileSize === book.fileSize;
                        }
                    );

                    if (existingBook) {
                        // If exists, just move to top and update lastPlayedAt if provided
                        // (Usually addBook is called on upload, so we might want to update uploadDate too?
                        //  User said: "If this ID already exists -> do NOT create a new entry.")
                        //  But user also said: "Update lastPlayedAt when Reader is opened from upload flow")

                        // We'll update the existing book entry
                        const updatedBooks = state.books.map(b => {
                            if (b.id === existingBook.id) {
                                return {
                                    ...b,
                                    // Preserve existing history/stats
                                    // Update lastPlayedAt if the new book object has it (e.g. from handleProceed)
                                    // Update lastPlayedAt if the new book object has it
                                    lastPlayedAt: book.lastPlayedAt || b.lastPlayedAt,
                                    url: book.url || b.url, // Ensure URL is preserved/updated
                                    sourceDomain: book.sourceDomain || b.sourceDomain
                                };
                            }
                            return b;
                        });

                        // Move to top
                        return {
                            books: [
                                updatedBooks.find(b => b.id === existingBook.id)!,
                                ...updatedBooks.filter(b => b.id !== existingBook.id)
                            ]
                        };
                    }

                    // New book
                    return {
                        books: [book, ...state.books],
                    };
                }),

            recordPlayback: (bookId, provider) =>
                set((state) => {
                    const now = new Date().toISOString();
                    return {
                        books: state.books.map((b) => {
                            if (b.id === bookId) {
                                const newHistory = [
                                    { playedAt: now, provider },
                                    ...(b.history || [])
                                ].slice(0, 50); // Keep last 50

                                return {
                                    ...b,
                                    lastPlayedAt: now,
                                    history: newHistory,
                                    provider: provider as any // Update last used provider
                                };
                            }
                            return b;
                        }),
                    };
                }),

            setChunks: (bookId, chunks) =>
                set((state) => ({
                    bookChunks: {
                        ...state.bookChunks,
                        [bookId]: chunks,
                    },
                })),

            getChunks: (bookId) => get().bookChunks[bookId],

            removeBook: (bookId) =>
                set((state) => {
                    const { [bookId]: _p, ...restProgress } = state.playbackProgress;
                    const { [bookId]: _c, ...restChunks } = state.bookChunks;
                    return {
                        books: state.books.filter((b) => b.id !== bookId),
                        playbackProgress: restProgress,
                        bookChunks: restChunks,
                    };
                }),

            updateProgress: (bookId, chunkIndex) =>
                set((state) => ({
                    playbackProgress: {
                        ...state.playbackProgress,
                        [bookId]: chunkIndex,
                    },
                })),

            setCurrentBook: (bookId) => set({ currentBookId: bookId }),
        }),
        {
            name: 'book-storage',
        }
    )
);
