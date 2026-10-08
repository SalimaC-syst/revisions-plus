"use client";
import { useActionState } from "react";
import { registerParentAction } from "@/app/actions/auth";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerParentAction, undefined);
  return (
    <form action={action}>
      {state?.error && <div className="alert alert-ko" role="alert">{state.error}</div>}
      <div className="grid-2">
        <div className="field"><label htmlFor="firstName">Prénom</label><input id="firstName" name="firstName" type="text" autoComplete="given-name" required /></div>
        <div className="field"><label htmlFor="lastName">Nom</label><input id="lastName" name="lastName" type="text" autoComplete="family-name" required /></div>
      </div>
      <div className="field"><label htmlFor="email">Adresse e-mail</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="grid-2">
        <div className="field"><label htmlFor="password">Mot de passe <span className="hint">(10 caractères minimum, lettres et chiffres)</span></label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} /></div>
        <div className="field"><label htmlFor="password2">Confirmer le mot de passe</label><input id="password2" name="password2" type="password" autoComplete="new-password" required /></div>
      </div>
      <div className="field"><label className="check"><input type="checkbox" name="legalGuardian" required /> Je certifie être parent ou représentant légal de l'élève que j'inscrirai.</label></div>
      <div className="field"><label className="check"><input type="checkbox" name="privacy" required /> <span>J'ai lu la <a href="/confidentialite" target="_blank">politique de confidentialité</a> et j'accepte le traitement des données nécessaires au service.</span></label></div>
      <button className="btn" type="submit" disabled={pending}>{pending ? "Création…" : "Créer mon compte parent"}</button>
    </form>
  );
}
