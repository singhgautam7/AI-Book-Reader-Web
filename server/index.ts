import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ParserService } from "./services/parser";
import { ChunkingService } from "./services/chunker";
import { Book, TextChunk } from "@ai-book-reader/shared";

const app = express();
const PORT = process.env.PORT || 3000;

// Services
const parserService = new ParserService();
const chunkingService = new ChunkingService();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory store for MVP
const books: Record<string, Book> = {};
const bookChunks: Record<string, TextChunk[]> = {};

// Verify uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Sanitize filename
        const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_');
        cb(null, `${Date.now()}-${safeName}`);
    },
});

const upload = multer({ storage });

// Routes
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { path: filePath, mimetype, originalname } = req.file;

        // 1. Parse Text
        let text = "";
        try {
            text = await parserService.parseFile(filePath, mimetype);
        } catch (e) {
            console.error("Parsing error", e);
            return res.status(500).json({ error: "Failed to parse file" });
        }

        // 2. Chunk Text
        const textChunks = chunkingService.chunkText(text);

        // 3. Create Book Object
        const bookId = crypto.randomUUID();
        const book: Book = {
            id: bookId,
            title: originalname.replace(/\.[^/.]+$/, ""),
            uploadDate: new Date().toISOString(),
            fileType: mimetype === "application/pdf" ? "pdf" : "epub",
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

        // Cleanup uploaded file (optional, but good for MVP to keep disk clean)
        // fs.unlinkSync(filePath);

        res.json({ book, chunks: bookChunks[bookId] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/books/:id", (req, res) => {
    const book = books[req.params.id];
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
});

app.get("/api/books/:id/chunks", (req, res) => {
    const chunks = bookChunks[req.params.id];
    if (!chunks) return res.status(404).json({ error: "Book chunks not found" });
    res.json(chunks);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
