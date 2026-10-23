"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/features/admin/api";

type State<T> = { data: T | null; error: unknown; loading: boolean };

/**
 * Load `path` from the admin API. Re-fetches when `path` changes or `reload()` is
 * called; an in-flight request is aborted when it is superseded or the component
 * unmounts, so stale responses never overwrite newer ones.
 */
export function useApiData<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: path !== null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    api.get<T>(path, controller.signal).then(
      (data) => setState({ data, error: null, loading: false }),
      (error) => {
        if ((error as Error).name !== "AbortError") setState((s) => ({ ...s, error, loading: false }));
      },
    );
    return () => controller.abort();
  }, [path, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const setData = useCallback((data: T) => setState({ data, error: null, loading: false }), []);

  return { ...state, reload, setData };
}
