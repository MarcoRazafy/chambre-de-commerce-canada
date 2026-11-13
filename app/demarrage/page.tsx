import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Globe, LogOut, MapPin, Phone } from "lucide-react";
import { EntreeFichier } from "@/components/EnvoisSuivis";
import { CadrePlateforme, CartePlateforme } from "@/components/plateforme/CadrePlateforme";
import { ChoixOffre } from "@/components/plateforme/ChoixOffre";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte, Confirmation } from "@/components/public/CadreAuth";
import { ChampAuth, Saisie } from "@/components/public/ChampsAuth";
import { CHAMP_AUTH } from "@/components/public/style-champs";
import { appliquerSession } from "@/lib/abonnement-stripe";
import { deconnexion } from "@/lib/actions/auth";
import { choisirOffreDemarrage, payerDemarrage, revenirAuxOffres, terminerDemarrage } from "@/lib/actions/demarrage";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma, prismaSysteme } from "@/lib/db";
import { factureDeDemarrage } from "@/lib/factures-plateforme";
import { redirectWithErreur } from "@/lib/flash";
import { libellesFonctions } from "@/lib/fonctions-plateforme";
import { offreDeLaChambre } from "@/lib/offre-chambre";
import { fmtDollars, fmtPourcent, payantsFacture } from "@/lib/plateforme";
import { offresPubliques } from "@/lib/plateforme-site";
import { getCurrentUser } from "@/lib/session";
import { stripeConfigure } from "@/lib/stripe";

export const metadata: Metadata = { title: { absolute: "Démarrage · L’Alliée Virtuelle" } };

const ETAPES = [
  { cle: "offre", libelle: "Offre" },
  { cle: "paiement", libelle: "Paiement" },
  { cle: "infos", libelle: "Chambre" },
] as const;
type Etape = (typeof ETAPES)[number]["cle"];

const CHAMP_FICHIER =
  "w-full min-w-0 rounded-lg border border-line bg-white text-ink text-[14px] px-3.5 py-2.5 outline-none focus:border-marque-vert/25 focus:bg-marque-vert/[0.06] file:mr-3 file:rounded-md file:border-0 file:bg-marque-vert/10 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-marque-vert file:cursor-pointer";

function EnTete() {
  return (
    <header className="border-b border-line bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2.5 text-ink">
          <span aria-hidden className="block w-2 h-7 rounded-full" style={{ background: "linear-gradient(180deg, #ad0707, #007140)" }} />
          <span className="text-[18px] font-extrabold tracking-[-0.02em] whitespace-nowrap">L’Alliée Virtuelle</span>
        </span>
        <form action={deconnexion}>
          <button type="submit" className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-md border-0 bg-transparent text-[14px] font-semibold text-muted cursor-pointer hover:text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit">
            <LogOut size={16} aria-hidden /> Se déconnecter
          </button>
        </form>
      </div>
    </header>
  );
}

// Les trois étapes ; « sautee » : le paiement d'une offre gratuite
function Etapes({ actuelle, sautee }: { actuelle: Etape; sautee: boolean }) {
  const rang = ETAPES.findIndex((e) => e.cle === actuelle);
  return (
    <ol aria-label="Étapes du démarrage" className="m-0 mb-8 p-0 list-none flex items-center gap-2 sm:gap-3">
      {ETAPES.map((e, i) => {
        const faite = i < rang;
        const ici = i === rang;
        return (
          <li key={e.cle} aria-current={ici ? "step" : undefined} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`grid place-items-center size-8 shrink-0 rounded-full text-[13px] font-bold ${
                faite ? "bg-marque-vert text-white" : ici ? "bg-marque-nuit text-white" : "bg-surface-2 text-muted border border-line"
              }`}
            >
              {faite ? <Check size={15} strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={`text-[13.5px] font-semibold whitespace-nowrap ${ici ? "text-ink" : "text-muted"} ${ici ? "" : "hidden sm:inline"}`}>
              {e.libelle}
              {faite && e.cle === "paiement" && sautee ? <span className="sr-only"> (sans objet)</span> : null}
              {faite ? <span className="sr-only"> (fait)</span> : null}
            </span>
            {i < ETAPES.length - 1 ? <span aria-hidden className="w-6 sm:w-10 h-px bg-line shrink-0" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Titre({ children }: { children: React.ReactNode }) {
  return <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-6">{children}</h1>;
}

type Recherche = { offre?: string; fonctions?: string; stripe?: string; msg?: string; ton?: string };

// Démarrage d'une Chambre créée depuis le site : son offre, le paiement du premier mois (offre payante), ses
// informations ; ensuite, son espace
export default async function Demarrage({ searchParams }: { searchParams: Promise<Recherche> }) {
  const sp = await searchParams;
  await getCurrentUser("admin");
  const chambreId = await chambreCourante();
  const c = await prisma.chambre.findFirst({ select: { demarrage: true, offreId: true, fonctionsChoisies: true } });
  if (!c?.demarrage) redirect("/admin");

  // Retour de la page de paiement de Stripe
  if (sp.stripe && stripeConfigure()) {
    const r = await appliquerSession(sp.stripe, chambreId).catch((e) => {
      console.error("[stripe] retour du démarrage non appliqué", e);
      return "erreur" as const;
    });
    if (r !== "payee") redirectWithErreur("/demarrage", "Le paiement n’a pas abouti.");
    redirect("/demarrage");
  }

  let etape: Etape = c.demarrage;
  // Premier mois payé (retour de Stripe ou confirmation de la banque) : étape suivante
  if (etape === "paiement") {
    const [dues, payees] = await Promise.all([
      prisma.facturePlateforme.count({ where: { payeeLe: null } }),
      prisma.facturePlateforme.count({ where: { payeeLe: { not: null } } }),
    ]);
    if (!dues && payees) {
      await prismaSysteme.chambre.update({ where: { id: chambreId }, data: { demarrage: "infos" } });
      etape = "infos";
    }
  }

  const message = sp.msg ? (sp.ton === "erreur" ? <Alerte>{sp.msg}</Alerte> : <Confirmation>{sp.msg}</Confirmation>) : null;
  const offre = await offreDeLaChambre();
  const gratuite = !!offre && offre.forfait <= 0 && offre.parUtilisateur <= 0;

  if (etape === "offre") {
    const offres = await offresPubliques();
    const choisie = offres.find((o) => o.id === sp.offre)?.id ?? c.offreId;
    const fonctions = sp.fonctions ? sp.fonctions.split(",") : c.fonctionsChoisies;
    return (
      <CadrePlateforme large entete={<EnTete />}>
        <CartePlateforme>
          <Etapes actuelle="offre" sautee={false} />
          <Titre>Choisissez votre offre</Titre>
          {message}
          <form action={choisirOffreDemarrage} className="flex flex-col gap-6">
            <ChoixOffre offres={offres} choisie={choisie} fonctions={fonctions} />
            <BoutonEnvoi enCours="Un instant…">Continuer</BoutonEnvoi>
          </form>
        </CartePlateforme>
      </CadrePlateforme>
    );
  }

  if (etape === "paiement") {
    const f = await factureDeDemarrage();
    const ligne = "flex items-baseline justify-between gap-3 py-2 text-[14.5px] tabular-nums";
    const paiementOuvert = stripeConfigure();
    return (
      <CadrePlateforme entete={<EnTete />}>
        <CartePlateforme>
          <Etapes actuelle="paiement" sautee={false} />
          <Titre>Paiement du premier mois</Titre>
          {message}
          {!paiementOuvert ? <Alerte>Le paiement par carte n’est pas encore disponible.</Alerte> : null}
          <div className="rounded-xl border border-line bg-surface-2 px-5 py-4">
            <p className="m-0 text-[16px] font-bold text-ink">Offre {offre?.nom}</p>
            {offre?.surMesure ? <p className="mt-1 mb-0 text-[13.5px] text-muted">{libellesFonctions(offre.fonctions) || "Aucune fonction choisie"}</p> : null}
            {f ? (
              <div className="mt-3 border-t border-line">
                <div className={ligne}><span className="text-muted">Forfait</span><span>{fmtDollars(f.forfait)}</span></div>
                {payantsFacture(f) ? (
                  <div className={ligne}><span className="text-muted">{payantsFacture(f)} compte{payantsFacture(f) > 1 ? "s" : ""} d’équipe</span><span>{fmtDollars(f.sousTotal - f.forfait)}</span></div>
                ) : null}
                <div className={ligne}><span className="text-muted">TPS ({fmtPourcent(f.tauxTps)})</span><span>{fmtDollars(f.tps)}</span></div>
                <div className={ligne}><span className="text-muted">TVQ ({fmtPourcent(f.tauxTvq)})</span><span>{fmtDollars(f.tvq)}</span></div>
                <div className={`${ligne} border-t-2 border-ink mt-1 pt-3 text-[17px] font-bold text-ink`}><span>Total</span><span>{fmtDollars(f.total)}</span></div>
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex flex-col gap-2.5">
            {paiementOuvert && f ? (
              <form action={payerDemarrage}>
                <BoutonEnvoi enCours="Ouverture du paiement…">Payer {fmtDollars(f.total)}</BoutonEnvoi>
              </form>
            ) : (
              <button type="button" disabled className="btn-action w-full opacity-50 cursor-not-allowed">Payer {f ? fmtDollars(f.total) : ""}</button>
            )}
            <form action={revenirAuxOffres}>
              <button type="submit" className="btn-contour w-full text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit">Changer d’offre</button>
            </form>
          </div>
          <p className="mt-5 mb-0 text-[12.5px] leading-relaxed text-faint">Paiement sur la page sécurisée de Stripe. La carte est gardée pour les mois suivants.</p>
        </CartePlateforme>
      </CadrePlateforme>
    );
  }

  // Informations de la Chambre
  const p = await prisma.profilChambre.findFirst();
  const v = (k: "description" | "adresseRue" | "codePostal" | "ville" | "pays" | "telephone" | "site" | "raisonSociale" | "neq" | "tps" | "tvq") => p?.[k] ?? "";
  const sousTitre = "m-0 pt-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted";
  return (
    <CadrePlateforme entete={<EnTete />}>
      <CartePlateforme>
        <Etapes actuelle="infos" sautee={gratuite} />
        <Titre>Votre Chambre</Titre>
        {message}
        <form action={terminerDemarrage} className="flex flex-col gap-4">
          <ChampAuth label="Logo">
            <EntreeFichier name="logo" accept="image/*" className={CHAMP_FICHIER} />
          </ChampAuth>
          <label className="block">
            <span className="block text-[13px] font-semibold text-ink mb-1.5">Présentation</span>
            <textarea name="description" rows={4} maxLength={3000} defaultValue={v("description")} className={`${CHAMP_AUTH} px-3.5 block leading-relaxed resize-y`} />
          </label>

          <p className={sousTitre}>Coordonnées</p>
          <ChampAuth label="Adresse" icone={<MapPin size={16} />}>
            <Saisie avecIcone name="adresseRue" maxLength={300} autoComplete="street-address" defaultValue={v("adresseRue")} />
          </ChampAuth>
          <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
            <ChampAuth label="Code postal">
              <Saisie name="codePostal" maxLength={20} autoComplete="postal-code" defaultValue={v("codePostal")} />
            </ChampAuth>
            <ChampAuth label="Ville">
              <Saisie name="ville" maxLength={120} autoComplete="address-level2" defaultValue={v("ville")} />
            </ChampAuth>
            <ChampAuth label="Pays">
              <Saisie name="pays" maxLength={120} autoComplete="country-name" defaultValue={v("pays")} />
            </ChampAuth>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampAuth label="Téléphone" icone={<Phone size={16} />}>
              <Saisie avecIcone name="telephone" type="tel" maxLength={60} autoComplete="tel" defaultValue={v("telephone")} />
            </ChampAuth>
            <ChampAuth label="Site web" icone={<Globe size={16} />}>
              <Saisie avecIcone name="site" maxLength={300} autoComplete="url" defaultValue={v("site")} />
            </ChampAuth>
          </div>

          <p className={sousTitre}>Facturation</p>
          <ChampAuth label="Raison sociale">
            <Saisie name="raisonSociale" maxLength={200} autoComplete="organization" defaultValue={v("raisonSociale")} />
          </ChampAuth>
          <div className="grid gap-4 sm:grid-cols-3">
            <ChampAuth label="NEQ">
              <Saisie name="neq" maxLength={40} defaultValue={v("neq")} />
            </ChampAuth>
            <ChampAuth label="N° TPS">
              <Saisie name="tps" maxLength={40} defaultValue={v("tps")} />
            </ChampAuth>
            <ChampAuth label="N° TVQ">
              <Saisie name="tvq" maxLength={40} defaultValue={v("tvq")} />
            </ChampAuth>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <BoutonEnvoi enCours="Enregistrement…">Terminer</BoutonEnvoi>
            <button type="submit" name="plusTard" value="1" formNoValidate className="btn-contour w-full text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit">
              Plus tard
            </button>
          </div>
        </form>
      </CartePlateforme>
    </CadrePlateforme>
  );
}
