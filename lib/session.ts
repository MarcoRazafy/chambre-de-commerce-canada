import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { fermerSession, sessionCourante, sessionPerimee } from "@/lib/auth";
import { visiteCourante } from "@/lib/visite-gm";
import type { Space, User, UserRole } from "@/lib/types";

const ROLE_PAR_ESPACE: Record<Space, UserRole> = {
  public: "visiteur",
  membre: "membre",
  admin: "admin",
};

const ACCUEIL: Record<UserRole, string> = {
  membre: "/membre",
  admin: "/admin",
  visiteur: "/auth",
};

export const CONNEXION = "/auth";

async function oublierCookie(): Promise<void> {
  try {
    await fermerSession();
  } catch {}
}

export async function utilisateurConnecte(): Promise<{
  id: string;
  role: UserRole;
  memberId: string | null;
  nom: string;
} | null> {
  const session = await sessionCourante();
  if (!session) return null;
  const u = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      memberId: true,
      nom: true,
      motDePasseModifieLe: true,
    },
  });
  if (!u || sessionPerimee(session, u.motDePasseModifieLe)) {
    await oublierCookie();
    return null;
  }
  return { id: u.id, role: u.role, memberId: u.memberId, nom: u.nom };
}

export async function getCurrentUser(space: Space): Promise<User> {
  const session = await sessionCourante();
  if (!session) redirect(CONNEXION);

  const u = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!u || sessionPerimee(session, u.motDePasseModifieLe)) {
    await oublierCookie();
    redirect(CONNEXION);
  }
  if (u.role !== ROLE_PAR_ESPACE[space]) redirect(ACCUEIL[u.role]);

  // Visite de l'Admin GM dans ce compte (mode développeur) : son nom, pour l'affichage et le journal
  const visite = await visiteCourante();
  const visiteGM = visite && visite.u === u.id ? visite.n : null;
  const nom = visiteGM ? `${visiteGM} (Admin GM)` : u.nom;

  return {
    id: u.id,
    role: u.role,
    niveauEquipe: u.role === "admin" ? (u.niveauEquipe ?? "manager") : null,
    space,
    memberId: u.memberId,
    nom,
    fonction: visiteGM ? "Visite de l’Admin GM" : u.fonction,
    email: u.email,
    tel: u.tel ?? undefined,
    initiales: initiales(nom),
    photo: visiteGM ? null : u.photo,
    visiteGM,
  };
}

function initiales(nom: string): string {
  return nom
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
