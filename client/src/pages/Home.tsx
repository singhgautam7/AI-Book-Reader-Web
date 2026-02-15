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
import { GeminiTTSProvider } from "@/lib/tts";
import { toast } from "sonner";
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
  const [provider, setProvider] = useState<"browser" | "gemini">("browser");
  const [apiKey, setApiKey] = useState("");

  // Upload State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBook, setUploadedBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const storedProvider = localStorage.getItem("tts_provider");
    const storedKey = localStorage.getItem("gemini_api_key");
    if (storedProvider === "browser" || storedProvider === "gemini") {
      setProvider(storedProvider);
    }
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const { mutate: upload, isPending } = useMutation({
    mutationFn: uploadBook,
    onSuccess: (book) => {
      addBook(book);
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
      setError("Please upload a book first.");
      return;
    }

    if (provider === "gemini") {
        if (!apiKey.trim()) {
            setError("Please enter a Gemini API Key.");
            return;
        }

        const { isValid, error: validationError } = await GeminiTTSProvider.validateAPIKey(apiKey.trim());
        if (!isValid) {
            toast.error(validationError || "Invalid Gemini API key. Please check your key.");
            return;
        } else {
            toast.success("Gemini API key verified successfully.");
        }
    }

    // Save Settings
    localStorage.setItem("tts_provider", provider);
    if (provider === "gemini") {
        localStorage.setItem("gemini_api_key", apiKey.trim());
    } else {
        localStorage.removeItem("gemini_api_key"); // Clear if switching back to browser
    }

    // Navigate
    navigate(`/reader/${uploadedBook.id}`);
  };

  return (
    <div className="container mx-auto py-8 space-y-12 max-w-5xl">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">AI Audiobook Reader</h1>
        <p className="text-muted-foreground">Transform your local PDF & EPUB files into immersive audiobooks.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Upload Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>1. Upload Book</CardTitle>
            <CardDescription>Supported formats: PDF, EPUB (Max 100MB)</CardDescription>
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
            <CardTitle>2. Configure & Read</CardTitle>
            <CardDescription>Select your preferred speech engine.</CardDescription>
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
                    Proceed to Reader
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Your Library</h2>
        <BookHistoryTable books={books} />
      </div>
    </div>
  );
}
