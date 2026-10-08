// Matrice des droits : chaque rôle n'accède qu'à ce dont il a besoin.
export type RoleName = "SUPER_ADMIN" | "ADMIN_PEDA" | "TEACHER" | "PARENT" | "STUDENT";

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: "Super-administrateur",
  ADMIN_PEDA: "Administrateur pédagogique",
  TEACHER: "Enseignant",
  PARENT: "Parent",
  STUDENT: "Élève",
};

export type Permission =
  | "pedagogy.edit"      // niveaux, matières, évaluations, contenus
  | "pedagogy.publish"
  | "pedagogy.ai"
  | "corrections.review"
  | "stats.view"
  | "users.manage"
  | "admins.manage"
  | "billing.manage"
  | "settings.manage"
  | "audit.view";

const MATRIX: Record<RoleName, Permission[]> = {
  SUPER_ADMIN: ["pedagogy.edit", "pedagogy.publish", "pedagogy.ai", "corrections.review", "stats.view", "users.manage", "admins.manage", "billing.manage", "settings.manage", "audit.view"],
  ADMIN_PEDA: ["pedagogy.edit", "pedagogy.publish", "pedagogy.ai", "corrections.review", "stats.view"],
  // l'enseignant n'agit que sur les matières qui lui sont attribuées (contrôlé à part)
  TEACHER: ["pedagogy.edit", "pedagogy.ai", "corrections.review"],
  PARENT: [],
  STUDENT: [],
};

export function can(role: string, perm: Permission): boolean {
  return (MATRIX[role as RoleName] ?? []).includes(perm);
}

export const STAFF_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN_PEDA", "TEACHER"];
export const isStaff = (role: string) => STAFF_ROLES.includes(role as RoleName);
