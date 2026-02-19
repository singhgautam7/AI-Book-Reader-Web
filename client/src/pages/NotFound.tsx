import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center py-20 px-4">
      <Card className="max-w-md w-full text-center shadow-lg">
        <CardContent className="pt-10 pb-10 space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <SearchX className="h-10 w-10 text-muted-foreground" />
          </div>

          {/* Error Code */}
          <div>
            <h1 className="text-7xl font-extrabold tracking-tighter text-foreground">
              404
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Page not found
            </p>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>

          {/* Home Button */}
          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
