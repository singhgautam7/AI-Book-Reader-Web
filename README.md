# AI Audiobook Reader

A modern, production-ready MVP web application for listening to books (PDF/EPUB) using AI Text-to-Speech. Built with **Bun**, **React**, and **Express**.

## Features

- **Upload Books**: Support for PDF and EPUB files.
- **AI Narration**: Listen to your books with natural-sounding TTS (Mock provider included, extensible for OpenAI/ElevenLabs).
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and shadcn/ui.
- **Dark Mode**: Toggle between light and dark themes.
- **Local Library**: Your books are stored and managed locally in the current session (with metadata persistence).
- **Privacy Focused**: No external cloud storage.

## Tech Stack

- **Runtime**: Bun (v1.1+)
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Query
- **Backend**: Express, Multer, pdf-parse, epubjs

## Getting Started

### Prerequisites

- **Bun** must be installed.
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

### Installation

1. Clone the repository (if applicable) or navigate to the project folder.
2. Install dependencies:
   ```bash
   bun install
   ```

### Running the App

Start both the frontend and backend with a single command:

```bash
bun run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## Architecture

- `client/`: React application (Vite)
- `server/`: Express backend (Bun)
- `shared/`: Shared TypeScript types

## License

Personal Use Only.
