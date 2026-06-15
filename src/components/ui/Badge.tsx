import type { ReactNode } from "react";

type Tone = "teal" | "blue" | "green" | "amber" | "red" | "purple" | "neutral";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
