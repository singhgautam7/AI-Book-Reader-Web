import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, AlertCircle, TestTube, Check, Globe, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useBookStore } from "@/store/bookStore";
import { useSettingsStore } from "@/store/settingsStore";
import { TTSConfiguration } from "@/components/TTSConfiguration";
import { BookHistoryTable } from "@/components/BookHistoryTable";
import { GeminiTTSProvider, OpenAITTSProvider, ElevenLabsTTSProvider } from "@/lib/tts";
import { toast } from "sonner";
import { STRINGS } from "@/lib/constants/strings";
import type { Book } from "@ai-book-reader/shared";

// Simple API upload function
async function uploadBook(file: File): Promise<{ book: Book; chunks: any[] }> {
  const formData = new FormData();
  formData.append("book", file);
  console.log("Uploading file:", file.name, file.type, file.size);
  try {
      const res = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
          const text = await res.text();
          console.error("Upload failed response:", res.status, res.statusText, text);
          throw new Error(`Upload failed: ${res.status} ${res.statusText} - ${text}`);
      }
      const data = await res.json();
      return { book: data.book, chunks: data.chunks || [] };
  } catch (err) {
      console.error("Upload request error:", err);
      throw err;
  }
}

export default function Home() {
  const navigate = useNavigate();
  const addBook = useBookStore((state) => state.addBook);
  const setChunks = useBookStore((state) => state.setChunks);
  const books = useBookStore((state) => state.books);

  // TTS State
  const [provider, setProvider] = useState<"browser" | "gemini" | "openai" | "elevenlabs">("browser"); // Updated type
  const [apiKey, setApiKey] = useState("");

  // Upload State
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBook, setUploadedBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Link State
  const [linkUrl, setLinkUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedBook, setExtractedBook] = useState<Book | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Debounce logic for auto-extraction
  useEffect(() => {
      const timer = setTimeout(() => {
          if (linkUrl) {
              handleLinkExtract(linkUrl);
          }
      }, 1000); // 1-second debounce

      return () => clearTimeout(timer);
  }, [linkUrl]);

  const handleLinkExtract = async (urlToExtract: string) => {
      setLinkError(null);

      if (!urlToExtract) {
          setExtractedBook(null);
          return;
      }

      try {
          // 1. Basic URL Validation
          new URL(urlToExtract);
      } catch {
          // Don't show error while typing incomplete URL, only if it looks like they tried to finish?
          return;
      }

      setIsExtracting(true);
      setExtractedBook(null); // Clear previous result while loading

      try {
          const res = await fetch("http://localhost:3000/api/extract-article", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: urlToExtract })
          });

          // Handle Clean JSON Response
          const data = await res.json();

          if (!res.ok || !data.success) {
              throw new Error(data.error || "Unable to extract readable article content from this link.");
          }

          setExtractedBook(data.book);
          // Persist chunks client-side
          if (data.book?.id && data.chunks) {
              setChunks(data.book.id, data.chunks);
          }
      } catch (err: any) {
          console.error("Extraction error:", err);
          setLinkError(err.message || "Failed to process the link. Please try again.");
      } finally {
          setIsExtracting(false);
      }
  };

    // Load settings on mount
  useEffect(() => {
    const storedProvider = localStorage.getItem("tts_provider");
    if (storedProvider === "browser" || storedProvider === "gemini" || storedProvider === "openai" || storedProvider === "elevenlabs") {
      setProvider(storedProvider);
    }

    // Initial key load logic
    if (storedProvider === "gemini") {
         const k = localStorage.getItem("gemini_api_key");
         if(k) try { setApiKey(atob(k)); } catch { setApiKey(k); }
    } else if (storedProvider === "openai") {
         const k = localStorage.getItem("openai_api_key");
         if(k) try { setApiKey(atob(k)); } catch { setApiKey(k); }
    } else if (storedProvider === "elevenlabs") {
         const k = localStorage.getItem("elevenlabs_api_key");
         if(k) try { setApiKey(atob(k)); } catch { setApiKey(k); }
    }
  }, []);

  // Effect to switch key input when provider changes
  useEffect(() => {
      if (provider === "gemini") {
         const k = localStorage.getItem("gemini_api_key");
         if(k) try { setApiKey(atob(k)); } catch { setApiKey(k); }
         else setApiKey("");
      } else if (provider === "openai") {
         const k = localStorage.getItem("openai_api_key");
         if(k) try { setApiKey(atob(k)); } catch { setApiKey(k); }
         else setApiKey("");
      } else if (provider === "elevenlabs") {
         const k = localStorage.getItem("elevenlabs_api_key");
         if(k) try { setApiKey(atob(k)); } catch { setApiKey(k); }
         else setApiKey("");
      } else {
          setApiKey("");
      }
  }, [provider]);

  const { mutate: upload, isPending } = useMutation({
    mutationFn: uploadBook,
    onSuccess: ({ book, chunks }, file) => {
      console.log('[UPLOAD] onSuccess - book.id:', book?.id, 'chunks:', chunks?.length);
      setUploadedBook({ ...book, fileSize: file.size });
      setUploadProgress(100);
      setError(null);
      // Persist chunks client-side
      if (book?.id && chunks) {
          setChunks(book.id, chunks);
          console.log('[UPLOAD] Chunks stored for book.id:', book.id, 'count:', chunks.length);
      } else {
          console.warn('[UPLOAD] No chunks to store! book.id:', book?.id, 'chunks:', chunks);
      }
    },
    onError: (err) => {
      setError("Failed to upload book. Please try again.");
      console.error(err);
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploadProgress(0);
    setUploadedBook(null);
    setError(null);

    // Fake progress for UX since fetch doesn't give it
    const interval = setInterval(() => {
        setUploadProgress((prev) => {
            if (prev >= 90) {
                clearInterval(interval);
                return 90;
            }
            return prev + 10;
        });
    }, 200);

    upload(file, {
        onSettled: () => clearInterval(interval)
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/epub+zip": [".epub"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // ... inside Home component
  const { testingMode, setTestingMode } = useSettingsStore();
  const [isValidating, setIsValidating] = useState(false);

  // Sample book for testing
  const SAMPLE_BOOK: Book = {
      id: "testing-sample-id",
      title: "Testing Mode - Sample Book",
      uploadDate: new Date().toISOString(),
      fileType: "epub", // Dummy type
      totalChunks: 1, // Single chunk for sample
      provider: "browser",
      fileSize: 1024,
  };

  // We need to inject the sample content into the "chunks" query when in testing mode
  // But Home.tsx just navigates to Reader. Reader fetches chunks from API.
  // The API won't have the sample book.
  // We need a way to pass the sample text to Reader or mock the API response.
  // Since we don't have a real backend for "Testing Mode", we might need to modify Reader to handle "testing-sample-id" specially.

  const handleProceed = async () => {
    setError(null);

    // Validation
    if (activeTab === "upload" && !uploadedBook && !testingMode) {
      setError(STRINGS.ERROR_UPLOAD_FIRST);
      return;
    }
    if (activeTab === "link" && !extractedBook) {
        // Attempt extraction if URL exists but no book yet (e.g. user typed but fast click)
        if (linkUrl && !isExtracting) {
            await handleLinkExtract(linkUrl);
            // We can't easily check 'extractedBook' here because it's state updated async.
            // But for MVP, if they click proceed, and it's not ready, we show error.
             setLinkError("Please ensure the link is valid and extracted.");
             return;
        } else {
            setLinkError("Please enter a valid URL.");
            return;
        }
    }

    // Save Settings (Provider) - Always save immediately
    localStorage.setItem("tts_provider", provider);

    // If browser, navigate immediately
    // If browser, navigate immediately
    if (provider === "browser") {
        let bookToUse: Book | null = null;
        if (activeTab === "upload") {
            bookToUse = testingMode ? SAMPLE_BOOK : uploadedBook;
        } else if (activeTab === "link") {
            // Ensure extraction happened
             if (!extractedBook && linkUrl) {
                // If user clicks proceed without blurring, try extraction first
                // Note: This is async, so we can't easily do it inside this sync block without refactoring.
                // For MVP, we rely on the user having valid extracted book OR the validation block above handling it if we make handleProceed async (it is async).
                // Actually handleProceed IS async. So we can use the validation block's result if we moved it up.
                // But simplified:
            }
            bookToUse = extractedBook;
        }

        if (bookToUse) {
             const books = useBookStore.getState().books;
             const recordPlayback = useBookStore.getState().recordPlayback;

             const existingBook = books.find(b => {
                 if (bookToUse!.fileType === 'link' && bookToUse!.url && b.url) return b.url === bookToUse!.url;
                 return b.title === bookToUse!.title && b.fileSize === bookToUse!.fileSize;
             });
             const activeBookId = existingBook ? existingBook.id : bookToUse.id;

             // Re-map chunks to activeBookId if different from original
             if (activeBookId !== bookToUse.id) {
                 const originalChunks = useBookStore.getState().getChunks(bookToUse.id);
                 if (originalChunks && originalChunks.length > 0) {
                     setChunks(activeBookId, originalChunks);
                 }
             }

             addBook({ ...bookToUse, id: activeBookId, provider: "browser" });
             recordPlayback(activeBookId, "browser");
             navigate(`/reader/${activeBookId}`);
        }
        return;
    }

    // START LOADING
    setIsValidating(true);

    try {
        if (provider === "gemini") {
            if (!apiKey.trim()) {
                setError(STRINGS.ERROR_GEMINI_KEY_MISSING);
                setIsValidating(false);
                return;
            }

            const { isValid, error: validationError } = await GeminiTTSProvider.validateAPIKey(apiKey.trim()); // Validate

            if (!isValid) {
                toast.error(validationError || STRINGS.ERROR_GEMINI_INVALID);
                setIsValidating(false);
                return;
            } else {
                toast.success(STRINGS.SUCCESS_GEMINI_VERIFIED);
            }
        }

        if (provider === "openai") {
            if (!apiKey.trim()) {
                setError(STRINGS.ERROR_OPENAI_KEY_MISSING);
                setIsValidating(false);
                return;
            }

            const { isValid, error: validationError } = await OpenAITTSProvider.validateAPIKey(apiKey.trim());

            if (!isValid) {
                toast.error(validationError || STRINGS.ERROR_OPENAI_INVALID);
                setIsValidating(false);
                return;
            } else {
                toast.success(STRINGS.SUCCESS_OPENAI_VERIFIED);
            }
        }

        if (provider === "elevenlabs") {
            if (!apiKey.trim()) {
                setError(STRINGS.ERROR_ELEVENLABS_KEY_MISSING);
                setIsValidating(false);
                return;
            }

            const { isValid, error: validationError } = await ElevenLabsTTSProvider.validateAPIKey(apiKey.trim());

            if (!isValid) {
                toast.error(validationError || STRINGS.ERROR_ELEVENLABS_INVALID);
                setIsValidating(false);
                return;
            } else {
                toast.success(STRINGS.SUCCESS_ELEVENLABS_VERIFIED);
            }
        }

        // Save API keys securely (Simple Obfuscation)
        try {
            if (provider === "gemini") {
                const encrypted = btoa(apiKey.trim());
                localStorage.setItem("gemini_api_key", encrypted);
                localStorage.removeItem("ai_reader_settings");
            } else if (provider === "openai") {
                const encrypted = btoa(apiKey.trim());
                localStorage.setItem("openai_api_key", encrypted);
            } else if (provider === "elevenlabs") {
                const encrypted = btoa(apiKey.trim());
                localStorage.setItem("elevenlabs_api_key", encrypted);
            }
        } catch (e) {
            console.error("Failed to save API key", e);
        }

    // Navigate
    let bookToUse: Book | null = null;

    if (activeTab === "upload") {
        bookToUse = testingMode ? SAMPLE_BOOK : uploadedBook;
    } else if (activeTab === "link") {
        bookToUse = extractedBook;
    }

    if (!bookToUse) {
        // Fallback validation if not caught earlier
        if (activeTab === "upload") setError(STRINGS.ERROR_UPLOAD_FIRST);
        else if (activeTab === "link") setLinkError("Please enter a valid URL.");
        setIsValidating(false);
        return;
    }

    if (bookToUse) {
            const books = useBookStore.getState().books;
            const recordPlayback = useBookStore.getState().recordPlayback;

            // Check for existing book (by title + size OR URL) to prevent duplicates
            const existingBook = books.find(b => {
                if (bookToUse.fileType === 'link' && bookToUse.url && b.url) {
                    return b.url === bookToUse.url;
                }
                return b.title === bookToUse.title && b.fileSize === bookToUse.fileSize;
            });

            const activeBookId = existingBook ? existingBook.id : bookToUse.id;

             // Re-map chunks to activeBookId if different from original
             if (activeBookId !== bookToUse.id) {
                 const originalChunks = useBookStore.getState().getChunks(bookToUse.id);
                 if (originalChunks && originalChunks.length > 0) {
                     setChunks(activeBookId, originalChunks);
                 }
             }

             // Add or Update (moves to top)
             addBook({ ...bookToUse, id: activeBookId, provider });

             // Record Playback History
             recordPlayback(activeBookId, provider);

             navigate(`/reader/${activeBookId}`);
        }

    } catch (err) {
        console.error("Error during proceed:", err);
        toast.error("An unexpected error occurred. Please try again.");
    } finally {
        setIsValidating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-12 max-w-5xl">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{STRINGS.APP_TITLE}</h1>
        <p className="text-muted-foreground">{STRINGS.APP_SUBTITLE}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Left: Upload/Link Section */}
        <Card className="flex flex-col min-h-[420px]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <CardHeader className="pb-2">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload a book</TabsTrigger>
                    <TabsTrigger value="link">Paste a link</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                  <TabsContent value="upload" className="mt-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col space-y-4">
                        <div className="text-sm text-muted-foreground mb-2">
                            {STRINGS.UPLOAD_DESC}
                        </div>
                        <div
                        {...getRootProps()}
                        className={`
                            border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                            flex flex-col items-center justify-center gap-4 flex-1 min-h-[200px]
                            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                            ${uploadedBook ? "border-green-500/50 bg-green-500/5" : ""}
                            ${testingMode ? "opacity-50 pointer-events-none grayscale" : ""}
                        `}
                        >
                        <input {...getInputProps()} disabled={testingMode} />
                        {testingMode ? (
                            <>
                                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <TestTube className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">Testing Mode Active</p>
                                    <p className="text-xs text-muted-foreground">Using built-in sample text</p>
                                </div>
                            </>
                        ) : uploadedBook ? (
                            <>
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                    <UploadCloud className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">{uploadedBook.title}</p>
                                    <p className="text-xs text-muted-foreground">Ready to read</p>
                                </div>
                            </>
                        ) : isPending ? (
                            <>
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <div className="space-y-2 w-full max-w-xs">
                                    <p className="text-sm text-muted-foreground">Processing...</p>
                                    <Progress value={uploadProgress} className="h-2" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                    <UploadCloud className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium">Drag & drop or click to upload</p>
                                    <p className="text-xs text-muted-foreground">Up to 100MB</p>
                                </div>
                            </>
                        )}
                        </div>
                         <div className="flex items-center space-x-2 border-t pt-4">
                            <Switch id="testing-mode" checked={testingMode} onCheckedChange={setTestingMode} />
                            <div className="flex flex-col">
                                <Label htmlFor="testing-mode" className="font-medium cursor-pointer">Enable Testing Mode</Label>
                                <span className="text-xs text-muted-foreground">Use sample text instead of uploading a file.</span>
                            </div>
                        </div>
                  </TabsContent>

                  <TabsContent value="link" className="flex-1 data-[state=active]:flex data-[state=active]:flex-col mt-0 space-y-4">
                      <div className="text-sm text-muted-foreground mb-2">
                          Read web articles by pasting a public URL.
                      </div>

                      {/* Styled zone mirroring the upload dropzone */}
                      <div className={`
                          border-2 border-dashed rounded-lg p-6 transition-colors flex-1 min-h-[200px]
                          flex flex-col
                          ${extractedBook ? 'border-green-500/50 bg-green-500/5' : linkError ? 'border-destructive/50 bg-destructive/5' : 'border-muted-foreground/25'}
                      `}>
                          {/* URL Input Row */}
                          <div className="flex items-center gap-3">
                              <div className={`
                                  h-10 w-10 rounded-full flex items-center justify-center shrink-0
                                  ${extractedBook ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : isExtracting ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'}
                              `}>
                                  {isExtracting ? (
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : extractedBook ? (
                                      <Check className="h-5 w-5" />
                                  ) : (
                                      <Link2 className="h-5 w-5" />
                                  )}
                              </div>
                              <Input
                                  placeholder="https://example.com/article"
                                  value={linkUrl}
                                  onChange={(e) => {
                                      setLinkUrl(e.target.value);
                                      if (linkError) setLinkError(null);
                                  }}
                                  className={`flex-1 ${linkError ? 'border-destructive' : ''}`}
                              />
                          </div>

                          {/* Error State */}
                          {linkError && (
                              <p className="text-sm text-destructive flex items-center gap-1 mt-3">
                                  <AlertCircle className="h-3 w-3" /> {linkError}
                              </p>
                          )}

                          {/* Content Area: empty / extracting / success */}
                          <div className="flex-1 flex flex-col items-center justify-center mt-4">
                              {isExtracting && (
                                  <div className="text-sm text-muted-foreground animate-pulse">
                                      Extracting article content...
                                  </div>
                              )}

                              {extractedBook && (
                                  <div className="text-center space-y-1">
                                      <p className="font-semibold text-base">{extractedBook.title}</p>
                                      {extractedBook.sourceDomain && (
                                          <div className="flex items-center justify-center text-xs text-muted-foreground gap-1">
                                              <Globe className="h-3 w-3" /> {extractedBook.sourceDomain}
                                          </div>
                                      )}
                                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Ready to read</p>
                                  </div>
                              )}

                              {!isExtracting && !extractedBook && !linkError && (
                                  <div className="text-center space-y-1">
                                      <p className="text-sm text-muted-foreground/50">Paste a URL above to get started</p>
                                      <p className="text-xs text-muted-foreground/30">Supports blogs, news articles & more</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </TabsContent>
              </CardContent>
          </Tabs>
        </Card>

        {/* Right: TTS Configuration */}
        <Card className="flex flex-col min-h-[420px]">
          <CardHeader>
            <CardTitle>{STRINGS.CONFIG_TITLE}</CardTitle>
            <CardDescription>{STRINGS.CONFIG_DESC}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6">
            <TTSConfiguration
                provider={provider}
                setProvider={setProvider}
                apiKey={apiKey}
                setApiKey={setApiKey}
            />

            {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <p>{error}</p>
                </div>
            )}

            <div className="mt-auto pt-4">
                <Button
                    size="lg"
                    className="w-full"
                    onClick={handleProceed}
                    disabled={isValidating}
                >
                    {isValidating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {STRINGS.PROCEED_BUTTON_LOADING}
                        </>
                    ) : (
                        STRINGS.PROCEED_BUTTON
                    )}
                    {testingMode && !isValidating && " (Test)"}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">{STRINGS.LIBRARY_TITLE}</h2>
        <BookHistoryTable books={books} />
      </div>
    </div>
  );
}
