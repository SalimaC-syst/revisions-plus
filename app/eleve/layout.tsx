import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { totalXp, levelFor } from "@/lib/gamification";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["STUDENT"]);
  const xp = await totalXp(user.id);
  const lv = levelFor(xp);
  return (
    <Shell nav={[{ href: "/eleve", label: "Mes matières" }, { href: "/eleve/progression", label: "Ma progression" }]} right={<span className="xp-chip" title={`Niveau ${lv.level} : ${lv.name}`}>⭐ {xp} XP · niv. {lv.level}</span>}>
      {children}
    </Shell>
  );
}
