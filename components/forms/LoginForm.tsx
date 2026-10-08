"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} noValidate>
      {state?.error && <div className="alert alert-ko" role="alert">{state.error}</div>}
      <div className="field">
        <label htmlFor="identifier">Identifiant ou adresse e-mail</label>
        <input id="identifier" name="identifier" type="text" autoComplete="username" required autoCapitalize="none" />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
