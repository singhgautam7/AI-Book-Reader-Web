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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Trash2, Globe, Cpu, Cloud, Podcast, Calendar, Layers, Info, BookOpen, Search, Filter, X, Clock, History, ChevronLeft, ChevronRight, Copy, Link2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [readerFilter, setReaderFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'lastPlayedAt',
    direction: 'desc',
  });

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key: string) => {
      if (sortConfig.key !== key) return null;
      return sortConfig.direction === 'asc' ? <span className="ml-2 text-xs">▲</span> : <span className="ml-2 text-xs">▼</span>;
  };

  const filteredBooks = books
    .filter((book) => {
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesReader = readerFilter === "all" || (book.provider || "browser") === readerFilter;
      const matchesFormat = formatFilter === "all" || book.fileType === formatFilter;
      return matchesSearch && matchesReader && matchesFormat;
    })
    .sort((a, b) => {
        const key = sortConfig.key;
        const dir = sortConfig.direction === 'asc' ? 1 : -1;

        let valA: any = a[key as keyof Book];
        let valB: any = b[key as keyof Book];

        if (key === 'lastPlayedAt') {
            valA = new Date(a.lastPlayedAt || a.uploadDate).getTime();
            valB = new Date(b.lastPlayedAt || b.uploadDate).getTime();
        } else if (key === 'uploadDate') {
            valA = new Date(a.uploadDate).getTime();
            valB = new Date(b.uploadDate).getTime();
        } else if (key === 'provider') {
            valA = a.provider || 'browser';
            valB = b.provider || 'browser';
        } else if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });

  const totalPages = Math.ceil(filteredBooks.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
  }

  const confirmDelete = () => {
    if (bookToDelete) {
      removeBook(bookToDelete.id);
      setBookToDelete(null);
      if (currentBooks.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
      }
    }
  };

  const handlePlay = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
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

    useBookStore.getState().recordPlayback(book.id, provider);
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

  /* -------------------------------------------------------------------------- */
  /*                                HELPER METHODS                              */
  /* -------------------------------------------------------------------------- */

  const getFormatBadge = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100/80">PDF</Badge>;
      case "epub":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100/80">EPUB</Badge>;
      case "link":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100/80">LINK</Badge>;
      default:
        return <Badge variant="outline">{fileType}</Badge>;
    }
  };

  // ... (keeping other helpers same)
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

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */

  if (books.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/10 border-dashed">
        <p>No books in your library yet.</p>
        <p className="text-sm">Upload a PDF or EPUB, or paste a LINK to get started.</p>
      </div>
    );
  }

  const isLink = selectedBook?.fileType === 'link';

  return (
    <>
    <div className="space-y-4">
    {/* ... (Search Bar - Unexpectedly complex to replace just parts, so I'll keeping the search bar code by context if possible, but safer to replace block for Modal) */}
    {/* Actually I will replace the WHOLE return block to be safe and ensure structure */}

    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
            />
        </div>
        <div className="flex gap-2 w-full md:w-auto bg-muted/30 p-1 rounded-md">
            <Select value={readerFilter} onValueChange={setReaderFilter}>
                <SelectTrigger className="w-[140px] border-none bg-transparent shadow-none focus:ring-0">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Reader" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Readers</SelectItem>
                    <SelectItem value="browser">Browser</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                </SelectContent>
            </Select>

            <div className="w-px bg-border h-6 my-auto" />

            <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[120px] border-none bg-transparent shadow-none focus:ring-0">
                    <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="epub">EPUB</SelectItem>
                    <SelectItem value="link">LINK</SelectItem>
                </SelectContent>
            </Select>

            <div className="w-px bg-border h-6 my-auto" />

             <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => {
                    setSearchQuery("");
                    setReaderFilter("all");
                    setFormatFilter("all");
                }}
                disabled={!searchQuery && readerFilter === "all" && formatFilter === "all"}
                title="Clear filters"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    </div>

    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('title')}>
                Title {getSortIcon('title')}
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('provider')}>
                Reader {getSortIcon('provider')}
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('fileType')}>
                Format {getSortIcon('fileType')}
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('lastPlayedAt')}>
                Last Played {getSortIcon('lastPlayedAt')}
            </TableHead>
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
                {getFormatBadge(book.fileType)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDateTime(book.lastPlayedAt || book.uploadDate)}
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

    {/* Pagination... (keeping same) */}
    <div className="grid grid-cols-3 items-center py-4">
      <div className="text-sm text-muted-foreground justify-self-start">
        Showing {startIndex + 1} to {Math.min(endIndex, books.length)} of {books.length} entries
      </div>

      <div className="justify-self-center">
        {totalPages > 1 && (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(p => p - 1);
                            }}
                            disabled={currentPage === 1}
                            className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
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
                       <Button
                            variant="ghost"
                            size="icon"
                             onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(p => p + 1);
                            }}
                            disabled={currentPage === totalPages}
                            className={currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}
      </div>

      <div className="flex items-center space-x-2 justify-self-end">
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

    {/* DETAILS MODAL REFACTOR */}
    <Dialog open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent className="max-w-3xl">
            <DialogHeader className="pb-2 border-b mb-4">
                <DialogTitle className="flex items-center gap-3 text-xl">
                    {isLink ? <Globe className="w-6 h-6 text-green-600" /> : <BookOpen className="w-6 h-6 text-primary" />}
                    {isLink ? "Link Details" : "Book Details"}
                </DialogTitle>
                <DialogDescription className="text-base font-medium text-foreground">
                    {selectedBook?.title}
                </DialogDescription>
            </DialogHeader>

            {selectedBook && (
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="history">Playback History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                            {/* LEFT COLUMN */}
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Format</Label>
                                    <div className="mt-1.5">{getFormatBadge(selectedBook.fileType)}</div>
                                </div>

                                {/* Link: Source | Book: Size */}
                                {isLink ? (
                                    <div>
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">URL</Label>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="font-medium text-sm truncate flex-1 min-w-0" title={selectedBook.url || ''}>
                                                {selectedBook.url || 'Unknown URL'}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    if (selectedBook.url) {
                                                        navigator.clipboard.writeText(selectedBook.url);
                                                    }
                                                }}
                                                className="p-1 rounded hover:bg-muted transition-colors shrink-0 group relative"
                                                title="Copy URL"
                                            >
                                                <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">File Size</Label>
                                        <div className="flex items-center gap-2 mt-1.5 font-medium">
                                            <Layers className="w-4 h-4 text-muted-foreground" />
                                            {formatFileSize(selectedBook.fileSize || 0)}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Content</Label>
                                    <div className="flex items-center gap-2 mt-1.5 font-medium">
                                        <Layers className="w-4 h-4 text-muted-foreground" />
                                        {selectedBook.totalChunks} Chunks / Segments
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Date Added</Label>
                                    <div className="flex items-center gap-2 mt-1.5 font-medium">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        {formatDateTime(selectedBook.uploadDate)}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Last Played</Label>
                                    <div className="flex items-center gap-2 mt-1.5 font-medium">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        {selectedBook.lastPlayedAt ? formatDateTime(selectedBook.lastPlayedAt) : "Never played"}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Last Used Reader</Label>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {selectedBook.provider ? (
                                            <>
                                                {getProviderIcon(selectedBook.provider)}
                                                <span className="font-medium">{getProviderName(selectedBook.provider)}</span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground italic">None</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <div className="rounded-md border p-0 h-[300px] overflow-hidden flex flex-col">
                           {/* ScrollArea is better but standard div with overflow auto works too as requested */}
                            <div className="overflow-y-auto p-4 space-y-4 flex-1">
                                {!selectedBook.history || selectedBook.history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-60">
                                        <History className="w-10 h-10" />
                                        <p>No playback history recorded.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {selectedBook.history.map((record, i) => (
                                            <div key={i} className="flex items-centerjustify-between p-3 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-muted p-2.5 rounded-full">
                                                        {getProviderIcon(record.provider)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{formatDateTime(record.playedAt)}</span>
                                                        <span className="text-xs text-muted-foreground capitalize">{getProviderName(record.provider)} Reader</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            )}
            <DialogFooter className="mt-4 pt-4 border-t">
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={(e) => selectedBook && handlePlay(e, selectedBook)} className="gap-2">
                    <Play className="h-4 w-4" /> Open In Reader
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
