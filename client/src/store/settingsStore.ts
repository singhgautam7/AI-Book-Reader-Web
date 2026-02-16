import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BrowserSettings {
    voiceURI: string | null;
    rate: number;
    pitch: number;
}

export interface ElevenLabsSettings {
    voiceId: string;
    modelId: string;
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
}

export interface OpenAISettings {
    voice: string;
    speed: number;
    model: string;
}

export interface GeminiSettings {
    voiceName: string;
}

interface SettingsState {
    autoPlay: boolean;
    setAutoPlay: (autoPlay: boolean) => void;

    testingMode: boolean;
    setTestingMode: (enabled: boolean) => void;

    // Browser Settings
    browserSettings: BrowserSettings;
    setBrowserSettings: (settings: Partial<BrowserSettings>) => void;

    // ElevenLabs Settings
    elevenLabsSettings: ElevenLabsSettings;
    setElevenLabsSettings: (settings: Partial<ElevenLabsSettings>) => void;

    // OpenAI Settings
    openAISettings: OpenAISettings;
    setOpenAISettings: (settings: Partial<OpenAISettings>) => void;

    // Gemini Settings
    geminiSettings: GeminiSettings;
    setGeminiSettings: (settings: Partial<GeminiSettings>) => void;

    resetProviderSettings: (provider: 'browser' | 'elevenlabs' | 'openai' | 'gemini') => void;

    sampleText: string;
    setSampleText: (text: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            autoPlay: true,
            setAutoPlay: (autoPlay) => set({ autoPlay }),

            testingMode: false,
            setTestingMode: (testingMode) => set({ testingMode }),

            browserSettings: {
                voiceURI: null,
                rate: 1,
                pitch: 1,
            },
            setBrowserSettings: (settings) => set((state) => ({
                browserSettings: { ...state.browserSettings, ...settings }
            })),

            elevenLabsSettings: {
                // Rachel is a good default, but maybe "Jessica" or "Bill" or "Brian" or "Sarah"
                voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
                modelId: "eleven_multilingual_v2", // Updated from v1 (deprecated)
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0,
                useSpeakerBoost: true,
            },
            setElevenLabsSettings: (settings) => set((state) => ({
                elevenLabsSettings: { ...state.elevenLabsSettings, ...settings }
            })),

            openAISettings: {
                voice: "alloy",
                speed: 1.0,
                model: "tts-1",
            },
            setOpenAISettings: (settings) => set((state) => ({
                openAISettings: { ...state.openAISettings, ...settings }
            })),

            geminiSettings: {
                voiceName: "en-US-Journey-F", // Example default
            },
            setGeminiSettings: (settings) => set((state) => ({
                geminiSettings: { ...state.geminiSettings, ...settings }
            })),

            resetProviderSettings: (provider) => set(() => {
                switch (provider) {
                    case 'browser':
                        return { browserSettings: { voiceURI: null, rate: 1, pitch: 1 } };
                    case 'elevenlabs':
                        return {
                            elevenLabsSettings: {
                                voiceId: "21m00Tcm4TlvDq8ikWAM",
                                modelId: "eleven_multilingual_v2",
                                stability: 0.5,
                                similarityBoost: 0.75,
                                style: 0,
                                useSpeakerBoost: true,
                            }
                        };
                    case 'openai':
                        return { openAISettings: { voice: "alloy", speed: 1.0, model: "tts-1" } };
                    case 'gemini':
                        return { geminiSettings: { voiceName: "en-US-Journey-F" } };
                    default:
                        return {};
                }
            }),

            sampleText: "Once upon a time, deep in a quiet forest, a young girl followed a narrow path that shimmered in the golden evening light. Suddenly, a distant howl echoed through the trees, sending a shiver down her spine as she realized she was no longer alone.",
            setSampleText: (sampleText) => set({ sampleText }),
        }),
        {
            name: 'app-settings',
        }
    )
);
