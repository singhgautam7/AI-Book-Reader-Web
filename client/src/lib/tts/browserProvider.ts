import type { TTSProvider } from "./types";

export class BrowserTTSProvider implements TTSProvider {
    private utterance: SpeechSynthesisUtterance | null = null;
    private rate: number = 1;

    async speak(text: string, options?: any): Promise<ArrayBuffer | null> {
        // Browser TTS doesn't give us the audio buffer easily
        return null;
    }

    async play(text: string, options?: any, onEnd?: () => void): Promise<void> {
        this.stop();
        this.utterance = new SpeechSynthesisUtterance(text);

        // Apply options
        this.utterance.rate = options?.rate || this.rate;
        if (options?.pitch) {
            this.utterance.pitch = options.pitch;
        }
        if (options?.voiceURI) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.voiceURI === options.voiceURI);
            if (voice) {
                this.utterance.voice = voice;
            }
        }

        if (onEnd) {
            this.utterance.onend = onEnd;
        }
        window.speechSynthesis.speak(this.utterance);
    }

    pause() {
        window.speechSynthesis.pause();
    }

    resume() {
        window.speechSynthesis.resume();
    }

    stop() {
        window.speechSynthesis.cancel();
    }

    setRate(rate: number) {
        this.rate = rate;
        // Browser TTS rate is dynamic per utterance, usually needs validation
    }
}
