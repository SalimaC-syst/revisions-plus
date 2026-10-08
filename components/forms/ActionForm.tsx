"use client";
import { useActionState, useRef, useEffect } from "react";
import type { FormState } from "@/app/actions/auth";

export function ActionForm({
  action, children, submitLabel, pendingLabel = "Enregistrement…", className, resetOnSuccess = false, submitClass = "btn", confirm,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  submitClass?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {state?.error && <div className="alert alert-ko" role="alert">{state.error}</div>}
      {state?.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      {children}
      <button className={submitClass} type="submit" disabled={pending}>{pending ? pendingLabel : submitLabel}</button>
    </form>
  );
}
