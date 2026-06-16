"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell">
      <section className="error-panel">
        <div className="error-icon">
          <AlertCircle size={24} />
        </div>
        <div>
          <h1>Something needs attention</h1>
          <p>{error.message || "The CMMS view could not load. Please try again."}</p>
          {error.digest ? <code>{error.digest}</code> : null}
        </div>
        <Button variant="teal" onClick={reset}>
          <RotateCcw size={16} />
          Try Again
        </Button>
      </section>
    </main>
  );
}
