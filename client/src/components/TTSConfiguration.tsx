import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TTSConfigurationProps {
  provider: "browser" | "gemini";
  setProvider: (provider: "browser" | "gemini") => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export function TTSConfiguration({
  provider,
  setProvider,
  apiKey,
  setApiKey,
}: TTSConfigurationProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          TTS Provider
        </label>
        <Select
          value={provider}
          onValueChange={(value) => setProvider(value as "browser" | "gemini")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="browser">Browser Native (Offline)</SelectItem>
            <SelectItem value="gemini">Google Gemini (High Quality)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {provider === "gemini" && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Gemini API Key
          </label>
          <Input
            type="password"
            placeholder="Enter your Gemini API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-[0.8rem] text-muted-foreground">
            Your key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
      )}
    </div>
  );
}
