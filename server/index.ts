import path from "path";
import fs from "fs";
import { ParserService } from "./services/parser";
import { ChunkingService } from "./services/chunker";
import type { Book, TextChunk } from "@ai-book-reader/shared";

const PORT = parseInt(process.env.PORT || "3000");

import { ExtractionService } from "./services/extractor";

// Services
const parserService = new ParserService();
const chunkingService = new ChunkingService();
const extractionService = new ExtractionService();

// In-memory store for MVP
const books: Record<string, Book> = {};
const bookChunks: Record<string, TextChunk[]> = {};

// Verify uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// CORS Helper
function corsHeaders(origin: string | null) {
    return {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

// Routes
console.log(`Server running on http://localhost:${PORT}`);

Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const method = req.method;
        const headers = corsHeaders(req.headers.get("Origin"));

        // Handle CORS Preflight
        if (method === "OPTIONS") {
            return new Response(null, { headers });
        }

        // Health Check
        if (method === "GET" && url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        // Upload Route
        if (method === "POST" && url.pathname === "/api/upload") {
            console.log("Received upload request");
            try {
                const formData = await req.formData();
                const file = formData.get("book");

                if (!file || !(file instanceof File)) {
                    console.error("No file in request");
                    return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
                }

                console.log("File received:", file.name, file.type, file.size);

                // Write to disk
                const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');
                const filename = `${Date.now()}-${safeName}`;
                const filePath = path.join(UPLOADS_DIR, filename);

                console.log("Writing file to:", filePath);
                await Bun.write(filePath, file);

                // 1. Parse Text
                let text = "";
                try {
                    text = await parserService.parseFile(filePath, file.type);
                } catch (e) {
                    console.error("Parsing error", e);
                    try { fs.unlinkSync(filePath); } catch { }
                    return new Response(JSON.stringify({ error: "Failed to parse file" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
                }

                // 2. Chunk Text
                const textChunks = chunkingService.chunkText(text);

                // 3. Create Book Object
                const bookId = crypto.randomUUID();
                const book: Book = {
                    id: bookId,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    uploadDate: new Date().toISOString(),
                    fileType: file.type === "application/pdf" ? "pdf" : "epub",
                    totalChunks: textChunks.length,
                };

                // 4. Store Data
                books[bookId] = book;
                bookChunks[bookId] = textChunks.map((content, index) => ({
                    id: crypto.randomUUID(),
                    bookId,
                    content,
                    index,
                }));

                // Cleanup
                try { fs.unlinkSync(filePath); } catch { }

                return new Response(JSON.stringify({ book, chunks: bookChunks[bookId] }), {
                    headers: { ...headers, "Content-Type": "application/json" }
                });

            } catch (error) {
                console.error("Upload handler error:", error);
                return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
            }
        }

        // Get Book Meta
        if (method === "GET" && url.pathname.startsWith("/api/books/") && !url.pathname.includes("/chunks")) {
            const parts = url.pathname.split("/");
            const bookId = parts[3];
            if (!bookId) {
                return new Response(JSON.stringify({ error: "Invalid book ID" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
            }
            const book = books[bookId];
            if (!book) {
                return new Response(JSON.stringify({ error: "Book not found" }), { status: 404, headers: { ...headers, "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify(book), { headers: { ...headers, "Content-Type": "application/json" } });
        }

        // Get Book Chunks
        if (method === "GET" && url.pathname.match(/\/api\/books\/.*\/chunks/)) {
            const parts = url.pathname.split("/");
            const bookId = parts[3];
            if (!bookId || !books[bookId]) {
                return new Response(JSON.stringify({ error: "Book chunks not found" }), { status: 404, headers: { ...headers, "Content-Type": "application/json" } });
            }
            const chunks = bookChunks[bookId];
            return new Response(JSON.stringify(chunks), { headers: { ...headers, "Content-Type": "application/json" } });
        }

        // Extract Route
        if (method === "POST" && url.pathname === "/api/extract-article") {
            try {
                const body = await req.json();
                const targetUrl = body.url;

                if (!targetUrl) {
                    return new Response(JSON.stringify({ success: false, error: "URL is required" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
                }

                // Validate URL format
                try {
                    new URL(targetUrl);
                } catch {
                    return new Response(JSON.stringify({ success: false, error: "Please enter a valid URL." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
                }

                console.log("Extracting content from:", targetUrl);
                const { title, textContent, excerpt, siteName, length, domain } = await extractionService.extractFromUrl(targetUrl);

                // Chunk Text
                const textChunks = chunkingService.chunkText(textContent);

                if (textChunks.length === 0) {
                    return new Response(JSON.stringify({ success: false, error: "Unable to extract readable article content from this link." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
                }

                // Create Book Object (Link type)
                const bookId = crypto.randomUUID();
                const book: Book = {
                    id: bookId,
                    title,
                    uploadDate: new Date().toISOString(),
                    fileType: "link",
                    totalChunks: textChunks.length,
                    url: targetUrl,
                    provider: "browser",
                    sourceDomain: domain,
                };

                // Store Data
                books[bookId] = book;
                bookChunks[bookId] = textChunks.map((chunkContent, index) => ({
                    id: crypto.randomUUID(),
                    bookId,
                    content: chunkContent,
                    index,
                }));

                // Return structured response
                return new Response(JSON.stringify({
                    success: true,
                    title,
                    text: textContent,
                    excerpt,
                    siteName,
                    length,
                    book,
                    chunks: bookChunks[bookId]
                }), {
                    headers: { ...headers, "Content-Type": "application/json" }
                });

            } catch (error: any) {
                console.error("Extraction handler error:", error);
                let errorMessage = "Unable to extract readable content.";
                const msg = error.message || "";
                if (msg.includes("403") || msg.includes("401")) {
                    errorMessage = "This site is behind a paywall or requires login. Try a publicly accessible link.";
                } else if (msg.includes("404")) {
                    errorMessage = "Page not found. Please check the URL and try again.";
                } else if (msg.includes("Failed to fetch") || msg.includes("fetch")) {
                    errorMessage = "Could not reach this website. Please check the URL or try again later.";
                } else if (msg.includes("Unable to extract")) {
                    errorMessage = msg;
                } else if (msg) {
                    errorMessage = msg;
                }
                return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
            }
        }

        return new Response("Not Found", { status: 404, headers });
    },
});
