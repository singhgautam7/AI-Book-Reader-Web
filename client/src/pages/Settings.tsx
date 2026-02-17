import { useState, useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { Textarea } from "../components/ui/textarea";
import { Slider } from "../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Trash2, Save, Globe, Cpu, Cloud, Podcast, Settings as SettingsIcon, TestTube } from "lucide-react";
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
import { cn } from "@/lib/utils";

export default function Settings() {
  const settings = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeSection, setActiveSection] = useState("general");

  // Sync state on mount and when store changes
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

  // Scroll spy to update active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" } // Adjust trigger zone
    );

    const sections = ["general", "browser", "gemini", "openai", "elevenlabs", "testing"];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        // Offset for sticky header (64px) + sticky nav (~60px) + breathing room
        // But scroll-margin-top is usually handled by CSS 'scroll-mt'
        element.scrollIntoView({ behavior: "smooth" });
        setActiveSection(id);
    }
  };

  const handleSave = () => {
    if (!localSettings.sampleText.trim()) {
        toast.error("Testing mode sample text cannot be empty");
        return;
    }

    settings.setAutoPlay(localSettings.autoPlay);
    settings.setSampleText(localSettings.sampleText);

    settings.setBrowserSettings(localSettings.browserSettings);
    settings.setElevenLabsSettings(localSettings.elevenLabsSettings);
    settings.setOpenAISettings(localSettings.openAISettings);
    settings.setGeminiSettings(localSettings.geminiSettings);

    toast.success("Settings saved successfully");
  };

  const handleReset = () => {
      settings.resetProviderSettings('browser');
      settings.resetProviderSettings('elevenlabs');
      settings.resetProviderSettings('openai');
      settings.resetProviderSettings('gemini');
      settings.setAutoPlay(true);
      settings.setSampleText("Once upon a time, deep in a quiet forest, a young girl followed a narrow path that shimmered in the golden evening light. Suddenly, a distant howl echoed through the trees, sending a shiver down her spine as she realized she was no longer alone.");

      toast.success("All settings restored to defaults");
  };

  // Helper to update local provider settings
  const updateBrowser = (key: keyof typeof localSettings.browserSettings, value: any) => {
      setLocalSettings(prev => ({
          ...prev,
          browserSettings: { ...prev.browserSettings, [key]: value }
      }));
  };

  const updateElevenLabs = (key: keyof typeof localSettings.elevenLabsSettings, value: any) => {
      setLocalSettings(prev => ({
          ...prev,
          elevenLabsSettings: { ...prev.elevenLabsSettings, [key]: value }
      }));
  };

  const updateOpenAI = (key: keyof typeof localSettings.openAISettings, value: any) => {
      setLocalSettings(prev => ({
          ...prev,
          openAISettings: { ...prev.openAISettings, [key]: value }
      }));
  };

  const updateGemini = (key: keyof typeof localSettings.geminiSettings, value: any) => {
      setLocalSettings(prev => ({
          ...prev,
          geminiSettings: { ...prev.geminiSettings, [key]: value }
      }));
  };

  const sections = [
      { id: "general", label: "General" },
      { id: "browser", label: "Browser" },
      { id: "gemini", label: "Gemini" },
      { id: "openai", label: "OpenAI" },
      { id: "elevenlabs", label: "ElevenLabs" },
      { id: "testing", label: "Testing" },
  ];

  return (
    <div className="container mx-auto max-w-4xl pb-24">
      {/* Header */}
      <div className="py-8 space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your player preferences and TTS configurations.</p>
      </div>

      {/* Sticky Mini Navigation */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 mb-8 border-b -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar">
            {sections.map((section, idx) => (
                <div key={section.id} className="flex items-center">
                    <Button
                        variant={activeSection === section.id ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => scrollToSection(section.id)}
                        className={cn("whitespace-nowrap transition-all", activeSection === section.id && "font-semibold")}
                    >
                        {section.label}
                    </Button>
                    {idx < sections.length - 1 && (
                        <Separator orientation="vertical" className="h-4 mx-2" />
                    )}
                </div>
            ))}
          </div>
      </div>

      <div className="space-y-12">
        {/* General */}
        <section id="general" className="scroll-mt-36">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> General Settings</CardTitle>
                    <CardDescription>Global preferences for the application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="autoplay">Auto-play Next Chunk</Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically start playing the next section when the current one finishes.
                            </p>
                        </div>
                        <Switch
                            id="autoplay"
                            checked={localSettings.autoPlay}
                            onCheckedChange={(c) => setLocalSettings(prev => ({ ...prev, autoPlay: c }))}
                        />
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* Browser */}
        <section id="browser" className="scroll-mt-36">
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Browser Settings</CardTitle>
                    <CardDescription>Configure the built-in browser text-to-speech engine.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label>Voice (System)</Label>
                        <Select
                            value={localSettings.browserSettings.voiceURI || ""}
                            onValueChange={(v) => updateBrowser("voiceURI", v)}
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
                        <p className="text-sm text-muted-foreground">Choose a voice installed on your device.</p>
                     </div>
                     <div className="space-y-2">
                        <Label>Speaking Rate: {localSettings.browserSettings.rate}x</Label>
                        <Slider
                            value={[localSettings.browserSettings.rate]}
                            min={0.5} max={2} step={0.1}
                            onValueChange={([v]) => updateBrowser("rate", v)}
                        />
                        <p className="text-sm text-muted-foreground">Controls how fast the narration is spoken.</p>
                     </div>
                     <div className="space-y-2">
                        <Label>Pitch: {localSettings.browserSettings.pitch}</Label>
                        <Slider
                            value={[localSettings.browserSettings.pitch]}
                            min={0.5} max={2} step={0.1}
                            onValueChange={([v]) => updateBrowser("pitch", v)}
                        />
                        <p className="text-sm text-muted-foreground">Higher values produce a higher tone.</p>
                     </div>
                </CardContent>
            </Card>
        </section>

        {/* Gemini */}
        <section id="gemini" className="scroll-mt-36">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Gemini Settings</CardTitle>
                    <CardDescription>Configure Google's Gemini TTS model.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Voice Name</Label>
                         <Select
                            value={localSettings.geminiSettings.voiceName}
                            onValueChange={(v) => updateGemini("voiceName", v)}
                        >
                            <SelectTrigger><SelectValue placeholder="Select Voice" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en-US-Journey-D">Journey D (Male)</SelectItem>
                                <SelectItem value="en-US-Journey-F">Journey F (Female)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">Gemini currently provides limited voice customization.</p>
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* OpenAI */}
        <section id="openai" className="scroll-mt-36">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> OpenAI Settings</CardTitle>
                    <CardDescription>Configure OpenAI's TTS models.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Voice</Label>
                             <Select
                                value={localSettings.openAISettings.voice}
                                onValueChange={(v) => updateOpenAI("voice", v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Voice" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                                    <SelectItem value="echo">Echo (Warm)</SelectItem>
                                    <SelectItem value="fable">Fable (British)</SelectItem>
                                    <SelectItem value="onyx">Onyx (Deep)</SelectItem>
                                    <SelectItem value="nova">Nova (Energetic)</SelectItem>
                                    <SelectItem value="shimmer">Shimmer (Clear)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">Choose narration style.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Model</Label>
                             <Select
                                value={localSettings.openAISettings.model}
                                onValueChange={(v) => updateOpenAI("model", v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tts-1">TTS-1 (Standard)</SelectItem>
                                    <SelectItem value="tts-1-hd">TTS-1 HD (High Quality)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Speed: {localSettings.openAISettings.speed}x</Label>
                        <Slider
                            value={[localSettings.openAISettings.speed]}
                            min={0.25} max={4.0} step={0.25}
                            onValueChange={([v]) => updateOpenAI("speed", v)}
                        />
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* ElevenLabs */}
        <section id="elevenlabs" className="scroll-mt-36">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Podcast className="h-5 w-5" /> ElevenLabs Settings</CardTitle>
                    <CardDescription>Configure ElevenLabs' high-fidelity voice engine.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                         <Label>Voice</Label>
                         <Select
                            value={localSettings.elevenLabsSettings.voiceId}
                            onValueChange={(v) => updateElevenLabs("voiceId", v)}
                        >
                            <SelectTrigger><SelectValue placeholder="Select Voice" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel (Female)</SelectItem>
                                <SelectItem value="pNInz6obpgDQGcFmaJgB">Adam (Male)</SelectItem>
                            </SelectContent>
                        </Select>
                         <p className="text-xs text-muted-foreground">Select a high-quality default voice.</p>
                    </div>

                    <div className="space-y-6 pt-4 border-t">
                        <div className="space-y-2">
                            <Label>Stability: {localSettings.elevenLabsSettings.stability}</Label>
                            <Slider
                                value={[localSettings.elevenLabsSettings.stability]}
                                min={0} max={1} step={0.05}
                                onValueChange={([v]) => updateElevenLabs("stability", v)}
                            />
                            <p className="text-sm text-muted-foreground">Lower values produce more expressive speech. Higher values produce more stable speech.</p>
                        </div>
                         <div className="space-y-2">
                            <Label>Similarity Boost: {localSettings.elevenLabsSettings.similarityBoost}</Label>
                            <Slider
                                value={[localSettings.elevenLabsSettings.similarityBoost]}
                                min={0} max={1} step={0.05}
                                onValueChange={([v]) => updateElevenLabs("similarityBoost", v)}
                            />
                            <p className="text-sm text-muted-foreground">Controls how closely the generated voice matches the original voice.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Style: {localSettings.elevenLabsSettings.style}</Label>
                             <Slider
                                value={[localSettings.elevenLabsSettings.style]}
                                min={0} max={1} step={0.05}
                                onValueChange={([v]) => updateElevenLabs("style", v)}
                            />
                            <p className="text-sm text-muted-foreground">Adjusts dramatic intensity of delivery.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* Testing */}
        <section id="testing" className="scroll-mt-36">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TestTube className="h-5 w-5" /> Testing Mode Settings</CardTitle>
                    <CardDescription>Configure the sample text used for testing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Sample Narration Text</Label>
                        <Textarea
                            value={localSettings.sampleText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalSettings(prev => ({ ...prev, sampleText: e.target.value }))}
                            rows={6}
                            placeholder="Enter text to be used in Testing Mode..."
                        />
                        <p className="text-sm text-muted-foreground">This text is used when Testing Mode is enabled on the home page. Must not be empty.</p>
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* Actions */}
        <div className="flex justify-end items-center gap-4 mt-8">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset Defaults
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will restore all general and provider-specific settings to their default values. The page will refresh.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your preferences will be saved to your browser's local storage.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
    </div>
  );
}
