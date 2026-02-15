import type { TTSProvider, TTSProviderType } from "./types";
import { BrowserTTSProvider } from "./browserProvider";
import { GeminiTTSProvider } from "./geminiProvider";
export { GeminiTTSProvider };

export function createTTSProvider(type: TTSProviderType, apiKey?: string): TTSProvider {
    if (type === "gemini") {
        if (!apiKey) {
            console.warn("Gemini provider requested but no API Key provided. Falling back to Browser.");
            return new BrowserTTSProvider();
        }
        return new GeminiTTSProvider(apiKey);
    }

    return new BrowserTTSProvider();
}

export * from "./types";
