import { Eyebrow } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-line">
      <Container className="relative pt-16 pb-12 sm:pt-24 sm:pb-16">
        {eyebrow && (
          <Eyebrow className="animate-enter mb-4">{eyebrow}</Eyebrow>
        )}
        <h1
          className="animate-enter max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          style={{ "--delay": "60ms" } as React.CSSProperties}
        >
          {title}
        </h1>
        {description && (
          <div
            className="animate-enter mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-fg-muted"
            style={{ "--delay": "120ms" } as React.CSSProperties}
          >
            {description}
          </div>
        )}
        {children && (
          <div className="animate-enter mt-8" style={{ "--delay": "180ms" } as React.CSSProperties}>
            {children}
          </div>
        )}
      </Container>
    </header>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <Heading id={id} className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </Heading>
        {description && <p className="mt-3 leading-relaxed text-pretty text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
