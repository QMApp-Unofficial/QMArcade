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
    <div className="flex items-start justify-between mb-4 gap-4">
      <div>
        <h3
          className="font-display text-xl font-bold tracking-[-0.015em]"
          style={{ fontVariationSettings: '"wdth" 88' }}
        >
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {right}
    </div>
  );
}
