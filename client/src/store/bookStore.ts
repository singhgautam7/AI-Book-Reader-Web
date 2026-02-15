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
}

export const useBookStore = create<BookState>()(
    persist(
        (set) => ({
            books: [],
            currentBookId: null,
            playbackProgress: {},

            addBook: (book) =>
                set((state) => ({
                    books: [book, ...state.books.filter((b) => b.id !== book.id)],
                })),

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
