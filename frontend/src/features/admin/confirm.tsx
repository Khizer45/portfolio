"use client";

import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/format";

type ConfirmOptions = {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * A single confirmation dialog for the whole admin, built on the native <dialog>
 * element (focus is trapped and Escape cancels).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    dialogRef.current?.close();
  }, []);

  const confirm = useCallback<Confirm>((next) => {
    setOptions(next);
    // Wait for the content to render, then open.
    requestAnimationFrame(() => dialogRef.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onCancel={() => close(false)}
        onClick={(event) => event.target === dialogRef.current && close(false)}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-card backdrop:bg-black/50"
      >
        {options && (
          <div className="p-6">
            <div className="flex gap-3">
              {options.destructive && (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tone-amber/10 text-tone-amber">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                </span>
              )}
              <div>
                <h2 id="confirm-title" className="text-lg font-semibold">
                  {options.title}
                </h2>
                <div id="confirm-message" className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {options.message}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" autoFocus onClick={() => close(false)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={cn(
                  buttonClasses({ size: "sm" }),
                  options.destructive && "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-600",
                )}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return context;
}
