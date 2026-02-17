import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Play, Trash2, Globe, Cpu, Cloud, Podcast, FileText, Calendar, HardDrive, Layers, Info, BookOpen } from "lucide-react";
import type { Book } from "@ai-book-reader/shared";
import { useNavigate } from "react-router-dom";
import { useBookStore } from "@/store/bookStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BookHistoryTableProps {
  books: Book[];
}

export function BookHistoryTable({ books }: BookHistoryTableProps) {
  const navigate = useNavigate();
  const removeBook = useBookStore((state) => state.removeBook);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentBooks = books.slice(startIndex, endIndex);

  const confirmDelete = () => {
    if (bookToDelete) {
      removeBook(bookToDelete.id);
      setBookToDelete(null);
      // Adjust page if empty
      if (currentBooks.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
      }
    }
  };

  const handlePlay = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();

    // Check if provider requires key
    const provider = book.provider || "browser";
    let hasKey = true;

    if (provider === "gemini") {
        hasKey = !!localStorage.getItem("gemini_api_key");
    } else if (provider === "openai") {
        hasKey = !!localStorage.getItem("openai_api_key");
    } else if (provider === "elevenlabs") {
        hasKey = !!localStorage.getItem("elevenlabs_api_key");
    }

    if (!hasKey) {
        toast.error(`API key required for ${provider} provider.`);
        return;
    }

    // Set provider in local storage so Reader picks it up
    localStorage.setItem("tts_provider", provider);
    navigate(`/reader/${book.id}`);
  };

  const getProviderIcon = (provider?: string) => {
      if (!provider) return null;
      switch (provider) {
          case "gemini": return <Cpu className="w-4 h-4 text-blue-500" />;
          case "openai": return <Cloud className="w-4 h-4 text-green-500" />;
          case "elevenlabs": return <Podcast className="w-4 h-4 text-purple-500" />;
          case "browser": return <Globe className="w-4 h-4 text-orange-500" />;
          default: return null;
      }
  };

  const getProviderName = (provider?: string) => {
    if (!provider) return "";
    switch (provider) {
        case "gemini": return "Gemini";
        case "openai": return "OpenAI";
        case "elevenlabs": return "ElevenLabs";
        case "browser": return "Browser";
        default: return "";
    }
  };

  const formatFileSize = (bytes?: number) => {
      if (bytes === undefined) return "Unknown";
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
      // Handle invalid dates casually
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "Invalid Date";
      return d.toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
      });
  };

  if (books.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/10 border-dashed">
        <p>No books in your library yet.</p>
        <p className="text-sm">Upload a PDF or EPUB to get started.</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Title</TableHead>
            <TableHead>Reader</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentBooks.map((book) => (
            <TableRow
              key={book.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedBook(book)}
            >
              <TableCell className="font-medium max-w-[200px]">
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <div className="truncate">{book.title}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>{book.title}</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              </TableCell>
              <TableCell>
                  <div className="flex items-center gap-2">
                      {book.provider && (
                          <>
                            {getProviderIcon(book.provider)}
                            <span className="text-sm text-muted-foreground">{getProviderName(book.provider)}</span>
                          </>
                      )}
                  </div>
              </TableCell>
              <TableCell className="uppercase text-xs text-muted-foreground">
                <Badge variant="secondary">{book.fileType}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDateTime(book.uploadDate)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={(e) => handlePlay(e, book)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>

                  <AlertDialog open={bookToDelete?.id === book.id} onOpenChange={(open) => !open && setBookToDelete(null)}>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setBookToDelete(book);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
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
                            }} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
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

    <div className="flex items-center justify-between py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {startIndex + 1} to {Math.min(endIndex, books.length)} of {books.length} entries
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">

        {/* Pagination Controls - Now First (Center-ish) */}
        {totalPages > 1 && (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(p => p - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                            <PaginationLink
                                href="#"
                                isActive={page === currentPage}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                }}
                            >
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    ))}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(p => p + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}

        {/* Rows Per Page Selector - Now Second (Rightmost) */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    </div>

    <Dialog open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" /> Book Details
                </DialogTitle>
                <DialogDescription>
                    Information about your uploaded book.
                </DialogDescription>
            </DialogHeader>

            {selectedBook && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right font-medium text-muted-foreground flex items-center justify-end gap-2">
                             <BookOpen className="w-4 h-4" /> Title:
                        </span>
                        <span className="col-span-3 font-semibold break-words">{selectedBook.title}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right font-medium text-muted-foreground flex items-center justify-end gap-2">
                            <FileText className="w-4 h-4" /> Format:
                        </span>
                        <span className="col-span-3 capitalize">{selectedBook.fileType}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right font-medium text-muted-foreground flex items-center justify-end gap-2">
                             <HardDrive className="w-4 h-4" /> Size:
                        </span>
                        <span className="col-span-3">{formatFileSize(selectedBook.fileSize)}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right font-medium text-muted-foreground flex items-center justify-end gap-2">
                             <Layers className="w-4 h-4" /> Chunks:
                        </span>
                        <span className="col-span-3">{selectedBook.totalChunks} segments</span>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right font-medium text-muted-foreground flex items-center justify-end gap-2">
                             <Calendar className="w-4 h-4" /> Added:
                        </span>
                        <span className="col-span-3">{formatDateTime(selectedBook.uploadDate)}</span>
                    </div>

                    {selectedBook.provider && (
                         <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-right font-medium text-muted-foreground flex items-center justify-end gap-2">
                                <Podcast className="w-4 h-4" /> Reader:
                            </span>
                            <span className="col-span-3 flex items-center gap-2">
                                {getProviderIcon(selectedBook.provider)}
                                {getProviderName(selectedBook.provider)}
                            </span>
                        </div>
                    )}
                </div>
            )}
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={(e) => selectedBook && handlePlay(e, selectedBook)}>
                    <Play className="mr-2 h-4 w-4" /> Proceed to Reader
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
