import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { EVENTS, REGISTRATIONS } from "./fixtures/events";
import { INVOICES } from "./fixtures/invoices";
import { journalDemo } from "./fixtures/journal";
import { MEMBERS } from "./fixtures/members";
import { NEWS } from "./fixtures/news";
import { OFFERS, SERVICES } from "./fixtures/offers";
import { RESOURCES } from "./fixtures/resources";
import { THREADS } from "./fixtures/threads";
import { CONTACTS, USERS } from "./fixtures/users";
import { hacher } from "../lib/mots-de-passe";

const SCHEMA = new URL(process.env.DATABASE_URL ?? "postgres://x/x").searchParams.get("schema") || undefined;
const prisma = new PrismaClient({
  // Même schéma que l'application (?schema= dans DATABASE_URL), sinon « public »
  adapter: new PrismaPg(
    { connectionString: process.env.DATABASE_URL, options: SCHEMA ? `-c search_path="${SCHEMA}",public` : undefined },
    { schema: SCHEMA },
  ),
});

const MOT_DE_PASSE = hacher(process.env.MOT_DE_PASSE_DEMO ?? "12345678");

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

const EVENT_FORMAT = {
  Présentiel: "presentiel",
  Webinaire: "webinaire",
  Hybride: "hybride",
} as const;

const NEWS_CAT = {
  Programmation: "programmation",
  "Événement passé": "evenement_passe",
  "Vie de la chambre": "vie_de_la_chambre",
  Formation: "formation",
} as const;

const RES_CAT = {
  Guide: "guide",
  Modèle: "modele",
  Formation: "formation",
  Rapport: "rapport",
} as const;

const RES_FMT = {
  PDF: "pdf",
  DOCX: "docx",
  Vidéo: "video",
  Photo: "image",
  Page: "page",
} as const;

const NOMS_PARTICIPANTS = [
  "Rado Andriamihaja",
  "Nantenaina Rasolofo",
  "Volatiana Ramamonjisoa",
  "Tiana Rakotoson",
  "Faniry Andriamanjato",
  "Zo Ravaoarimalala",
  "Miora Rasoamampionona",
  "Njaka Randrianasolo",
  "Lova Andrianirina",
  "Baholy Ratsimbazafy",
  "Fenitra Rakotondrabe",
  "Herimanana Razafindrakoto",
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, ".");

function participants(eventId: string, inscrits: number, passe: boolean) {
  const connus = MEMBERS.filter((m) => m.statut !== "candidature");
  const rows = [];
  for (let i = 0; i < inscrits; i++) {
    if (i < Math.min(connus.length, Math.ceil(inscrits * 0.4))) {
      const m = connus[i % connus.length];
      const u = m.id === "m1" ? USERS.membre : null;
      rows.push({
        id: `${eventId}-a${i}`,
        eventId,
        nom: u?.nom ?? `Représentant ${m.nom}`,
        entreprise: m.nom,
        email: u?.email ?? `contact@${slug(m.nom)}.mg`,
        statut: passe ? (i % 6 === 0 ? "absent" : "present") : "confirme",
      } as const);
    } else {
      const base = NOMS_PARTICIPANTS[i % NOMS_PARTICIPANTS.length];
      const suffixe =
        i >= NOMS_PARTICIPANTS.length
          ? ` ${Math.floor(i / NOMS_PARTICIPANTS.length) + 1}`
          : "";
      const nom = base + suffixe;
      rows.push({
        id: `${eventId}-a${i}`,
        eventId,
        nom,
        entreprise: "Participant individuel",
        email: `${slug(nom)}@exemple.mg`,
        statut: passe ? (i % 6 === 0 ? "absent" : "present") : "confirme",
      } as const);
    }
  }
  return rows;
}

async function main() {
  console.log("Nettoyage…");
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.newsLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.canchamService.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.news.deleteMany();
  await prisma.attendee.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.member.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.typeRendezvous.deleteMany();

  console.log("Membres et produits…");
  for (const m of MEMBERS) {
    await prisma.member.create({
      data: {
        id: m.id,
        type: m.type,
        nom: m.nom,
        secteur: m.secteur,
        ville: m.ville,
        statut: m.statut,
        formule: m.formule,
        adhesion: d(m.adhesion),
        retardDepuis: m.retardDepuis ? d(m.retardDepuis) : null,
        activite: m.activite,
        desc: m.desc,
        besoins: m.besoins ?? null,
        interets: m.interets ?? null,
        statutJuridique: m.statutJuridique ?? null,
        pays: m.pays ?? null,
        siteweb: m.siteweb ?? null,
        motivation: m.motivation ?? null,
        paiementNote: m.paiementNote ?? null,
        cover: m.cover ?? null,
        photo: m.photo ?? null,
        logo: m.logo ?? null,
        produits: {
          create: m.produits.map((p, i) => ({
            label: p.label,
            type: p.type ?? "service",
            description: p.description ?? null,
            prix: p.prix ?? null,
            photos: p.photos,
            ordre: i,
          })),
        },
      },
    });
  }

  console.log("Utilisateurs…");
  for (const u of Object.values(USERS)) {
    await prisma.user.create({
      data: {
        id: u.id,
        role: u.role,
        niveauEquipe: u.niveauEquipe,
        nom: u.nom,
        fonction: u.fonction,
        email: u.email,
        tel: u.tel ?? null,
        photo: u.photo ?? null,
        memberId: u.memberId,
        motDePasse: MOT_DE_PASSE,
        contactPrincipal: u.role === "membre" || u.role === "visiteur",
      },
    });
  }
  for (const c of CONTACTS) {
    await prisma.user.create({
      data: {
        id: c.id,
        memberId: c.memberId,
        nom: c.nom,
        fonction: c.fonction,
        email: c.email,
        tel: c.tel,
        photo: c.photo,
        role: "membre",
        motDePasse: MOT_DE_PASSE,
        contactPrincipal: c.principal,
      },
    });
  }

  console.log("Événements, inscriptions et participants…");
  const aujourdhui = new Date();
  for (const e of EVENTS) {
    const passe = d(e.date) < aujourdhui;
    await prisma.event.create({
      data: {
        id: e.id,
        titre: e.titre,
        date: d(e.date),
        lieu: e.lieu,
        format: EVENT_FORMAT[e.format],
        cap: e.cap,
        payant: e.payant,
        prix: e.prix,
        public: e.public,
        prixPublic: e.prixPublic,
        desc: e.desc,
        photo: e.photo,
        debut: e.debut ?? null,
        fin: e.fin ?? null,
        pourQui: e.pourQui ?? null,
        programme: {
          create: (e.programme ?? []).map((etape, i) => ({
            heure: etape.heure,
            titre: etape.titre,
            detail: etape.detail ?? null,
            ordre: i,
          })),
        },
      },
    });
    await prisma.attendee.createMany({
      data: participants(e.id, e.inscrits, passe),
    });
  }
  for (const r of REGISTRATIONS) {
    await prisma.registration.create({
      data: {
        eventId: r.eventId,
        memberId: r.memberId,
        code: r.code,
        createdAt: d(r.date),
      },
    });
  }

  console.log("Actualités…");
  const auteurs = new Map(
    [...Object.values(USERS), ...CONTACTS].map((u) => [u.nom, u.id]),
  );
  for (const n of NEWS) {
    await prisma.news.create({
      data: {
        id: n.id,
        titre: n.titre,
        date: d(n.date),
        cat: NEWS_CAT[n.cat],
        extrait: n.extrait,
        corps: n.corps,
        public: n.public,
        mediaType: n.media.type,
        mediaTheme: n.media.theme,
        mediaDuration: n.media.duration ?? null,
        images: n.images,
        commentaires: {
          create: n.commentaires.map((c) => ({
            auteur: c.auteur,
            entreprise: c.entreprise,
            texte: c.texte,
            date: d(c.date),
            userId: auteurs.get(c.auteur) ?? null,
          })),
        },
      },
    });
  }

  const personnes = await prisma.user.findMany({
    where: { role: { not: "admin" } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  let jaimes = 0;
  for (const [rang, n] of NEWS.entries()) {
    const nombre = 3 + ((rang * 7 + 5) % (personnes.length - 2));
    const choisis = personnes
      .filter((_, i) => (i * 5 + rang * 3) % personnes.length < nombre)
      .filter((u) => u.id !== USERS.membre.id);
    if (rang % 2 === 0) choisis.push({ id: USERS.membre.id });
    await prisma.newsLike.createMany({
      data: choisis.map((u) => ({ newsId: n.id, userId: u.id })),
      skipDuplicates: true,
    });
    jaimes += choisis.length;
  }
  console.log(
    `  ${jaimes} « j'aime » répartis sur ${NEWS.length} publications`,
  );

  console.log("Ressources…");
  for (const r of RESOURCES) {
    await prisma.resource.create({
      data: {
        id: r.id,
        titre: r.titre,
        cat: RES_CAT[r.cat],
        fmt: RES_FMT[r.fmt],
        taille: r.taille,
        date: d(r.date),
        type: r.type,
        prix: r.prix,
        commentaires: {
          create: r.commentaires.map((c) => ({
            auteur: c.auteur,
            entreprise: c.entreprise,
            texte: c.texte,
            date: d(c.date),
            userId: auteurs.get(c.auteur) ?? null,
          })),
        },
      },
    });
  }

  console.log("Offres et services…");
  for (const o of OFFERS) {
    await prisma.offer.create({
      data: { id: o.id, titre: o.titre, desc: o.desc, memberId: o.membreId },
    });
  }
  for (const [i, s] of SERVICES.entries()) {
    await prisma.canchamService.create({
      data: {
        id: s.id,
        titre: s.titre,
        desc: s.desc,
        type: s.type,
        prix: s.prix,
        icon: s.icon,
        ordre: i,
      },
    });
  }

  console.log("Factures…");
  for (const f of INVOICES) {
    await prisma.invoice.create({
      data: {
        id: f.id,
        numero: f.numero,
        date: d(f.date),
        objet: f.objet,
        montant: f.montant,
        devise: f.devise,
        statut: f.statut,
        payeeLe: f.statut === "payee" ? d(f.date) : null,
        memberId: f.membreId,
      },
    });
  }

  console.log("Messagerie…");
  const noms = new Map(
    [...Object.values(USERS), ...CONTACTS].map((u) => [u.id, u.nom]),
  );
  for (const [rang, t] of THREADS.entries()) {
    const dates = t.messages.map(
      (_, i) =>
        new Date(
          aujourdhui.getTime() -
            (t.messages.length - i) * 36e5 -
            rang * 24 * 36e5 -
            Math.max(0, t.messages.length - 1 - i) * 24 * 36e5,
        ),
    );

    let restants = t.nonLus;
    let lu = t.messages.length - 1;
    while (restants > 0 && lu >= 0) {
      if (t.messages[lu].de !== USERS.membre.id) restants--;
      lu--;
    }

    await prisma.messageThread.create({
      data: {
        id: t.id,
        type: t.type,
        nom: t.nom ?? null,
        avatar: t.avatar ?? null,
        equipe: t.equipe ?? false,
        participants: {
          create: t.participants.map((userId) => ({
            userId,
            luLe:
              userId === USERS.membre.id
                ? (dates[lu] ?? null)
                : dates[dates.length - 1],
          })),
        },
        messages: {
          create: t.messages.map((m, i) => ({
            id: m.id,
            auteur: noms.get(m.de) ?? m.de,
            userId: m.de,
            texte: m.texte,
            sentAt: dates[i],
          })),
        },
      },
    });
  }

  console.log("Rendez-vous…");
  for (const [ordre, t] of [
    {
      titre: "Entretien d’accompagnement",
      detail: "Un point sur votre projet avec l’équipe de la chambre",
      duree: 30,
      plages: [
        { jour: 2, debut: "09:00", fin: "12:00" },
        { jour: 4, debut: "09:00", fin: "12:00" },
      ],
    },
    {
      titre: "Point rapide",
      detail: null,
      duree: 15,
      plages: [
        { jour: 2, debut: "16:00", fin: "17:00" },
        { jour: 4, debut: "14:00", fin: "16:00" },
      ],
    },
  ].entries()) {
    const { plages, ...type } = t;
    await prisma.typeRendezvous.create({
      data: { ...type, ordre, plages: { create: plages } },
    });
  }

  console.log("Journal…");
  await prisma.auditLog.create({
    data: {
      action: "seed",
      entite: "Database",
      entiteId: "init",
      acteur: "script de seed",
      detail: "Chargement initial des données d'exemple.",
    },
  });
  await prisma.auditLog.createMany({ data: journalDemo(new Date()) });
}

main()
  .then(async () => {
    const compte = {
      membres: await prisma.member.count(),
      utilisateurs: await prisma.user.count(),
      produits: await prisma.produit.count(),
      evenements: await prisma.event.count(),
      inscriptions: await prisma.registration.count(),
      participants: await prisma.attendee.count(),
      actualites: await prisma.news.count(),
      ressources: await prisma.resource.count(),
      commentaires: await prisma.comment.count(),
      offres: await prisma.offer.count(),
      services: await prisma.canchamService.count(),
      factures: await prisma.invoice.count(),
      fils: await prisma.messageThread.count(),
      messages: await prisma.message.count(),
      "types de rendez-vous": await prisma.typeRendezvous.count(),
      "plages d’accueil": await prisma.disponibilite.count(),
    };
    console.table(compte);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
