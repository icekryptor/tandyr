'use client';

import { useState, useTransition, useCallback } from 'react';

type ActionResult = { error?: string; success?: boolean } | undefined | void;

/**
 * Hook to wrap a server action with transition + error state.
 *
 * Usage:
 *   const { execute, isPending, error, clearError } = useServerAction();
 *   // in handler:
 *   execute(async () => {
 *     const res = await someAction(formData);
 *     if (res?.error) throw res.error;
 *   });
 */
export function useServerAction() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    (fn: () => Promise<ActionResult>) => {
      setError(null);
      startTransition(async () => {
        const result = await fn();
        if (result?.error) setError(result.error);
      });
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, isPending, error, clearError };
}
