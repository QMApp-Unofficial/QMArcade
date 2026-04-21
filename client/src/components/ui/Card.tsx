import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-elev", className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  right,
}: {
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3
          className="font-display text-lg sm:text-xl font-bold tracking-[-0.015em] break-words"
          style={{ fontVariationSettings: '"wdth" 88' }}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {right ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {right}
        </div>
      ) : null}
    </div>
  );
}
