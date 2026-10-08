import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Accessibilité" };

export default function Page() {
  return (
    <LegalPage title="Accessibilité">
      <p>La plateforme vise la conformité aux critères du RGAA 4.1 (niveau AA du WCAG 2.1). Mesures appliquées : navigation complète au clavier (y compris les exercices de glisser-déposer, utilisables par sélection), contrastes vérifiés, police de lecture Lexend, cibles tactiles de 44 px minimum, respect du réglage « réduire les animations », structure de titres, libellés de formulaires.</p>
      <p>État : non audité par un organisme indépendant. Un audit est recommandé avant la mise en production.</p>
    </LegalPage>
  );
}
