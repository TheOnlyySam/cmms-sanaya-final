import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "teal" | "blue" | "green" | "amber" | "red" | "purple" | "neutral";

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("badge", `badge-${tone}`, className)}>{children}</span>;
}
