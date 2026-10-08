import { requirePermission } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { ActionForm } from "@/components/forms/ActionForm";
import { saveBrandingAction, saveLegalAction, saveFeaturesAction } from "@/app/actions/admin";
import { aiConfigured, AI_MODEL } from "@/lib/ai";

export const metadata = { title: "Paramètres" };

export default async function Page() {
  await requirePermission("settings.manage");
  const [b, l, f] = await Promise.all([getSetting("branding"), getSetting("legal"), getSetting("features")]);
  const legalFields: [keyof typeof l, string][] = [["publisher", "Organisme éditeur (raison sociale)"], ["legalForm", "Forme juridique"], ["siret", "SIRET"], ["address", "Adresse"], ["email", "E-mail de contact"], ["phone", "Téléphone"], ["director", "Directeur de la publication"], ["host", "Hébergeur (nom, adresse)"], ["mediator", "Médiateur de la consommation"], ["dpoEmail", "Contact protection des données"]];
  return (
    <div className="stack">
      <h1>Paramètres</h1>
      <div className="card">
        <h2>Identité visuelle</h2>
        <ActionForm action={saveBrandingAction} submitLabel="Enregistrer">
          <div className="grid-2">
            <div className="field"><label>Nom de l'établissement</label><input name="schoolName" type="text" defaultValue={b.schoolName} /></div>
            <div className="field"><label>Nom de la plateforme</label><input name="shortName" type="text" defaultValue={b.shortName} /></div>
            <div className="field"><label>Accroche</label><input name="tagline" type="text" defaultValue={b.tagline} /></div>
            <div className="row">
              <div className="field"><label>Couleur principale</label><input name="primary" type="color" defaultValue={b.primary} style={{ width: 90 }} /></div>
              <div className="field"><label>Couleur d'accent</label><input name="accent" type="color" defaultValue={b.accent} style={{ width: 90 }} /></div>
            </div>
            <div className="field"><label>Logo officiel <span className="hint">(PNG, JPG ou WebP, 2 Mo max)</span></label><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" />{b.logoKey && <img src="/api/branding/logo" alt="Logo actuel" style={{ maxHeight: 60, marginTop: 8 }} />}</div>
            <div className="field"><label className="check"><input type="checkbox" name="logoAuthorized" defaultChecked={b.logoAuthorized} /> <span>Le chef d'établissement a autorisé par écrit l'usage du nom et du logo pour ce service payant. <em>(Le logo ne s'affiche qu'une fois cette case cochée.)</em></span></label></div>
          </div>
        </ActionForm>
      </div>
      <div className="card">
        <h2>Intelligence artificielle</h2>
        <p className="small">État : {aiConfigured() ? `connectée (${AI_MODEL})` : "non connectée : clé API à renseigner sur le serveur (ANTHROPIC_API_KEY)"}.</p>
        <ActionForm action={saveFeaturesAction} submitLabel="Enregistrer">
          <label className="check"><input type="checkbox" name="aiGenerationEnabled" defaultChecked={f.aiGenerationEnabled} /> Génération de ressources à partir des documents des enseignants (aucune donnée d'élève transmise)</label>
          <label className="check"><input type="checkbox" name="aiGradingEnabled" defaultChecked={f.aiGradingEnabled} /> <span>Proposition de correction des réponses rédigées par l'IA (le texte de la réponse est transmis sans nom ni identifiant ; une validation humaine reste obligatoire). <strong>À n'activer qu'après signature d'un accord de sous-traitance (art. 28 RGPD) avec le fournisseur et mise à jour de l'analyse d'impact.</strong></span></label>
        </ActionForm>
      </div>
      <div className="card">
        <h2>Informations légales</h2>
        <p className="small muted">Reprises dans les mentions légales, les CGV et la politique de confidentialité.</p>
        <ActionForm action={saveLegalAction} submitLabel="Enregistrer">
          <div className="grid-2">{legalFields.map(([k, label]) => <div className="field" key={k}><label>{label}</label><input name={k} type="text" defaultValue={l[k].startsWith("[À compléter") ? "" : l[k]} placeholder={l[k]} /></div>)}</div>
        </ActionForm>
      </div>
    </div>
  );
}
