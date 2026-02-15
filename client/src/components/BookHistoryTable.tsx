import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, Trash2 } from "lucide-react";
import type { Book } from "@ai-book-reader/shared";
import { useNavigate } from "react-router-dom";
import { useBookStore } from "@/store/bookStore";

interface BookHistoryTableProps {
  books: Book[];
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function BookHistoryTable({ books }: BookHistoryTableProps) {
  const navigate = useNavigate();
  const removeBook = useBookStore((state) => state.removeBook);
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);

  const formatDate = (date: string | number) => {
    return new Date(date).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleRead = (bookId: string) => {
    navigate(`/reader/${bookId}`);
  };

  const confirmDelete = () => {
    if (bookToDelete) {
      removeBook(bookToDelete);
      setBookToDelete(null);
    }
  };

  if (books.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">No books uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => (
            <TableRow
              key={book.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRead(book.id)}
            >
              <TableCell className="font-medium">{book.title}</TableCell>
              <TableCell className="uppercase">{book.fileType}</TableCell>
              <TableCell>{book.totalChunks}</TableCell>
              <TableCell>{formatDate(book.uploadDate)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRead(book.id);
                    }}
                    title="Read"
                  >
                    <Play className="h-4 w-4" />
                  </Button>

                  <AlertDialog open={bookToDelete === book.id} onOpenChange={(open) => !open && setBookToDelete(null)}>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                setBookToDelete(book.id);
                            }}
                            title="Delete"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete "{book.title}" from your library.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => {
                                e.stopPropagation();
                                setBookToDelete(null);
                            }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete();
                            }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
