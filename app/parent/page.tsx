import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { subscriptionGrantsAccess } from "@/lib/access";
import { addChildAction } from "@/app/actions/parent";
import { ActionForm } from "@/components/forms/ActionForm";
import { dateFr, note20 } from "@/lib/format";
import { totalXp, levelFor } from "@/lib/gamification";

export const metadata = { title: "Espace parent" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const parent = await requireUser(["PARENT"]);
  const sp = await searchParams;
  const [children, levels] = await Promise.all([
    prisma.user.findMany({ where: { parentId: parent.id }, include: { gradeLevel: true, subscriptionsFor: { include: { plan: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.gradeLevel.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
  ]);
  return (
    <div className="stack">
      {sp.bienvenue && <div className="alert alert-ok">Votre compte est créé. Ajoutez maintenant le compte de votre enfant.</div>}
      <h1>Bonjour {parent.firstName}</h1>
      {children.length === 0 && <p className="muted">Vous n'avez pas encore ajouté d'enfant.</p>}
      <div className="grid-2">
        {await Promise.all(children.map(async (c) => {
          const active = c.subscriptionsFor.find((s) => subscriptionGrantsAccess(s));
          const xp = await totalXp(c.id);
          const lastMock = await prisma.attempt.findFirst({ where: { userId: c.id, kind: "MOCK_EXAM", status: { not: "IN_PROGRESS" } }, orderBy: { submittedAt: "desc" }, include: { evaluation: true } });
          return (
            <div className="card" key={c.id}>
              <div className="spread">
                <h2 style={{ margin: 0 }}>{c.firstName} {c.lastName}</h2>
                <span className="badge badge-brand">{c.gradeLevel?.name}</span>
              </div>
              <p className="small muted">Identifiant de connexion : <strong>{c.username}</strong></p>
              {active ? (
                <p><span className="badge badge-ok">Accès actif</span> <span className="small muted">{active.manualGrant ? "accordé par l'établissement" : active.plan.name}{active.currentPeriodEnd ? ` · jusqu'au ${dateFr(active.currentPeriodEnd)}` : ""}</span></p>
              ) : (
                <p><span className="badge badge-warn">Pas d'abonnement actif</span></p>
              )}
              <p className="small">Niveau {levelFor(xp).level} ({xp} points d'expérience){lastMock ? ` · dernier contrôle blanc : ${lastMock.evaluation.title}, ${lastMock.scoreOn20 !== null ? note20(lastMock.scoreOn20) : "correction en cours"}` : ""}</p>
              <div className="row">
                <Link className="btn btn-sm" href={`/parent/enfant/${c.id}`}>Voir la progression</Link>
                {!active && <Link className="btn btn-sm btn-accent" href={`/parent/abonnement/${c.id}`}>Choisir un abonnement</Link>}
              </div>
            </div>
          );
        }))}
      </div>
      <details className="card" open={children.length === 0}>
        <summary>Ajouter un enfant</summary>
        <p className="small muted" style={{ marginTop: 10 }}>Nous ne demandons pas d'adresse e-mail à l'élève. Il se connectera avec l'identifiant et le mot de passe que vous choisissez.</p>
        <ActionForm action={addChildAction} submitLabel="Créer le compte élève" resetOnSuccess>
          <div className="grid-2">
            <div className="field"><label htmlFor="firstName">Prénom de l'élève</label><input id="firstName" name="firstName" type="text" required /></div>
            <div className="field"><label htmlFor="lastInitial">Initiale du nom <span className="hint">(facultatif)</span></label><input id="lastInitial" name="lastInitial" type="text" maxLength={40} /></div>
            <div className="field"><label htmlFor="gradeLevelId">Classe</label>
              <select id="gradeLevelId" name="gradeLevelId" required>{levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="username">Identifiant de connexion</label><input id="username" name="username" type="text" required autoCapitalize="none" placeholder="ex. lea.m6" /></div>
            <div className="field"><label htmlFor="cpw">Mot de passe <span className="hint">(10 caractères, lettres et chiffres)</span></label><input id="cpw" name="password" type="password" required autoComplete="new-password" /></div>
          </div>
        </ActionForm>
      </details>
    </div>
  );
}
