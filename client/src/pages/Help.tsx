import { ExternalLink, Shield, Cpu, Cloud, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Help() {
  return (
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Help & Setup Guide</h1>
        <p className="text-xl text-muted-foreground">
          Learn how to use AI narration and configure your preferred providers.
        </p>
      </div>

      {/* What this app does */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpenIcon className="h-6 w-6" /> What is AI Book Reader?
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="leading-7">
              This application allows you to upload standard e-books (PDF and EPUB) and have them narrated to you using state-of-the-art AI voices.
              The text extraction happens entirely within your browser, ensuring your files remain private. You can choose between free offline voices
              or high-quality cloud-based AI voices from providers like Google, OpenAI, and ElevenLabs.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* How to Use */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">How to Use</h2>
        <Card>
          <CardContent className="pt-6">
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Upload a <strong>PDF</strong> or <strong>EPUB</strong> file on the Home page.</li>
              <li>Select your preferred <strong>Text-to-Speech Provider</strong> from the configuration panel.</li>
              <li>If choosing a cloud provider (Gemini, OpenAI, ElevenLabs), enter your <strong>API Key</strong>.</li>
              <li>Click <strong>Proceed to Reader</strong>.</li>
              <li>Use the player controls to listen to your book. Your progress is saved automatically.</li>
            </ol>
          </CardContent>
        </Card>
      </section>

      {/* TTS Providers */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Supported TTS Providers</h2>

        <div className="grid md:grid-cols-2 gap-6">
            {/* Browser Native */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" /> Browser Native
                    </CardTitle>
                    <CardDescription>Free, offline, standard voices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Uses the built-in speech synthesis engine of your web browser. Does not require an internet connection or API key. Voice quality depends on your operating system.
                    </p>
                    <div className="pt-2">
                        <Button variant="outline" disabled className="w-full">
                            No Setup Required
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Google Gemini */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5" /> Google Gemini
                    </CardTitle>
                    <CardDescription>Google's multimodal AI models</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Uses Google's Gemini models for speech generation. Requires an API key. Offers good quality voices with reasonable free tier limits.
                    </p>
                    <div className="pt-2">
                        <Button className="w-full" asChild>
                            <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer">
                                Get Gemini API Key <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* OpenAI */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" /> OpenAI
                    </CardTitle>
                    <CardDescription>Industry standard AI voices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Uses OpenAI's 'tts-1' and 'tts-1-hd' models. Known for very natural sounding voices (Alloy, Echo, Fable, etc.). Requires a paid OpenAI account.
                    </p>
                    <div className="pt-2">
                        <Button className="w-full" asChild>
                            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                                Get OpenAI API Key <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ElevenLabs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" /> ElevenLabs
                    </CardTitle>
                    <CardDescription>Premium, ultra-realistic narration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Specialized voice AI with highly expressive and emotional narration. Validated for high-quality audiobooks. Free tier available (limited characters).
                    </p>
                    <div className="pt-2">
                        <Button className="w-full" asChild>
                            <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer">
                                Get ElevenLabs API Key <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </section>

      {/* Privacy */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" /> Privacy & Security
        </h2>
        <Card className="bg-muted/50">
            <CardContent className="pt-6">
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Local Processing:</strong> Your book files are processed locally in your browser and are never uploaded to our servers.</li>
                    <li><strong>API Keys:</strong> Your API keys are stored securely in your browser's local storage. They are sent directly to the respective AI providers (Google, OpenAI, ElevenLabs) and never pass through any other server.</li>
                    <li><strong>Personal Use:</strong> This application is intended for personal use to consume your own content.</li>
                </ul>
            </CardContent>
        </Card>
      </section>
    </div>
  );
}

function BookOpenIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
