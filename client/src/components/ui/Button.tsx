import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type Variant = "primary" | "secondary" | "ghost" | "destructive";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const MAP: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-destructive",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(MAP[variant], className)}
      {...rest}
    />
  );
});
