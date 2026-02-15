import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookStore } from "@/store/bookStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, Play, Trash2 } from "lucide-react";
import type { Book as BookType } from "@ai-book-reader/shared";

export default function Home() {
  const navigate = useNavigate();
  const { books, addBook, removeBook } = useBookStore();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      const newBook: BookType = data.book;
      addBook(newBook);
      navigate(`/reader/${newBook.id}`);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload book");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Your Library</h1>
        <Card>
          <CardHeader>
            <CardTitle>Upload New Book</CardTitle>
            <CardDescription>Supported formats: PDF, EPUB (Max 100MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <div className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:bg-accent/50 transition-colors">
                 <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.epub"
                    onChange={handleFileChange}
                    disabled={uploading}
                 />
                 <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UploadCloud className="w-8 h-8" />
                    <span className="text-sm font-medium">{uploading ? "Uploading..." : "Click or drag to upload"}</span>
                 </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <Card key={book.id}>
            <CardHeader className="pb-3">
              <CardTitle className="leading-tight truncate" title={book.title}>
                {book.title}
              </CardTitle>
              <CardDescription>{new Date(book.uploadDate).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground">
                    {book.totalChunks} chunks • {book.fileType.toUpperCase()}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" size="icon" onClick={() => removeBook(book.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
              <Button onClick={() => navigate(`/reader/${book.id}`)}>
                <Play className="w-4 h-4 mr-2" />
                Read
              </Button>
            </CardFooter>
          </Card>
        ))}
        {books.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
                No books yet. Upload one to get started!
            </div>
        )}
      </section>
    </div>
  );
}
