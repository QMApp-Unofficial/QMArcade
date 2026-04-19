import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg bg-foreground/[0.03] border border-border px-3 py-2.5 text-sm",
          "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
          "focus-visible:outline-none",
          className,
        )}
        style={{
          transition:
            "border-color 160ms var(--ease-out-quint), box-shadow 160ms var(--ease-out-quint), background-color 160ms var(--ease-out-quint)",
        }}
        {...rest}
      />
    );
  },
);
