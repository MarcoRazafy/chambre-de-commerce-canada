import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  etatLettre,
  fmtDateHeure,
  fmtTaux,
  lireProgrammation,
  moyenne,
  programmationParDefaut,
  suiviDe,
  taux,
} from "@/lib/lettres";
import { effetEvenement, signatureResendValide } from "@/lib/resend-webhook";
import { effetBrevo, identifiantsBrevo, momentBrevo } from "@/lib/brevo-webhook";
import { configPlateforme, dateFactureDuMois, facturePlateforme, numeroFacturePlateforme, prochaineFacturation } from "@/lib/plateforme";

const MAINTENANT = new Date("2026-11-08T10:00:00Z"); // 13 h à Antananarivo

describe("état d'une lettre", () => {
  it("distingue brouillon, programmée et envoyée", () => {
    expect(etatLettre({ statut: "brouillon", programmeeLe: null })).toBe("brouillon");
    expect(etatLettre({ statut: "envoyee", programmeeLe: null })).toBe("envoyee");
    expect(etatLettre({ statut: "programmee", programmeeLe: new Date("2026-11-09T06:00:00Z") })).toBe("programmee");
  });

  it("garde « programmée » tant que le serveur ne l'a pas envoyée, même l'heure passée", () => {
    expect(etatLettre({ statut: "programmee", programmeeLe: new Date("2026-11-08T09:59:00Z") })).toBe("programmee");
  });

  it("compte comme partie une lettre en cours d'envoi", () => {
    expect(etatLettre({ statut: "envoi", programmeeLe: new Date("2026-11-08T09:59:00Z") })).toBe("envoyee");
  });
});

describe("programmation d'un envoi", () => {
  it("lit la date à l'heure de Madagascar", () => {
    const r = lireProgrammation("2026-11-09T09:00", MAINTENANT);
    expect("date" in r && r.date.toISOString()).toBe("2026-11-09T06:00:00.000Z");
  });

  it("refuse une heure passée ou trop proche", () => {
    expect(lireProgrammation("2026-11-08T12:00", MAINTENANT)).toHaveProperty("erreur");
    expect(lireProgrammation("2026-11-08T13:03", MAINTENANT)).toHaveProperty("erreur");
    expect(lireProgrammation("2026-11-08T13:06", MAINTENANT)).toHaveProperty("date");
  });

  it("refuse plus de 90 jours à l'avance", () => {
    expect(lireProgrammation("2027-02-06T12:59", MAINTENANT)).toHaveProperty("date");
    expect(lireProgrammation("2027-02-06T13:01", MAINTENANT)).toHaveProperty("erreur");
  });

  it("refuse une saisie vide ou mal formée", () => {
    expect(lireProgrammation("", MAINTENANT)).toHaveProperty("erreur");
    expect(lireProgrammation("09/11/2026 09:00", MAINTENANT)).toHaveProperty("erreur");
  });

  it("propose demain à 9 h par défaut, et l'accepte", () => {
    const defaut = programmationParDefaut(MAINTENANT);
    expect(defaut).toBe("2026-11-09T09:00");
    expect(lireProgrammation(defaut, MAINTENANT)).toHaveProperty("date");
    // Juste avant minuit à Antananarivo (20 h 59 UTC), « demain » est bien le lendemain local
    expect(programmationParDefaut(new Date("2026-11-08T20:59:00Z"))).toBe("2026-11-09T09:00");
    expect(programmationParDefaut(new Date("2026-11-08T21:01:00Z"))).toBe("2026-11-10T09:00");
  });

  it("affiche la date à l'heure de Madagascar", () => {
    expect(fmtDateHeure(new Date("2026-11-09T06:00:00Z"))).toMatch(/9 nov\.? 2026.*09 h 00/);
  });
});

describe("suivi d'une lettre", () => {
  const d = new Date();
  it("compte les remises, ouvertures, clics et erreurs ; un clic vaut ouverture", () => {
    const s = suiviDe([
      { livreLe: d, ouvertLe: d, clicLe: d, erreurLe: null },
      { livreLe: d, ouvertLe: null, clicLe: d, erreurLe: null },
      { livreLe: d, ouvertLe: d, clicLe: null, erreurLe: null },
      { livreLe: null, ouvertLe: null, clicLe: null, erreurLe: d },
    ]);
    expect(s).toEqual({ envoyes: 4, livres: 3, ouverts: 3, clics: 2, erreurs: 1 });
  });

  it("calcule les taux et leur moyenne sans compter les lettres non mesurées", () => {
    expect(taux(3, 4)).toBe(75);
    expect(taux(0, 0)).toBeNull();
    expect(moyenne([50, null, 40])).toBe(45);
    expect(moyenne([null])).toBeNull();
    expect(fmtTaux(49.25)).toBe("49,3 %");
    expect(fmtTaux(null)).toBe("—");
  });
});

describe("webhook Resend", () => {
  const cle = Buffer.from("cle-secrete-de-test-32-octets!!!");
  const secret = `whsec_${cle.toString("base64")}`;
  const corps = JSON.stringify({ type: "email.opened", data: { email_id: "e1" } });
  const horodatage = "1794132000";
  const maintenant = 1794132000 * 1000 + 30_000;
  const signe = (contenu: string) => createHmac("sha256", cle).update(`msg_1.${horodatage}.${contenu}`).digest("base64");

  it("accepte une signature valide, même parmi plusieurs", () => {
    const base = { secret, id: "msg_1", horodatage, corps, maintenant };
    expect(signatureResendValide({ ...base, signatures: `v1,${signe(corps)}` })).toBe(true);
    expect(signatureResendValide({ ...base, signatures: `v1,AAAA v1,${signe(corps)}` })).toBe(true);
  });

  it("refuse un corps modifié, un mauvais secret, une version inconnue ou un en-tête manquant", () => {
    const base = { secret, id: "msg_1", horodatage, corps, maintenant };
    expect(signatureResendValide({ ...base, signatures: `v1,${signe(corps + " ")}` })).toBe(false);
    expect(signatureResendValide({ ...base, secret: "whsec_YXV0cmU=", signatures: `v1,${signe(corps)}` })).toBe(false);
    expect(signatureResendValide({ ...base, signatures: `v2,${signe(corps)}` })).toBe(false);
    expect(signatureResendValide({ ...base, signatures: null })).toBe(false);
    expect(signatureResendValide({ ...base, id: null, signatures: `v1,${signe(corps)}` })).toBe(false);
  });

  it("refuse un message trop ancien (rejeu)", () => {
    expect(
      signatureResendValide({ secret, id: "msg_1", horodatage, corps, signatures: `v1,${signe(corps)}`, maintenant: maintenant + 10 * 60_000 }),
    ).toBe(false);
  });

  it("traduit chaque événement en effet sur l'envoi et l'abonné", () => {
    expect(effetEvenement({ type: "email.delivered" })).toEqual({ envoi: "livreLe", abonne: null });
    expect(effetEvenement({ type: "email.opened" })).toEqual({ envoi: "ouvertLe", abonne: null });
    expect(effetEvenement({ type: "email.clicked" })).toEqual({ envoi: "clicLe", abonne: null });
    expect(effetEvenement({ type: "email.bounced", data: { bounce: { type: "Permanent" } } })).toEqual({ envoi: "erreurLe", abonne: "erreurLe" });
    expect(effetEvenement({ type: "email.bounced", data: { bounce: { type: "Transient" } } })).toEqual({ envoi: "erreurLe", abonne: null });
    expect(effetEvenement({ type: "email.complained" })).toEqual({ envoi: null, abonne: "desabonneLe" });
    expect(effetEvenement({ type: "email.sent" })).toEqual({ envoi: null, abonne: null });
  });
});

describe("abonnement à la plateforme", () => {
  it("prend les valeurs par défaut du prototype, ou celles de l'environnement", () => {
    expect(configPlateforme({})).toMatchObject({ forfait: 100, parUtilisateur: 15, tps: 5, tvq: 9.975, jourFacturation: 1 });
    expect(configPlateforme({ PLATEFORME_FORFAIT: "200", PLATEFORME_TVQ: "0", PLATEFORME_JOUR_FACTURATION: "45" })).toMatchObject({
      forfait: 200,
      tvq: 0,
      jourFacturation: 28,
    });
    expect(configPlateforme({ PLATEFORME_FORFAIT: "abc", PLATEFORME_PRIX_UTILISATEUR: "-3" })).toMatchObject({ forfait: 100, parUtilisateur: 15 });
  });

  it("calcule la facture : forfait + comptes d'équipe (super admin offert), puis TPS et TVQ", () => {
    expect(facturePlateforme(8, configPlateforme({}))).toEqual({
      forfait: 100,
      payants: 7,
      offerts: 1,
      equipe: 105,
      sousTotal: 205,
      tps: 10.25,
      tvq: 20.45,
      total: 235.7,
    });
    // Le super admin seul : rien en plus du forfait
    expect(facturePlateforme(1, configPlateforme({}))).toMatchObject({ payants: 0, offerts: 1, equipe: 0, sousTotal: 100 });
    expect(facturePlateforme(0, configPlateforme({}))).toMatchObject({ payants: 0, offerts: 0, equipe: 0 });
  });

  it("numérote la facture du mois et ne l'émet qu'une fois son jour arrivé", () => {
    expect(numeroFacturePlateforme("2026-11-01")).toBe("PLT-2026-11");
    expect(dateFactureDuMois("2026-11-10", 1)).toBe("2026-11-01");
    expect(dateFactureDuMois("2026-11-10", 15)).toBeNull();
    expect(dateFactureDuMois("2026-11-15", 15)).toBe("2026-11-15");
  });

  it("donne la prochaine date de facturation", () => {
    expect(prochaineFacturation("2026-11-01", 1)).toBe("2026-11-01");
    expect(prochaineFacturation("2026-11-08", 1)).toBe("2026-12-01");
    expect(prochaineFacturation("2026-12-08", 1)).toBe("2027-01-01");
    expect(prochaineFacturation("2026-11-08", 15)).toBe("2026-11-15");
  });
});

describe("webhook Brevo", () => {
  it("traduit chaque événement en effet sur l'envoi et l'abonné", () => {
    expect(effetBrevo({ event: "delivered" })).toEqual({ envoi: "livreLe", abonne: null });
    expect(effetBrevo({ event: "unique_opened" })).toEqual({ envoi: "ouvertLe", abonne: null });
    expect(effetBrevo({ event: "opened" })).toEqual({ envoi: "ouvertLe", abonne: null });
    expect(effetBrevo({ event: "click" })).toEqual({ envoi: "clicLe", abonne: null });
    expect(effetBrevo({ event: "hard_bounce" })).toEqual({ envoi: "erreurLe", abonne: "erreurLe" });
    expect(effetBrevo({ event: "soft_bounce" })).toEqual({ envoi: null, abonne: null });
    expect(effetBrevo({ event: "spam" })).toEqual({ envoi: null, abonne: "desabonneLe" });
    expect(effetBrevo({ event: "unsubscribed" })).toEqual({ envoi: null, abonne: "desabonneLe" });
    expect(effetBrevo({ event: "proxy_open" })).toEqual({ envoi: null, abonne: null });
  });

  it("retrouve l'envoi par notre identifiant, sinon par celui du message", () => {
    expect(identifiantsBrevo({ "X-Mailin-custom": " cmabc ", "message-id": "<1@relay>" })).toEqual({ suivi: "cmabc", messageId: "1@relay" });
    expect(identifiantsBrevo({ "message-id": "2@relay" })).toEqual({ suivi: null, messageId: "2@relay" });
  });

  it("lit l'heure de l'événement, en secondes ou en millisecondes", () => {
    expect(momentBrevo({ ts_event: 1794132000 }).toISOString()).toBe(new Date(1794132000 * 1000).toISOString());
    expect(momentBrevo({ ts_epoch: 1794132000123 }).getTime()).toBe(1794132000123);
  });
});
