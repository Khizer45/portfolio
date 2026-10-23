import {
  Bot,
  BrainCircuit,
  ChartScatter,
  Container as ContainerIcon,
  Cpu,
  Eye,
  Layers,
  LayoutTemplate,
  MessageSquareText,
  Network,
  Server,
  Sparkles,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";

import type { CategoryIcon as CategoryIconName } from "@/types/api";

type SvgProps = React.SVGProps<SVGSVGElement>;

/** GitHub mark (brand icons are not part of Lucide). */
export function GitHubIcon(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/** LinkedIn mark. */
export function LinkedInIcon(props: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const categoryIcons: Record<CategoryIconName, LucideIcon> = {
  layout: LayoutTemplate,
  server: Server,
  layers: Layers,
  chart: ChartScatter,
  brain: BrainCircuit,
  network: Network,
  eye: Eye,
  message: MessageSquareText,
  sparkles: Sparkles,
  workflow: Bot,
  container: ContainerIcon,
  cpu: Cpu,
  terminal: SquareTerminal,
};

export function CategoryIcon({ name, className }: { name: CategoryIconName; className?: string }) {
  const Icon = categoryIcons[name];
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
