export class ChunkingService {
    private static CHUNK_SIZE = 2000; // characters

    chunkText(text: string): string[] {
        // 1. Clean text
        const cleanText = text
            .replace(/\s+/g, " ") // normalize whitespace
            .trim();

        // 2. Split into sentences (naive)
        // We want to avoid splitting mid-sentence.
        const sentences = cleanText.match(/[^.!?]+[.!?]+|\s*$/g) || [cleanText];

        const chunks: string[] = [];
        let currentChunk = "";

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > ChunkingService.CHUNK_SIZE) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = "";
                }
                // If a single sentence is too long, we must split it hard
                if (sentence.length > ChunkingService.CHUNK_SIZE) {
                    const subChunks = sentence.match(new RegExp(`.{1,${ChunkingService.CHUNK_SIZE}}`, 'g')) || [sentence];
                    chunks.push(...subChunks);
                } else {
                    currentChunk = sentence;
                }
            } else {
                currentChunk += sentence;
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}
