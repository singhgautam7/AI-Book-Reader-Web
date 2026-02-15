import type { TTSProvider } from "./types";
import { toast } from "sonner";
import { GoogleGenAI } from "@google/genai";

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

    async play(text: string, onEnd?: () => void) {
        if (!text.trim()) {
            onEnd?.();
            return;
        }

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
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!audioData) {
                toast.error("No audio returned from Gemini.");
                onEnd?.();
                return;
            }

            const audioBlob = this.base64ToBlob(audioData, "audio/mp3");
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

    private base64ToBlob(base64: string, type: string) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    }

    private removeAudioFromPool(audio: HTMLAudioElement) {
        const index = this.audioPool.indexOf(audio);
        if (index > -1) {
            this.audioPool.splice(index, 1);
        }
    }
}
