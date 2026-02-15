import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBookStore } from "@/store/bookStore";
import { TTSConfiguration } from "@/components/TTSConfiguration";
import { BookHistoryTable } from "@/components/BookHistoryTable";
import { GeminiTTSProvider, OpenAITTSProvider } from "@/lib/tts"; // Updated import
import { toast } from "sonner";
import { STRINGS } from "@/lib/constants/strings";
import type { Book } from "@ai-book-reader/shared";

// Simple API upload function
async function uploadBook(file: File): Promise<Book> {
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
      return data.book;
  } catch (err) {
      console.error("Upload request error:", err);
      throw err;
  }
}

export default function Home() {
  const navigate = useNavigate();
  const addBook = useBookStore((state) => state.addBook);
  const books = useBookStore((state) => state.books);

  // TTS State
  const [provider, setProvider] = useState<"browser" | "gemini" | "openai">("browser"); // Updated type
  const [apiKey, setApiKey] = useState("");

  // Upload State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBook, setUploadedBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);

    // Load settings on mount
  useEffect(() => {
    const storedProvider = localStorage.getItem("tts_provider");
    if (storedProvider === "browser" || storedProvider === "gemini" || storedProvider === "openai") {
      setProvider(storedProvider);
    }

    // Load appropriate key based on provider (or just load both/current? Logic gets tricky if we toggle)
    // Actually better to load key when provider changes. But for initial load:
    if (storedProvider === "gemini") {
         const k = localStorage.getItem("gemini_api_key");
         if(k) try { setApiKey(atob(k)); } catch { setApiKey(k); }
    } else if (storedProvider === "openai") {
         const k = localStorage.getItem("openai_api_key");
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
      } else {
          setApiKey("");
      }
  }, [provider]);

  const { mutate: upload, isPending } = useMutation({
    mutationFn: uploadBook,
    onSuccess: (book) => {
      setUploadedBook(book);
      setUploadProgress(100);
      setError(null);
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

  const handleProceed = async () => {
    setError(null);

    // Validation
    if (!uploadedBook) {
      setError(STRINGS.ERROR_UPLOAD_FIRST);
      return;
    }

    // Save Settings (Provider) - Always save immediately
    localStorage.setItem("tts_provider", provider);

    if (provider === "gemini") {
        if (!apiKey.trim()) {
            setError(STRINGS.ERROR_GEMINI_KEY_MISSING);
            return;
        }

        const { isValid, error: validationError } = await GeminiTTSProvider.validateAPIKey(apiKey.trim());

        // Strict blocking: If validation fails for ANY reason (including rate limit), do not proceed.
        if (!isValid) {
            toast.error(validationError || STRINGS.ERROR_GEMINI_INVALID);
            // Do NOT save invalid keys (except maybe rate limited ones? User said "in case api returns error... page should still be landing page")
            // So we return here.
            return;
        } else {
            toast.success(STRINGS.SUCCESS_GEMINI_VERIFIED);
        }
    }

    if (provider === "openai") {
        if (!apiKey.trim()) {
            setError(STRINGS.ERROR_OPENAI_KEY_MISSING);
            return;
        }

        const { isValid, error: validationError } = await OpenAITTSProvider.validateAPIKey(apiKey.trim()); // Needs import

        if (!isValid) {
            toast.error(validationError || STRINGS.ERROR_OPENAI_INVALID);
            return;
        } else {
            toast.success(STRINGS.SUCCESS_OPENAI_VERIFIED);
        }
    }

    // Save API keys securely (Simple Obfuscation)
    try {
        if (provider === "gemini") {
            const encrypted = btoa(apiKey.trim());
            localStorage.setItem("gemini_api_key", encrypted);
            // Cleanup legacy
            localStorage.removeItem("ai_reader_settings"); // This line was in the original gemini block, moving it here.
        } else if (provider === "openai") {
            const encrypted = btoa(apiKey.trim());
            localStorage.setItem("openai_api_key", encrypted);
        }
    } catch (e) {
        console.error("Failed to save API key", e);
    }

    // Navigate
    addBook(uploadedBook);
    navigate(`/reader/${uploadedBook.id}`);
  };

  return (
    <div className="container mx-auto py-8 space-y-12 max-w-5xl">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{STRINGS.APP_TITLE}</h1>
        <p className="text-muted-foreground">{STRINGS.APP_SUBTITLE}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Upload Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{STRINGS.UPLOAD_TITLE}</CardTitle>
            <CardDescription>{STRINGS.UPLOAD_DESC}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                flex flex-col items-center justify-center gap-4 h-64
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                ${uploadedBook ? "border-green-500/50 bg-green-500/5" : ""}
              `}
            >
              <input {...getInputProps()} />
              {uploadedBook ? (
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
          </CardContent>
        </Card>

        {/* Right: TTS Configuration */}
        <Card className="flex flex-col">
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
                >
                    {STRINGS.PROCEED_BUTTON}
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
