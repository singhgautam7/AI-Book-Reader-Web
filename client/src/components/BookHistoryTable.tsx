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

export function BookHistoryTable({ books }: BookHistoryTableProps) {
  const navigate = useNavigate();
  const removeBook = useBookStore((state) => state.removeBook);

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

  const handleDelete = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this book?")) {
      removeBook(bookId);
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(e, book.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
