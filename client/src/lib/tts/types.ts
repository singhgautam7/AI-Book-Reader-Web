export interface TTSProvider {
    speak(text: string, options?: any): Promise<ArrayBuffer | null>;
    play(text: string, options?: any, onEnd?: () => void): Promise<void>;
    pause(): void;
    resume(): void;
    stop(): void;
    setRate(rate: number): void;
}

export type TTSProviderType = "browser" | "gemini" | "openai" | "elevenlabs";
