'use client';

import { useState, useCallback } from 'react';
import { useServerAction } from './use-server-action';

/**
 * Hook for dialog-based forms that combines:
 *  - open/close state
 *  - error management (auto-clear on open)
 *  - server action with transition
 *
 * Usage:
 *   const dialog = useDialogForm();
 *   // <Dialog open={dialog.open} onOpenChange={dialog.onOpenChange}>
 *   //   <form onSubmit={(e) => { e.preventDefault(); dialog.submit(async () => await action(fd)) }}>
 *   //     {dialog.error && <p>{dialog.error}</p>}
 *   //   </form>
 *   // </Dialog>
 */
export function useDialogForm() {
  const [open, setOpen] = useState(false);
  const { execute, isPending, error, clearError } = useServerAction();

  const onOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value);
      if (value) clearError();
    },
    [clearError],
  );

  const submit = useCallback(
    (fn: () => Promise<{ error?: string; success?: boolean } | undefined | void>) => {
      execute(async () => {
        const result = await fn();
        if (result?.error) return result;
        setOpen(false);
        return result;
      });
    },
    [execute],
  );

  return { open, onOpenChange, submit, isPending, error, clearError };
}
