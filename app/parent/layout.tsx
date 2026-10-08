import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireUser(["PARENT"]);
  return (
    <Shell nav={[{ href: "/parent", label: "Mes enfants" }, { href: "/parent/facturation", label: "Abonnements et factures" }, { href: "/parent/donnees", label: "Mes données" }]}>
      {children}
    </Shell>
  );
}
