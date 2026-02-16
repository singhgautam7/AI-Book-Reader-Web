import { useState, useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function Settings() {
  const settings = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

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

  const handleSave = () => {
    if (!localSettings.sampleText.trim()) {
        toast.error("Testing mode sample text cannot be empty");
        return;
    }

    // Update store with local state
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


  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your player preferences and TTS configurations.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="browser">Browser</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
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
        </TabsContent>

        {/* Browser */}
        <TabsContent value="browser">
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
        </TabsContent>

        {/* Gemini */}
        <TabsContent value="gemini">
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
        </TabsContent>

        {/* OpenAI */}
        <TabsContent value="openai">
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
        </TabsContent>

        {/* ElevenLabs */}
        <TabsContent value="elevenlabs">
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
        </TabsContent>

        {/* Testing */}
        <TabsContent value="testing">
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
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, sampleText: e.target.value }))}
                            rows={6}
                            placeholder="Enter text to be used in Testing Mode..."
                        />
                        <p className="text-sm text-muted-foreground">This text is used when Testing Mode is enabled on the home page. Must not be empty.</p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <div className="flex justify-between items-center mt-8">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset to Defaults
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
      </Tabs>
    </div>
  );
}
