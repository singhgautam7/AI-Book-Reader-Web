import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book } from '@ai-book-reader/shared';

interface BookState {
    books: Book[];
    currentBookId: string | null;
    playbackProgress: Record<string, number>; // chunk index per book
    addBook: (book: Book) => void;
    removeBook: (bookId: string) => void;
    updateProgress: (bookId: string, chunkIndex: number) => void;
    setCurrentBook: (bookId: string) => void;
    recordPlayback: (bookId: string, provider: string) => void;
}

export const useBookStore = create<BookState>()(
    persist(
        (set) => ({
            books: [],
            currentBookId: null,
            playbackProgress: {},

            addBook: (book) =>
                set((state) => {
                    // Check for existing book by title + size
                    const existingBook = state.books.find(
                        (b) => b.title === book.title && b.fileSize === book.fileSize
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
                                    lastPlayedAt: book.lastPlayedAt || b.lastPlayedAt
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

            removeBook: (bookId) =>
                set((state) => ({
                    books: state.books.filter((b) => b.id !== bookId),
                    playbackProgress: (() => {
                        const { [bookId]: _, ...rest } = state.playbackProgress;
                        return rest;
                    })(),
                })),

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
