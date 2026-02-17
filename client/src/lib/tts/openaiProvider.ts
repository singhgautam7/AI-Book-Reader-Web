import OpenAI from "openai";
import type { TTSProvider } from "./types";
import { toast } from "sonner";
import { generateCacheKey, getCachedAudio, setCachedAudio } from "../audioCache";

export class OpenAITTSProvider implements TTSProvider {
    private client: OpenAI;
    private audioPool: HTMLAudioElement[] = [];
    private currentAudio: HTMLAudioElement | null = null;
    private rate: number = 1;

    constructor(apiKey: string) {
        this.client = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true // Enable client-side usage as requested
        });
    }

    static async validateAPIKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
        if (!apiKey?.trim()) return { isValid: false, error: "API key is empty" };

        try {
            const client = new OpenAI({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            });

            // Lightweight validation: List models
            await client.models.list();
            return { isValid: true };
        } catch (error: any) {
            console.error("OpenAI API Validation Error:", error);
            let errorMessage = "Invalid OpenAI API key.";

            if (error?.status === 401) {
                errorMessage = "Invalid OpenAI API key. Please check your key and try again.";
            } else if (error?.status === 429) {
                errorMessage = "OpenAI rate limit reached. Please try again later.";
            } else if (error?.message) {
                errorMessage = error.message;
            }

            return { isValid: false, error: errorMessage };
        }
    }

    async speak(text: string, options?: any): Promise<ArrayBuffer | null> {
        if (!text.trim()) return null;

        const voice = options?.voice || "alloy";
        const speed = options?.speed || this.rate;
        const model = options?.model || "tts-1";

        // --- Caching Logic ---
        const cacheKey = await generateCacheKey('openai', text, { voice, speed, model });
        const cachedAudio = await getCachedAudio(cacheKey);
        if (cachedAudio) {
            console.log('OpenAI: Using cached audio');
            return cachedAudio;
        }
        // ---------------------

        try {
            const response = await this.client.audio.speech.create({
                model: model,
                voice: voice,
                input: text,
                speed: speed,
            });
            const buffer = await response.arrayBuffer();

            // --- Cache the result ---
            await setCachedAudio(cacheKey, buffer, 'openai');
            // ------------------------

            return buffer;
        } catch (error) {
            console.error("OpenAI Speak Error:", error);
            throw error;
        }
    }

    async play(text: string, options?: any, onEnd?: () => void): Promise<void> {
        try {
            if (!text.trim()) {
                onEnd?.();
                return;
            }

            const safeOptions = {
                voice: options?.voice || "alloy",
                speed: options?.speed || this.rate,
                model: options?.model || "tts-1",
            };

            const audioBuffer = await this.speak(text, safeOptions);

            if (!audioBuffer) {
                throw new Error("No audio buffer returned");
            }

            const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            this.currentAudio = audio;
            this.audioPool.push(audio);

            audio.onended = () => {
                URL.revokeObjectURL(url);
                this.cleanupAudio(audio);
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                }
                onEnd?.();
            };

            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                toast.error("Error playing audio.");
                URL.revokeObjectURL(url);
                this.cleanupAudio(audio);
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                }
                onEnd?.();
            };

            await audio.play();

        } catch (error: any) {
            console.error("OpenAI TTS Error:", error);

            let msg = "OpenAI speech generation failed.";
            if (error?.status === 401) msg = "Invalid OpenAI API key.";
            else if (error?.status === 429) msg = "OpenAI rate limit reached.";

            toast.error(msg);
            onEnd?.();
        }
    }

    pause(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
    }

    resume(): void {
        if (this.currentAudio) {
            this.currentAudio.play();
        }
    }

    stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        // Cleanup all audio in pool
        this.audioPool.forEach(audio => {
            audio.pause();
            audio.src = "";
        });
        this.audioPool = [];
    }

    setRate(rate: number): void {
        // OpenAI TTS API supports speed from 0.25 to 4.0
        // We clamp it to be safe, though slider is usually 0.5-2.0
        this.rate = Math.max(0.25, Math.min(4.0, rate));

        // Note: Changing rate during playback for OpenAI requires regenerating audio
        // or using HTML5 Audio playbackRate (which might distort pitch if not preserved).
        // Since we generate audio with specific speed param, we rely on that.
        // If current audio is playing, we could adjust its playbackRate for immediate effect
        // but that might conflict with the baked-in speed.
        // For accurate results requested by user ("Natural pacing"), correct way is API param.
        // However, HTML5 Audio playbackRate is instant.
        // Let's use HTML5 rate for immediate feedback on *existing* audio,
        // and update this.rate for *future* chunks.
        if (this.currentAudio) {
            // OpenAI baking speed into audio means 1.0 playbackRate is "baked speed".
            // So we actually don't want to double apply it if we used API parameter.
            // But usually dynamic speed adjustment is expected.
            // Strategy: Use API speed=1.0 always, and control via HTML5 Audio playbackRate?
            // OpenAI Docs: "The speed of the generated audio. Select a value from 0.25 to 4.0. 1.0 is the default."
            // If we use API parameter, we can't change it mid-chunk.
            // If we use HTML5 playbackRate, it might sound "fast forwarded".
            // OpenAI's models are good, maybe API param is better for quality.
            // User requirement: "Narration must sound like a professional audiobook reader"
            // API param is best for quality.
            // For immediate feedback, we can try setting playbackRate on current audio
            // RELATIVE to what we requested? No that's too complex.
            // We will just set property for next chunk.
        }
    }

    private cleanupAudio(audio: HTMLAudioElement) {
        const index = this.audioPool.indexOf(audio);
        if (index > -1) {
            this.audioPool.splice(index, 1);
        }
    }
}
