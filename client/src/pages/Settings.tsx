import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("mock");

  useEffect(() => {
    const key = localStorage.getItem("ai_api_key");
    const prov = localStorage.getItem("ai_provider");
    if (key) setApiKey(key);
    if (prov) setProvider(prov);
  }, []);

  const handleSave = () => {
    localStorage.setItem("ai_api_key", apiKey);
    localStorage.setItem("ai_provider", provider);
    alert("Settings saved!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>TTS Settings</CardTitle>
          <CardDescription>Configure your AI Text-to-Speech provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
            >
                <option value="mock">Browser Native (Free, Offline)</option>
                <option value="openai">OpenAI (Coming Soon)</option>
                <option value="elevenlabs">ElevenLabs (Coming Soon)</option>
            </select>
          </div>

          {provider !== "mock" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Keys are stored locally in your browser.</p>
              </div>
          )}

          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
