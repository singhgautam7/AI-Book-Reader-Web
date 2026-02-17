import { ElevenLabsClient } from "elevenlabs";
import type { TTSProvider } from "./types";
import { toast } from "sonner";
import { generateCacheKey, getCachedAudio, setCachedAudio } from "../audioCache";

export class ElevenLabsTTSProvider implements TTSProvider {
    private client: ElevenLabsClient;
    private audioPool: HTMLAudioElement[] = [];
    private currentAudio: HTMLAudioElement | null = null;
    private rate: number = 1;
    // Default Voice ID (Rachel is a common default, or we can use '21m00Tcm4TlvDq8ikWAM' -> Rachel)
    // Let's use a standard expressive voice. "Jessica" or "Eric" are also good.
    // Using '21m00Tcm4TlvDq8ikWAM' (Rachel) as a safe default.
    private voiceId: string = "21m00Tcm4TlvDq8ikWAM";

    constructor(apiKey: string) {
        this.client = new ElevenLabsClient({
            apiKey: apiKey,
        });
    }

    static async validateAPIKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
        if (!apiKey?.trim()) return { isValid: false, error: "API key is empty" };

        try {
            const client = new ElevenLabsClient({ apiKey: apiKey });
            // Lightweight validation: List voices (limit 1 to be fast)
            await client.voices.getAll();
            return { isValid: true };
        } catch (error: any) {
            console.error("ElevenLabs API Validation Error:", error);
            let errorMessage = "Invalid ElevenLabs API key.";

            // Check for specific API error message first
            if (error?.body?.detail?.message) {
                errorMessage = error.body.detail.message;
            } else if (error?.body?.detail?.status) {
                errorMessage = `ElevenLabs Error: ${error.body.detail.status}`;
            } else if (error?.statusCode === 401) {
                errorMessage = "Invalid ElevenLabs API key. Please check your key.";
            } else if (error?.statusCode === 429) {
                errorMessage = "ElevenLabs rate limit reached. Please try again later.";
            }

            return { isValid: false, error: errorMessage };
        }
    }

    async speak(text: string, options?: any): Promise<ArrayBuffer | null> {
        if (!text.trim()) return null;

        let voiceId = options?.voiceId || this.voiceId;
        let modelId = options?.modelId || "eleven_multilingual_v2";

        // Preemptive fix for deprecated free tier models
        if (modelId === "eleven_monolingual_v1") {
            console.warn("ElevenLabs: usage of deprecated 'eleven_monolingual_v1' detected. Automatically switching to 'eleven_multilingual_v2'.");
            modelId = "eleven_multilingual_v2";
        }

        const voiceSettings = {
            stability: options?.stability ?? 0.5,
            similarity_boost: options?.similarityBoost ?? 0.75,
            style: options?.style ?? 0,
            use_speaker_boost: options?.useSpeakerBoost ?? true,
        };

        // --- Caching Logic ---
        const cacheKey = await generateCacheKey('elevenlabs', text, { voiceId, modelId, ...voiceSettings });
        const cachedAudio = await getCachedAudio(cacheKey);
        if (cachedAudio) {
            console.log('ElevenLabs: Using cached audio');
            return cachedAudio;
        }
        // ---------------------

        const requestOptions = {
            model_id: modelId,
            text: text,
            voice_settings: voiceSettings
        };

        try {
            const audioStream = await this.client.textToSpeech.convert(voiceId, requestOptions);
            const audioBuffer = await this.streamToBuffer(audioStream);

            // --- Cache the result ---
            await setCachedAudio(cacheKey, audioBuffer.buffer as ArrayBuffer, 'elevenlabs');
            // ------------------------

            return audioBuffer.buffer as ArrayBuffer;
        } catch (error: any) {
            console.error("ElevenLabs Speak Error:", error);
            throw error;
        }
    }

    async play(text: string, options?: any, onEnd?: () => void): Promise<void> {
        try {
            if (!text.trim()) {
                onEnd?.();
                return;
            }

            // Safe defaults if options missing
            const safeOptions = {
                voiceId: options?.voiceId || this.voiceId,
                modelId: options?.modelId || "eleven_multilingual_v2",
                stability: options?.stability ?? 0.5,
                similarityBoost: options?.similarityBoost ?? 0.75,
                style: options?.style ?? 0,
                useSpeakerBoost: options?.useSpeakerBoost ?? true,
            };

            let audioBuffer: ArrayBuffer | null = null;

            try {
                audioBuffer = await this.speak(text, safeOptions);
            } catch (error: any) {
                // Fallback for deprecated model
                const isDeprecated =
                    error?.body?.detail?.status === "model_deprecated_free_tier" ||
                    (error?.body?.detail?.message && error.body.detail.message.includes("deprecated"));

                if (isDeprecated) {
                    console.warn("ElevenLabs deprecated model detected. Switching to multilingual_v2.");
                    toast.error("Deprecated model. Switching to v2.");
                    safeOptions.modelId = "eleven_multilingual_v2";
                    audioBuffer = await this.speak(text, safeOptions);
                } else {
                    throw error;
                }
            }

            if (!audioBuffer) {
                throw new Error("No audio buffer received");
            }

            const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            audio.playbackRate = this.rate;

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
            // Fallback for deprecated model if the first attempt failed and wasn't caught inside
            // (Though the inner try-catch should handle it, play() issues might occur)
            // Let's refine the inner try-catch to be sure.
            console.error("ElevenLabs TTS Error:", error);

            let msg = "ElevenLabs speech generation failed.";

            if (error?.body?.detail?.message) {
                msg = error.body.detail.message;
            } else if (error?.body?.detail?.status) {
                msg = `ElevenLabs Error: ${error.body.detail.status}`;
            } else if (error?.statusCode === 401) {
                msg = "Invalid ElevenLabs API key.";
            } else if (error?.statusCode === 429) {
                msg = "ElevenLabs quota or rate limit reached.";
            } else if (error?.body?.detail?.status === "model_deprecated_free_tier" || (error?.message && error.message.includes("deprecated"))) {
                msg = "Model deprecated. Please reset settings or change model.";
            }

            toast.error(msg);
            onEnd?.();
        }
    }

    // Helper to consume the stream from SDK
    private async streamToBuffer(stream: any): Promise<Uint8Array> {
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        // Concatenate chunks
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
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
        this.audioPool.forEach(audio => {
            audio.pause();
            audio.src = "";
        });
        this.audioPool = [];
    }

    setRate(rate: number): void {
        this.rate = rate;
        if (this.currentAudio) {
            this.currentAudio.playbackRate = rate;
        }
    }

    private cleanupAudio(audio: HTMLAudioElement) {
        const index = this.audioPool.indexOf(audio);
        if (index > -1) {
            this.audioPool.splice(index, 1);
        }
    }
}
