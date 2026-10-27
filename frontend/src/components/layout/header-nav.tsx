"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { NavItem } from "@/data/site";
import { cn } from "@/lib/format";


/** Custom menu links from the admin may point to another site; those open in a new tab. */
function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

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
            const active = !isExternal(item.href) && isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-md border px-3 py-1.5 text-sm transition-colors duration-150",
                    active
                      ? "border-[var(--btn-border-secondary)] bg-surface font-medium text-fg shadow-[var(--btn-shadow)]"
                      : "border-transparent text-fg-muted hover:bg-surface-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
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
              const active = !isExternal(item.href) && isActive(pathname, item.href);
              return (
                <li key={item.href} className="border-b border-line last:border-0">
                  <NavLink
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
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

function NavLink({ href, children, ...rest }: React.ComponentProps<typeof Link> & { href: string }) {
  if (!isExternal(href)) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
