import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { STRINGS } from "@/lib/constants/strings";

interface TTSConfigurationProps {
  provider: "browser" | "gemini" | "openai";
  setProvider: (provider: "browser" | "gemini" | "openai") => void;
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
            <SelectItem value="browser">{STRINGS.PROVIDER_BROWSER}</SelectItem>
            <SelectItem value="gemini">{STRINGS.PROVIDER_GEMINI}</SelectItem>
            <SelectItem value="openai">{STRINGS.PROVIDER_OPENAI}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {provider === "gemini" && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {STRINGS.LABEL_GEMINI_KEY}
          </label>
          <Input
            type="password"
            placeholder={STRINGS.PLACEHOLDER_GEMINI_KEY}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-[0.8rem] text-muted-foreground">
            {STRINGS.KEY_STORAGE_NOTICE}
          </p>
        </div>
      )}

      {provider === "openai" && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {STRINGS.LABEL_OPENAI_KEY}
          </label>
          <Input
            type="password"
            placeholder={STRINGS.PLACEHOLDER_OPENAI_KEY}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-[0.8rem] text-muted-foreground">
            {STRINGS.KEY_STORAGE_NOTICE}
          </p>
        </div>
      )}
    </div>
  );
}
