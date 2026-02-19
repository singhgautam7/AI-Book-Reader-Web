export class ChunkingService {
    private static CHUNK_SIZE = 2000; // characters

    chunkText(text: string): string[] {
        // 1. Clean text but PRESERVE PARAGRAPHS
        // Standardize newlines to \n
        let cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        // Remove excessive whitespace but keep newlines
        // Replace multiple spaces (not newlines) with single space
        cleanText = cleanText.replace(/[ \t]+/g, " ");

        // Collapse 3+ newlines to 2 (paragraph break)
        cleanText = cleanText.replace(/\n{3,}/g, "\n\n");

        // Trim
        cleanText = cleanText.trim();

        // 2. Split into sentences
        // We need to be careful not to split "\n\n" if we want to preserve it.
        // The original regex `/[^.!?]+[.!?]+|\s*$/g` matches sequences.
        // It might consume newlines.

        // Strategy: Split by paragraph first, then by sentence?
        // Or just let the sentence splitter run and hope it matches correctly.
        // If we have "Hello.\n\nWorld.",
        // regex `[^.!?]+[.!?]+` matches "Hello."
        // formatting between matches might be lost if we just use `match`.

        // Better approach: Split by delimiters but keep delimiters.
        // But for simplicity and minimal risk while improving reader:
        // We will try to preserve "\n\n" within the chunks.

        // Let's use a simpler sentence splitter that preserves whitespace?
        // Actually, if we just want to render paragraphs in Reader, we can just ensure
        // chunks don't break paragraphs unnecessarily, OR we accept that chunks are just streams of text.
        // If `cleanText` has `\n\n`, and we use `match`, the `\n\n` might not be captured if it's "between" sentences?
        // Wait, `match` returns array of matches. If there is stuff between matches, it is lost!
        // The original regex `/[^.!?]+[.!?]+|\s*$/g` relies on the fact that `\s*$` catches the end.
        // It doesn't catch whitespace between sentences!
        // Example: "Hi.  Bye." -> match "Hi." -> match "Bye." -> spaces lost?
        // Actually, `cleanText` in original code had `replace(/\s+/g, " ")` so it had NO internal newlines.

        // To preserve formatting, we need to capture separators too.
        // Or just split by `\n\n` (paragraphs) first.

        const paragraphs = cleanText.split("\n\n");
        const chunks: string[] = [];
        let currentChunk = "";

        for (const paragraph of paragraphs) {
            // Process each paragraph
            // We can optionally split large paragraphs into sentences

            // Re-add the paragraph break if it's not the first one in the chunk
            const prefix = currentChunk ? "\n\n" : "";

            if ((currentChunk + prefix + paragraph).length <= ChunkingService.CHUNK_SIZE) {
                currentChunk += prefix + paragraph;
                continue;
            }

            // Paragraph is too big or fits but overflows chunk
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }

            // Validating if paragraph fits alone
            if (paragraph.length <= ChunkingService.CHUNK_SIZE) {
                currentChunk = paragraph;
            } else {
                // Hard split logic for giant paragraphs (using sentence splitter or char splitter)
                const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+(\s+|$)/g) || [paragraph];

                for (const sentence of sentences) {
                    if ((currentChunk + sentence).length > ChunkingService.CHUNK_SIZE) {
                        if (currentChunk) {
                            chunks.push(currentChunk.trim());
                            currentChunk = "";
                        }
                        // If sentence itself is huge
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
            }
        }

        if (currentChunk) chunks.push(currentChunk.trim());

        return chunks;
    }
}
