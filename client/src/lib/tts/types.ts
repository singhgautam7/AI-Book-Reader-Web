export interface TTSProvider { // Simple interface
    play(text: string, onEnd?: () => void): void;
    pause(): void;
    resume(): void;
    stop(): void;
    setRate(rate: number): void;
}

export type TTSProviderType = "browser" | "gemini";
