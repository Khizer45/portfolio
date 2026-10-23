"use client";

import {
  Activity,
  Award,
  BookOpen,
  Briefcase,
  FolderKanban,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Shapes,
  Sparkles,
  Tags,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/features/admin/auth";
import { useToast } from "@/features/admin/toast";
import { cn } from "@/lib/format";

const NAV = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Content",
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/skills", label: "Skills", icon: Sparkles },
      { href: "/admin/experience", label: "Experience", icon: Briefcase },
      { href: "/admin/certifications", label: "Certifications", icon: Award },
      { href: "/admin/education", label: "Education", icon: GraduationCap },
      { href: "/admin/achievements", label: "Awards & publications", icon: Trophy },
      { href: "/admin/articles", label: "Articles", icon: PenLine },
    ],
  },
  {
    title: "Organize",
    items: [
      { href: "/admin/project-categories", label: "Project categories", icon: Shapes },
      { href: "/admin/skill-categories", label: "Skill categories", icon: BookOpen },
      { href: "/admin/technologies", label: "Technologies", icon: Tags },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/profile", label: "Profile", icon: UserRound },
      { href: "/admin/account", label: "Account & password", icon: KeyRound },
      { href: "/admin/activity", label: "Activity log", icon: Activity },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function Nav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="space-y-6">
      {NAV.map((group) => (
        <div key={group.title}>
          <p className="px-3 font-mono text-[0.68rem] tracking-[0.14em] text-fg-subtle uppercase">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-accent-soft font-medium text-fg" : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-accent" : "text-fg-subtle")} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  // The drawer is hidden from lg up; left open past that breakpoint it would be an invisible modal.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && drawerRef.current?.close();
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await auth.logout();
      router.replace("/admin/login");
    } catch {
      toast.error("Sign-out failed. Please try again.");
      setSigningOut(false);
    }
  }

  const user = auth.status === "authenticated" ? auth.user : null;
  const footer = (
    <div className="space-y-3 border-t border-line pt-4">
      {user && (
        <div className="px-3 text-xs">
          <p className="font-medium text-fg">{user.display_name}</p>
          <p className="truncate text-fg-subtle">{user.email}</p>
        </div>
      )}
      <div className="flex items-center gap-1 px-1">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg px-2 py-2 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg">
          View site ↗
        </a>
        <ThemeToggle />
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-muted hover:text-fg disabled:opacity-50"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-line bg-surface p-4 lg:flex">
        <div>
          <Link href="/admin" className="mb-6 flex items-center gap-2 px-3 font-semibold">
            <span className="grid size-7 place-items-center rounded-md border border-accent-line bg-accent-soft font-mono text-[0.7rem] text-accent">
              CMS
            </span>
            Portfolio admin
          </Link>
          <Nav pathname={pathname} />
        </div>
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
          <Link href="/admin" className="font-semibold">
            Portfolio admin
          </Link>
          <button
            type="button"
            onClick={() => drawerRef.current?.showModal()}
            className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-muted"
            aria-label="Open admin menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </header>

        <dialog
          ref={drawerRef}
          aria-label="Admin menu"
          onClick={(event) => event.target === drawerRef.current && drawerRef.current?.close()}
          className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-line bg-surface p-4 text-fg backdrop:bg-black/50 lg:hidden"
        >
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="mb-6 flex items-center justify-between px-3">
                <span className="font-semibold">Portfolio admin</span>
                <button
                  type="button"
                  onClick={() => drawerRef.current?.close()}
                  className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-muted"
                  aria-label="Close admin menu"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <Nav pathname={pathname} onNavigate={() => drawerRef.current?.close()} />
            </div>
            {footer}
          </div>
        </dialog>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
