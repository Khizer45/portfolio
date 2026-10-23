import { cn } from "@/lib/format";

export function Container({
  className,
  narrow,
  children,
}: {
  className?: string;
  /** Reading width for long-form text. */
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", narrow ? "max-w-3xl" : "max-w-6xl", className)}>
      {children}
    </div>
  );
}
