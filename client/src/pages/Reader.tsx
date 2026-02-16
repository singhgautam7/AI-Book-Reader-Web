import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBookStore } from "@/store/bookStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, SkipBack, SkipForward, ArrowLeft, Globe, Cpu, Cloud, Podcast, Loader2, Save as SaveIcon, Trash2, Settings as SettingsIcon } from "lucide-react";
import type { TextChunk } from "@ai-book-reader/shared";
import { createTTSProvider } from "@/lib/tts";
import type { TTSProvider, TTSProviderType } from "@/lib/tts";
import { toast } from "sonner";
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

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const { books, updateProgress, playbackProgress } = useBookStore();
  const settings = useSettingsStore();

  const book = books.find((b) => b.id === bookId);

  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [didAutoStart, setDidAutoStart] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Local settings for the side panel
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync local settings with store
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Load browser voices
  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
        window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const ttsProvider = useRef<TTSProvider | null>(null);

  // Initialize TTS Provider & Auto-Start Logic
  useEffect(() => {
    const providerType = (localStorage.getItem("tts_provider") as TTSProviderType) || "browser";
    let apiKey: string | undefined;

    if (providerType === "gemini") {
        apiKey = localStorage.getItem("gemini_api_key") || undefined;
    } else if (providerType === "openai") {
        apiKey = localStorage.getItem("openai_api_key") || undefined;
    } else if (providerType === "elevenlabs") {
        apiKey = localStorage.getItem("elevenlabs_api_key") || undefined;
    }

    if (apiKey) {
        try {
            apiKey = atob(apiKey);
        } catch (e) {
            console.warn("Failed to decode API key, using raw value");
        }
    }
    ttsProvider.current = createTTSProvider(providerType, apiKey);

    // Auto-start logic
    // We only want to auto-start ONCE when the component mounts and provider is ready
    if (!didAutoStart && chunks && chunks.length > 0) {
        // Logic to trigger play is in the separate chunk effect
        // We just need to set isPlaying to true, and the effect will pick it up
        // BUT, we only do this if "General -> Auto-play" doesn't conflict?
        // No, user requirement: "Start playback automatically on entering reader"
        setDidAutoStart(true);
        setIsPlaying(true);
    }

    return () => {
        ttsProvider.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount (provider init)

  // Restore progress
  useEffect(() => {
    if (bookId && playbackProgress[bookId] !== undefined) {
        setCurrentChunkIndex(playbackProgress[bookId]);
    }
  }, [bookId, playbackProgress]);

  // Fetch chunks (with Testing Mode support)
  const { data: chunks, isLoading } = useQuery<TextChunk[]>({
    queryKey: ["chunks", bookId, settings.sampleText], // Add sampleText dependency
    queryFn: async () => {
      if (!bookId) return [];

      // Testing Mode Override
      if (bookId === "testing-sample-id") {
          return [{
              id: "sample-chunk-1",
              bookId: "testing-sample-id",
              content: settings.sampleText || "No sample text available.",
              index: 0
          }];
      }

      const res = await fetch(`http://localhost:3000/api/books/${bookId}/chunks`);
      if (!res.ok) throw new Error("Failed to fetch chunks");
      return res.json();
    },
    enabled: !!bookId,
  });

  // Watch for chunks to trigger auto-start if not ready during initial mount
  useEffect(() => {
      if (!didAutoStart && chunks && chunks.length > 0) {
          setDidAutoStart(true);
          setIsPlaying(true);
      }
  }, [chunks, didAutoStart]);


  const handlePlayChunk = async (index: number) => {
      if (!ttsProvider.current || !chunks || !chunks[index]) return;

      const text = chunks[index].content;
      const providerType = (localStorage.getItem("tts_provider") || "browser") as TTSProviderType;

      // Prepare options based on STORE settings (not local panel state, unless saved)
      let options: any = {};
      if (providerType === "browser") options = settings.browserSettings;
      else if (providerType === "elevenlabs") options = settings.elevenLabsSettings;
      else if (providerType === "openai") options = settings.openAISettings;
      else if (providerType === "gemini") options = settings.geminiSettings;

      setIsGenerating(true);
      try {
          await ttsProvider.current.play(text, options, () => {
             // On End
             if (index < chunks.length - 1) {
                 if (settings.autoPlay) {
                     const next = index + 1;
                     setCurrentChunkIndex(next);
                     updateProgress(bookId!, next);
                 } else {
                     setIsPlaying(false);
                 }
             } else {
                 setIsPlaying(false);
                 toast.success("Book completed!");
             }
          });
      } catch (err) {
          console.error("Playback error:", err);
          setIsPlaying(false);
      } finally {
          setIsGenerating(false);
      }
  };

  // Playback Effect
  useEffect(() => {
    if (isPlaying && chunks && chunks[currentChunkIndex]) {
        handlePlayChunk(currentChunkIndex);
    } else {
        ttsProvider.current?.pause();
        setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentChunkIndex]);

  const togglePlay = () => {
    if (isPlaying) {
        setIsPlaying(false);
        ttsProvider.current?.pause();
    } else {
        setIsPlaying(true);
    }
  };

  const nextChunk = () => {
    if (!chunks) return;
    if (currentChunkIndex < chunks.length - 1) {
        ttsProvider.current?.stop();
        const next = currentChunkIndex + 1;
        setCurrentChunkIndex(next);
        updateProgress(bookId!, next);
    }
  };

  const prevChunk = () => {
      if (currentChunkIndex > 0) {
          ttsProvider.current?.stop();
          const prev = currentChunkIndex - 1;
          setCurrentChunkIndex(prev);
          updateProgress(bookId!, prev);
      }
  };

  const handleSavePanelSettings = () => {
      settings.setBrowserSettings(localSettings.browserSettings);
      settings.setElevenLabsSettings(localSettings.elevenLabsSettings);
      settings.setOpenAISettings(localSettings.openAISettings);
      settings.setGeminiSettings(localSettings.geminiSettings);
      settings.setAutoPlay(localSettings.autoPlay);
      toast.success("Settings saved");
  };

  const currentProvider = (localStorage.getItem("tts_provider") || "browser") as TTSProviderType;

  if (!book) return <div className="p-8">Book not found. <Link to="/" className="underline">Go back</Link></div>;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6">
       {/* LEFT: Reader Content (70%) */}
       <div className="flex-1 flex flex-col gap-6 min-w-0">
            <div className="flex items-center gap-4">
                <Link to="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div className="flex flex-col overflow-hidden">
                    <h1 className="text-xl font-bold truncate">{book.title}</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Reading with:</span>
                        <Badge variant="outline" className="gap-1 px-2 py-0 h-5 font-normal">
                            {currentProvider === 'gemini' && <><Cpu className="h-3 w-3 text-blue-500" /> Gemini</>}
                            {currentProvider === 'openai' && <><Cloud className="h-3 w-3 text-green-500" /> OpenAI</>}
                            {currentProvider === 'elevenlabs' && <><Podcast className="h-3 w-3 text-purple-500" /> ElevenLabs</>}
                            {currentProvider === 'browser' && <><Globe className="h-3 w-3 text-orange-500" /> Browser</>}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md p-6 bg-card prose dark:prose-invert max-w-none">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Loading book content...</p>
                    </div>
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
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <Button variant="outline" size="icon" onClick={prevChunk} disabled={isGenerating}>
                            <SkipBack className="w-4 h-4" />
                        </Button>

                        <Button size="icon" className="w-14 h-14 rounded-full shadow-lg" onClick={togglePlay} disabled={isGenerating && !isPlaying}>
                            {isGenerating ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : isPlaying ? (
                                <Pause className="w-6 h-6" />
                            ) : (
                                <Play className="w-6 h-6 pl-1" />
                            )}
                        </Button>

                        <Button variant="outline" size="icon" onClick={nextChunk} disabled={isGenerating}>
                            <SkipForward className="w-4 h-4" />
                        </Button>
                    </div>
                    {isGenerating && (
                         <p className="text-xs text-center text-muted-foreground animate-pulse">Generating audio...</p>
                    )}
                </div>
            </Card>
       </div>

       {/* RIGHT: Settings Panel (30%) - Increased width */}
       <Card className="w-full md:w-[350px] flex flex-col h-auto md:h-full overflow-hidden shrink-0">
           <CardHeader className="pb-3 border-b bg-muted/20">
               <CardTitle className="text-lg flex items-center gap-2">
                   <SettingsIcon className="h-5 w-5" />
                   Reader Settings
               </CardTitle>
               <CardDescription>Configure playback for {currentProvider}</CardDescription>
           </CardHeader>
           <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Auto Play */}
                <div className="space-y-3 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="panel-autoplay" className="flex flex-col gap-1">
                            <span>Auto-play next chunk</span>
                            <span className="font-normal text-xs text-muted-foreground">Successfully plays the next section.</span>
                        </Label>
                        <Switch
                            id="panel-autoplay"
                            checked={localSettings.autoPlay}
                            onCheckedChange={(c) => setLocalSettings(prev => ({ ...prev, autoPlay: c }))}
                        />
                    </div>
                </div>

                {/* Provider Specific Controls */}
                {currentProvider === 'browser' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Voice (System)</Label>
                            <Select
                                value={localSettings.browserSettings.voiceURI || ""}
                                onValueChange={(v) => setLocalSettings(prev => ({ ...prev, browserSettings: { ...prev.browserSettings, voiceURI: v } }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a voice" />
                                </SelectTrigger>
                                <SelectContent>
                                    {browserVoices.map((voice) => (
                                        <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                                            {voice.name} ({voice.lang})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[0.8rem] text-muted-foreground">Choose a voice installed on your device.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Speaking Rate</Label>
                                <span className="text-xs text-muted-foreground">{localSettings.browserSettings.rate}x</span>
                            </div>
                            <Slider
                                value={[localSettings.browserSettings.rate]}
                                min={0.5} max={2} step={0.1}
                                onValueChange={([v]) => setLocalSettings(prev => ({ ...prev, browserSettings: { ...prev.browserSettings, rate: v } }))}
                            />
                            <p className="text-[0.8rem] text-muted-foreground">Controls how fast the narration is spoken.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Pitch</Label>
                                <span className="text-xs text-muted-foreground">{localSettings.browserSettings.pitch}</span>
                            </div>
                            <Slider
                                value={[localSettings.browserSettings.pitch]}
                                min={0.5} max={2} step={0.1}
                                onValueChange={([v]) => setLocalSettings(prev => ({ ...prev, browserSettings: { ...prev.browserSettings, pitch: v } }))}
                            />
                            <p className="text-[0.8rem] text-muted-foreground">Higher values produce a higher tone.</p>
                        </div>
                    </div>
                )}

                 {currentProvider === 'openai' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Voice</Label>
                             <Select
                                value={localSettings.openAISettings.voice}
                                onValueChange={(v) => setLocalSettings(prev => ({ ...prev, openAISettings: { ...prev.openAISettings, voice: v } }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                                    <SelectItem value="echo">Echo (Warm)</SelectItem>
                                    <SelectItem value="fable">Fable (British)</SelectItem>
                                    <SelectItem value="onyx">Onyx (Deep)</SelectItem>
                                    <SelectItem value="nova">Nova (Energetic)</SelectItem>
                                    <SelectItem value="shimmer">Shimmer (Clear)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[0.8rem] text-muted-foreground">Choose narration style.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Speed</Label>
                                <span className="text-xs text-muted-foreground">{localSettings.openAISettings.speed}x</span>
                            </div>
                             <Slider
                                value={[localSettings.openAISettings.speed]}
                                min={0.25} max={4.0} step={0.25}
                                onValueChange={([v]) => setLocalSettings(prev => ({ ...prev, openAISettings: { ...prev.openAISettings, speed: v } }))}
                            />
                        </div>
                    </div>
                )}

                {currentProvider === 'elevenlabs' && (
                    <div className="space-y-4">
                         <div className="space-y-2">
                             <Label>Voice</Label>
                             <Select
                                value={localSettings.elevenLabsSettings.voiceId}
                                onValueChange={(v) => setLocalSettings(prev => ({ ...prev, elevenLabsSettings: { ...prev.elevenLabsSettings, voiceId: v } }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Voice" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel (Female)</SelectItem>
                                    <SelectItem value="pNInz6obpgDQGcFmaJgB">Adam (Male)</SelectItem>
                                </SelectContent>
                            </Select>
                             <p className="text-[0.8rem] text-muted-foreground">Select a high-quality default voice.</p>
                         </div>
                         <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Stability</Label>
                                <span className="text-xs text-muted-foreground">{localSettings.elevenLabsSettings.stability}</span>
                            </div>
                            <Slider
                                value={[localSettings.elevenLabsSettings.stability]}
                                min={0} max={1} step={0.05}
                                onValueChange={([v]) => setLocalSettings(prev => ({ ...prev, elevenLabsSettings: { ...prev.elevenLabsSettings, stability: v } }))}
                            />
                            <p className="text-[0.8rem] text-muted-foreground">Lower = more expressive, Higher = more stable.</p>
                        </div>
                         <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Similarity Boost</Label>
                                <span className="text-xs text-muted-foreground">{localSettings.elevenLabsSettings.similarityBoost}</span>
                            </div>
                             <Slider
                                value={[localSettings.elevenLabsSettings.similarityBoost]}
                                min={0} max={1} step={0.05}
                                onValueChange={([v]) => setLocalSettings(prev => ({ ...prev, elevenLabsSettings: { ...prev.elevenLabsSettings, similarityBoost: v } }))}
                            />
                            <p className="text-[0.8rem] text-muted-foreground">Controls voice match accuracy.</p>
                        </div>
                         <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Style</Label>
                                <span className="text-xs text-muted-foreground">{localSettings.elevenLabsSettings.style}</span>
                            </div>
                             <Slider
                                value={[localSettings.elevenLabsSettings.style]}
                                min={0} max={1} step={0.05}
                                onValueChange={([v]) => setLocalSettings(prev => ({ ...prev, elevenLabsSettings: { ...prev.elevenLabsSettings, style: v } }))}
                            />
                             <p className="text-[0.8rem] text-muted-foreground">Adjusts dramatic intensity.</p>
                        </div>
                    </div>
                )}

                 {currentProvider === 'gemini' && (
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <Label>Voice Name</Label>
                             <Select
                                value={localSettings.geminiSettings.voiceName}
                                onValueChange={(v) => setLocalSettings(prev => ({ ...prev, geminiSettings: { ...prev.geminiSettings, voiceName: v } }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en-US-Journey-D">Journey D (Male)</SelectItem>
                                    <SelectItem value="en-US-Journey-F">Journey F (Female)</SelectItem>
                                </SelectContent>
                            </Select>
                             <p className="text-[0.8rem] text-muted-foreground">Gemini currently provides limited voice customization.</p>
                        </div>
                    </div>
                )}

           </CardContent>
           <div className="p-4 border-t bg-muted/10 space-y-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full">
                            <SaveIcon className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Save changes?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Changes will apply when the next chunk plays or when you replay the current chunk.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSavePanelSettings}>Save</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Reset Defaults
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reset settings?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Reset {currentProvider} settings to default values.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                settings.resetProviderSettings(currentProvider);
                                toast.success("Provider settings reset");
                            }}>Reset</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
           </div>
       </Card>
    </div>
  );
}
