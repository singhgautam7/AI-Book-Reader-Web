import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBookStore } from "@/store/bookStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Play, Pause, SkipBack, SkipForward, ArrowLeft } from "lucide-react";
import type { TextChunk } from "@ai-book-reader/shared";

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const { books, updateProgress, playbackProgress } = useBookStore();
  const book = books.find((b) => b.id === bookId);

  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Restore progress
  useEffect(() => {
    if (bookId && playbackProgress[bookId] !== undefined) {
        setCurrentChunkIndex(playbackProgress[bookId]);
    }
  }, [bookId]);

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

  // TTS Logic
  useEffect(() => {
    if (isPlaying && chunks && chunks[currentChunkIndex]) {
        playChunk(chunks[currentChunkIndex].content);
    } else {
        window.speechSynthesis.cancel();
    }
         return () => {
        window.speechSynthesis.cancel();
    };
  }, [currentChunkIndex, isPlaying, chunks]);

  const playChunk = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.onend = () => {
        if (isPlaying) {
             nextChunk();
        }
    };
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePlay = () => {
    if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
    } else {
        setIsPlaying(true);
    }
  };

  const nextChunk = () => {
    if (!chunks) return;
    if (currentChunkIndex < chunks.length - 1) {
        const next = currentChunkIndex + 1;
        setCurrentChunkIndex(next);
        updateProgress(bookId!, next);
    } else {
        setIsPlaying(false);
    }
  };

  const prevChunk = () => {
      if (currentChunkIndex > 0) {
          const prev = currentChunkIndex - 1;
          setCurrentChunkIndex(prev);
          updateProgress(bookId!, prev);
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
                        onValueChange={([val]) => {
                            setRate(val);
                            // If playing, restart current chunk with new rate
                            if (isPlaying && chunks) playChunk(chunks[currentChunkIndex].content);
                        }}
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
