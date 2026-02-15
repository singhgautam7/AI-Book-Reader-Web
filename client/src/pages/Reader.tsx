import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBookStore } from "@/store/bookStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipBack, SkipForward, ArrowLeft } from "lucide-react";
import type { TextChunk } from "@ai-book-reader/shared";
import { createTTSProvider } from "@/lib/tts";
import type { TTSProvider, TTSProviderType } from "@/lib/tts";

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const { books, updateProgress, playbackProgress } = useBookStore();
  const book = books.find((b) => b.id === bookId);

  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  const ttsProvider = useRef<TTSProvider | null>(null);

  // Initialize TTS Provider
  useEffect(() => {
    const providerType = (localStorage.getItem("tts_provider") as TTSProviderType) || "browser";
    const apiKey = localStorage.getItem("gemini_api_key") || undefined;
    ttsProvider.current = createTTSProvider(providerType, apiKey);

    return () => {
        ttsProvider.current?.stop();
    };
  }, []);

  // Restore progress
  useEffect(() => {
    if (bookId && playbackProgress[bookId] !== undefined) {
        setCurrentChunkIndex(playbackProgress[bookId]);
    }
  }, [bookId, playbackProgress]);

  // Fetch chunks
  const { data: chunks, isLoading } = useQuery<TextChunk[]>({
    queryKey: ["chunks", bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const res = await fetch(`http://localhost:3000/api/books/${bookId}/chunks`);
      return res.json();
    },
    enabled: !!bookId,
  });

  // Handle Playback State Changes
  useEffect(() => {
    if (!ttsProvider.current || !chunks) return;

    if (isPlaying) {
        const text = chunks[currentChunkIndex]?.content;
        if (text) {
             ttsProvider.current.setRate(rate);
             ttsProvider.current.play(text, () => {
                 // On end of chunk
                 if (currentChunkIndex < chunks.length - 1) {
                     const next = currentChunkIndex + 1;
                     setCurrentChunkIndex(next);
                     updateProgress(bookId!, next);
                 } else {
                     setIsPlaying(false);
                 }
             });
        }
    } else {
        ttsProvider.current.stop(); // Or pause? types say pause.
        // Actually, for simple implementation, stop/cancel is safer to ensure no overlap.
        // But if we want resume support, we should use pause/resume.
        // BrowserTTSProvider implementation uses window.speechSynthesis.pause().
        // Let's try pause? But restarting chunk is often better for "Read Aloud" UX than resuming mid-sentence if context is lost.
        // For now let's use stop() which resets.
        ttsProvider.current.pause();
    }
  }, [isPlaying, currentChunkIndex, chunks, bookId, updateProgress]);

  // Apply rate changes
  useEffect(() => {
      ttsProvider.current?.setRate(rate);
  }, [rate]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextChunk = () => {
    if (!chunks) return;
    if (currentChunkIndex < chunks.length - 1) {
        const next = currentChunkIndex + 1;
        setCurrentChunkIndex(next);
        updateProgress(bookId!, next);
        // Effect will handle playing new chunk
    }
  };

  const prevChunk = () => {
      if (currentChunkIndex > 0) {
          const prev = currentChunkIndex - 1;
          setCurrentChunkIndex(prev);
          updateProgress(bookId!, prev);
          // Effect will handle playing new chunk
      }
  };

  if (!book) return <div className="p-8">Book not found. <Link to="/" className="underline">Go back</Link></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
       <div className="flex items-center gap-4">
         <Link to="/">
            <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
            </Button>
         </Link>
         <h1 className="text-xl font-bold truncate">{book.title}</h1>
       </div>

       <div className="flex-1 overflow-y-auto border rounded-md p-6 bg-card prose dark:prose-invert max-w-none">
          {isLoading ? (
             <p>Loading book content...</p>
          ) : (
             <div className="text-lg leading-relaxed">
                {chunks?.map((chunk, idx) => (
                    <span
                        key={chunk.id}
                        className={`transition-colors duration-300 ${idx === currentChunkIndex ? "bg-primary/20 text-primary-foreground dark:text-foreground p-1 rounded" : "text-muted-foreground"}`}
                        onClick={() => {
                            setCurrentChunkIndex(idx);
                            setIsPlaying(true);
                        }}
                    >
                        {chunk.content}{" "}
                    </span>
                ))}
             </div>
          )}
       </div>

       <Card className="p-4">
         <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                    Chunk {currentChunkIndex + 1} / {book.totalChunks}
                </div>
                 <div className="flex items-center gap-2 w-32">
                    <span className="text-xs">Speed: {rate}x</span>
                    <Slider
                        value={[rate]}
                        min={0.5}
                        max={2}
                        step={0.25}
                        onValueChange={([val]) => setRate(val)}
                    />
                 </div>
            </div>

            <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={prevChunk}>
                    <SkipBack className="w-4 h-4" />
                </Button>
                <Button size="icon" className="w-12 h-12 rounded-full" onClick={togglePlay}>
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
                <Button variant="outline" size="icon" onClick={nextChunk}>
                    <SkipForward className="w-4 h-4" />
                </Button>
            </div>
         </div>
       </Card>
    </div>
  );
}
