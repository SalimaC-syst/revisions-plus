import Link from "next/link";
import { getSetting } from "@/lib/settings";

export async function PublicHeader() {
  const b = await getSetting("branding");
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link className="brand" href="/">
          <span className="brand-logo" aria-hidden="true">{b.logoKey && b.logoAuthorized ? <img src="/api/branding/logo" alt="" /> : "SJ"}</span>
          <span>{b.shortName}<small>{b.schoolName}</small></span>
        </Link>
        <nav className="nav" aria-label="Navigation">
          <Link href="/tarifs">Tarifs</Link>
          <Link href="/inscription">Inscription</Link>
          <Link href="/connexion">Connexion</Link>
        </nav>
      </div>
    </header>
  );
}
