import type { TTSProvider } from "./types";

export class BrowserTTSProvider implements TTSProvider {
    private utterance: SpeechSynthesisUtterance | null = null;
    private rate: number = 1;

    play(text: string, onEnd?: () => void) {
        this.stop();
        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.rate = this.rate;
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
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            // Note: Changing rate while speaking requires restarting in Web Speech API
            // For MVP we might just set it for next chunk, or complex restart logic.
            // We'll keep it simple: set for next utterance.
        }
    }
}
