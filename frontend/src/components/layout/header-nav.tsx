"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/format";

type NavItem = { label: string; href: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu after navigating.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => desktop.matches && setOpen(false);
    const previousOverflow = document.body.style.overflow;
    // The menu covers the page: keep Tab from reaching the hidden content behind it.
    const behind = document.querySelectorAll<HTMLElement>("#main, body > footer");
    behind.forEach((el) => (el.inert = true));
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      behind.forEach((el) => (el.inert = false));
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center gap-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "font-medium text-fg after:absolute after:inset-x-3 after:-bottom-[13px] after:h-px after:bg-accent"
                      : "text-fg-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/contact"
          className="hidden h-9 items-center gap-1.5 rounded-lg bg-accent-fill px-3.5 text-sm font-medium text-accent-fill-fg transition-colors hover:bg-accent-fill-hover lg:inline-flex"
        >
          Let&apos;s talk <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
        <button
          ref={buttonRef}
          type="button"
          className="grid size-9 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-bg lg:hidden"
      >
        <nav aria-label="Main mobile" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <ul className="flex flex-col">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="border-b border-line last:border-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between py-4 text-lg",
                      active ? "font-medium text-fg" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {item.label}
                    {/* Always rendered: the shared 404 page is prerendered without the visitor's URL, so the
                        active item can differ after hydration and must not change the element structure. */}
                    <span className={cn("size-1.5 rounded-full", active ? "bg-accent" : "invisible")} aria-hidden="true" />

                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
