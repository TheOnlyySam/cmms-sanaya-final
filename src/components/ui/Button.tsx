import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "teal" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", asChild = false, loading = false, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  if (asChild) {
    return (
      <Comp className={cn("btn", `btn-${variant}`, `btn-${size}`, className)} {...props}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp className={cn("btn", `btn-${variant}`, `btn-${size}`, className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="btn-icon spin" aria-hidden="true" /> : null}
      {children}
    </Comp>
  );
}
