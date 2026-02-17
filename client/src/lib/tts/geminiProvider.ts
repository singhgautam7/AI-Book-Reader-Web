import type { TTSProvider } from "./types";
import { toast } from "sonner";
import { GoogleGenAI } from "@google/genai";
import { generateCacheKey, getCachedAudio, setCachedAudio } from "../audioCache";

export class GeminiTTSProvider implements TTSProvider {
    private client: GoogleGenAI;
    private audioPool: HTMLAudioElement[] = [];
    private currentAudio: HTMLAudioElement | null = null;
    private rate: number = 1;

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
    }

    static async validateAPIKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
        try {
            const client = new GoogleGenAI({ apiKey });
            await client.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{
                    role: 'user',
                    parts: [{ text: 'Hi' }]
                }]
            });
            return { isValid: true };
        } catch (error: any) {
            console.error("Gemini Validation Error:", error);

            let errorMessage = "Invalid API Key or Network Error";

            if (error.status === 429 || error.message?.includes("429") || error.message?.includes("Quota exceeded")) {
                errorMessage = "Rate limit exceeded. Please check your quota.";
            } else if (error.status === 403 || error.message?.includes("403")) {
                errorMessage = "Permission denied or Invalid API Key.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            return { isValid: false, error: errorMessage };
        }
    }

    async speak(text: string, options?: any): Promise<ArrayBuffer | null> {
        if (!text.trim()) return null;

        const voiceName = options?.voiceName || "Puck";

        // --- Caching Logic ---
        const cacheKey = await generateCacheKey('gemini', text, { voiceName });
        const cachedAudio = await getCachedAudio(cacheKey);
        if (cachedAudio) {
            console.log('Gemini: Using cached audio');
            return cachedAudio;
        }
        // ---------------------

        try {
            const response = await this.client.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: {
                    role: 'user',
                    parts: [{ text: "Please read the following text naturally: " + text }]
                },
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) return null;

            // Decode base64 to ArrayBuffer
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // --- Cache the result ---
            await setCachedAudio(cacheKey, bytes.buffer, 'gemini');
            // ------------------------

            return bytes.buffer;

        } catch (error) {
            console.error("Gemini Speak Error:", error);
            throw error;
        }
    }

    async play(text: string, options?: any, onEnd?: () => void) {
        if (!text.trim()) {
            onEnd?.();
            return;
        }

        try {
            const safeOptions = {
                voiceName: options?.voiceName || "Puck"
            };

            const audioBuffer = await this.speak(text, safeOptions);

            if (!audioBuffer) {
                toast.error("No audio returned from Gemini.");
                onEnd?.();
                return;
            }

            const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            this.currentAudio = audio;
            this.audioPool.push(audio);

            audio.playbackRate = this.rate;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.removeAudioFromPool(audio);
                onEnd?.();
            };

            audio.onerror = () => {
                console.error("Audio playback error");
                URL.revokeObjectURL(audioUrl);
                this.removeAudioFromPool(audio);
                onEnd?.();
            };

            await audio.play();

        } catch (error: any) {
            console.error("Gemini TTS Error:", error);
            if (error.message?.includes("429")) {
                toast.error("Gemini rate limit reached. Please wait.");
            } else {
                toast.error("Gemini speech generation failed.");
            }
            onEnd?.();
        }
    }

    pause() {
        this.currentAudio?.pause();
    }

    resume() {
        this.currentAudio?.play();
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        // Cleanup all audio objects
        this.audioPool.forEach(a => {
            a.pause();
            a.src = "";
        });
        this.audioPool = [];
    }

    setRate(rate: number) {
        this.rate = rate;
        if (this.currentAudio) {
            this.currentAudio.playbackRate = rate;
        }
    }



    private removeAudioFromPool(audio: HTMLAudioElement) {
        const index = this.audioPool.indexOf(audio);
        if (index > -1) {
            this.audioPool.splice(index, 1);
        }
    }
}
