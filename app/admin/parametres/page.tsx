import { redirect } from "next/navigation";
import { CreditCard, ExternalLink, Lock, Save, Send } from "lucide-react";
import { DomaineActif, DomaineExpediteur } from "@/components/admin/StatutExpediteur";
import { EnTeteAdmin, Onglets, Panneau } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Saillant } from "@/components/ui";
import {
  enregistrerAlertes,
  enregistrerExpediteur,
  enregistrerMentions,
  enregistrerReseaux,
  envoyerTestExpediteur,
} from "@/lib/actions/parametres";
import { estAdministrateur } from "@/lib/autorisations";
import { domaineDe, etatDomaine } from "@/lib/brevo-domaines";
import { adresseServeur } from "@/lib/courriel";
import type { Reseau } from "@/lib/lettre-blocs";
import { getParametres } from "@/lib/parametres";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { completerProfil } from "@/lib/profil-chambre-defauts";
import { getCurrentUser } from "@/lib/session";
import { activerModeDeveloppeur, connecterStripe, desactiverModeDeveloppeur } from "@/lib/actions/parametres";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma } from "@/lib/db";
import { lienInscriptionStripe, majCompteStripe } from "@/lib/encaissement-stripe";
import { redirectWithFlash } from "@/lib/flash";
import { urlPublique } from "@/lib/courriel";
import { stripeConfigure } from "@/lib/stripe";
import { Pill } from "@/components/ui";
import { ListeFormules } from "@/components/admin/ListeFormules";

const ONGLETS = [
  { cle: "courriels", libelle: "Courriels" },
  { cle: "reseaux", libelle: "Réseaux sociaux" },
  { cle: "mentions", libelle: "Mentions légales" },
  { cle: "formules", libelle: "Formules d’adhésion" },
  { cle: "paiements", libelle: "Paiements en ligne" },
  { cle: "developpeur", libelle: "Mode développeur" },
] as const;

const RESEAUX_LIBELLES: { cle: Reseau; libelle: string; exemple: string }[] = [
  { cle: "facebook", libelle: "Facebook", exemple: "facebook.com/votre-page" },
  { cle: "linkedin", libelle: "LinkedIn", exemple: "linkedin.com/company/votre-entreprise" },
  { cle: "instagram", libelle: "Instagram", exemple: "instagram.com/votre-compte" },
  { cle: "youtube", libelle: "YouTube", exemple: "youtube.com/@votre-chaine" },
  { cle: "tiktok", libelle: "TikTok", exemple: "tiktok.com/@votre-compte" },
];

// Paramètres de la plateforme, en onglets : Courriels (expéditeur, alertes de l'équipe), Réseaux sociaux,
// Mentions légales. Les super admins modifient ; les admins consultent.
export default async function Parametres({ searchParams }: { searchParams: Promise<{ onglet?: string; stripe?: string }> }) {
  const sp = await searchParams;
  // Paiements en ligne : seulement quand la plateforme a son compte Stripe
  const onglets = ONGLETS.filter((o) => o.cle !== "paiements" || stripeConfigure());
  const onglet = onglets.find((o) => o.cle === sp.onglet)?.cle ?? "courriels";
  const [moi, brut, reglages] = await Promise.all([getCurrentUser("admin"), getProfilChambreBrut(), getParametres()]);
  const gere = estAdministrateur(moi);

  // Retour des formulaires de Stripe : l'état du compte se met à jour ; lien périmé : un nouveau
  const compte = onglet === "paiements"
    ? await prisma.chambre.findFirst({ select: { stripeCompteId: true, stripeCompteActif: true, stripeComptePays: true } })
    : null;
  if (onglet === "paiements" && sp.stripe) {
    const ici = "/admin/parametres?onglet=paiements";
    if (sp.stripe === "reprendre" && gere) redirect(await lienInscriptionStripe(await chambreCourante(), await urlPublique(ici)));
    if (compte?.stripeCompteId) {
      const actif = await majCompteStripe(compte.stripeCompteId);
      redirectWithFlash(ici, actif ? "Compte Stripe connecté" : "Inscription chez Stripe à terminer");
    }
  }
  const nomEntreprise = completerProfil(brut).nom;

  // Expéditeur : le domaine de l'entreprise, puis l'adresse sur ce domaine. Le domaine actif reste celui de la
  // plateforme tant que le domaine n'est pas validé ou qu'aucune adresse n'y est indiquée
  const domaine = brut?.expediteurDomaine ?? "";
  const etat = onglet === "courriels" && domaine ? await etatDomaine(domaine) : null;
  const adresse = brut?.expediteurEmail ?? "";
  const locale = domaine && adresse.endsWith(`@${domaine}`) ? adresse.slice(0, -domaine.length - 1) : "";
  const actif = etat?.etat === "valide" && locale ? domaine : domaineDe(adresseServeur());

  const verrou = !gere ? (
    <p className="m-0 flex items-center gap-2 text-[13px] text-muted"><Lock size={14} aria-hidden /> Réservé aux super admins.</p>
  ) : null;
  const enregistrer = gere ? (
    <div className="flex justify-end pt-1">
      <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
    </div>
  ) : null;

  return (
    <>
      <EnTeteAdmin surtitre="Administration" titre={<Saillant>Paramètres</Saillant>} />

      <Onglets actif={onglet} onglets={onglets.map((o) => ({ cle: o.cle, libelle: o.libelle, href: `/admin/parametres?onglet=${o.cle}` }))} />

      {onglet === "courriels" ? (
        <div className="flex flex-col gap-4">
          <form action={enregistrerExpediteur}>
            <Panneau
              titre="Expéditeur"
              sousTitre="Le nom et l’adresse qui envoient les courriels de la plateforme"
              teinte="rouge"
              action={actif ? <DomaineActif domaine={actif} /> : null}
            >
              <fieldset disabled={!gere} className="m-0 p-0 border-0 min-w-0 flex flex-col gap-4">
                {verrou}
                <DomaineExpediteur domaine={domaine} etat={etat} gere={gere} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom de l’expéditeur">
                    <input name="expediteurNom" maxLength={100} defaultValue={brut?.expediteurNom ?? ""} placeholder={nomEntreprise} className={INPUT} />
                  </Field>
                  {domaine ? (
                    <Field label="Adresse d’expédition">
                      <div className="flex min-w-0">
                        <input
                          name="expediteurLocale"
                          maxLength={254}
                          autoCapitalize="none"
                          autoComplete="off"
                          spellCheck={false}
                          defaultValue={locale}
                          placeholder="contact"
                          className={`${INPUT} min-w-0 flex-1 rounded-r-none`}
                        />
                        <span className="flex items-center min-w-0 max-w-[60%] border border-l-0 border-line-champ bg-surface-2 rounded-r-[var(--radius-s)] px-3 text-[13.6px] text-muted">
                          <span className="truncate">@{domaine}</span>
                        </span>
                      </div>
                    </Field>
                  ) : null}
                </div>
                {gere ? (
                  <div className="flex items-center justify-end gap-2.5 flex-wrap pt-1">
                    <button type="submit" formAction={envoyerTestExpediteur} className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">
                      <Send size={14} /> M’envoyer un test
                    </button>
                    <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
                  </div>
                ) : null}
              </fieldset>
            </Panneau>
          </form>

          <form action={enregistrerAlertes}>
            <Panneau titre="Alertes de l’équipe" sousTitre="L’adresse qui reçoit les nouvelles adhésions, les rendez-vous et les questions des visiteurs" teinte="bleu">
              <fieldset disabled={!gere} className="m-0 p-0 border-0 min-w-0 flex flex-col gap-4">
                {verrou}
                <Field label="Courriel de l’équipe">
                  <input name="courrielEquipe" type="email" maxLength={200} defaultValue={brut?.courrielEquipe ?? ""} placeholder={reglages.courrielEquipe} className={`${INPUT} sm:max-w-[420px]`} />
                </Field>
                {enregistrer}
              </fieldset>
            </Panneau>
          </form>
        </div>
      ) : null}

      {onglet === "reseaux" ? (
        <form action={enregistrerReseaux}>
          <Panneau titre="Réseaux sociaux" sousTitre="Les icônes du bas des courriels (newsletter, rappels)" teinte="degrade">
            <fieldset disabled={!gere} className="m-0 p-0 border-0 min-w-0 flex flex-col gap-4">
              {verrou}
              <div className="grid gap-4 sm:grid-cols-2">
                {RESEAUX_LIBELLES.map((r) => (
                  <Field key={r.cle} label={r.libelle}>
                    <input name={r.cle} inputMode="url" maxLength={500} defaultValue={brut?.[r.cle] ?? ""} placeholder={r.exemple} className={INPUT} />
                  </Field>
                ))}
              </div>
              {enregistrer}
            </fieldset>
          </Panneau>
        </form>
      ) : null}

      {onglet === "formules" ? (
        <Panneau titre="Formules d’adhésion" sousTitre="Proposées à l’inscription ; elles fixent le montant des cotisations" teinte="vert">
          <div className="flex flex-col gap-4">
            {verrou}
            <ListeFormules
              gere={gere}
              formules={(
                await prisma.formuleAdhesion.findMany({
                  orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
                  select: { id: true, pays: true, profil: true, montant: true, devise: true, active: true, _count: { select: { membres: true } } },
                })
              ).map(({ _count, ...f }) => ({ ...f, membres: _count.membres }))}
            />
          </div>
        </Panneau>
      ) : null}

      {onglet === "developpeur" ? await (async () => {
        const [chambre, visites] = await Promise.all([
          prisma.chambre.findFirst({ select: { accesDevJusqua: true, accesDevPar: true } }),
          prisma.auditLog.findMany({ where: { action: { in: ["visite_gm", "visite_gm_fin"] } }, orderBy: { createdAt: "desc" }, take: 6 }),
        ]);
        const actif = !!chambre?.accesDevJusqua && chambre.accesDevJusqua > new Date();
        const autorise = gere && !moi.visiteGM;
        const quand = (d: Date) => d.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
        return (
          <Panneau titre="Mode développeur" sousTitre="Autoriser l’Admin GM de la plateforme à entrer dans l’espace pour vous aider" teinte="bleu">
            <div className="flex flex-col gap-4">
              {!gere ? verrou : null}
              {actif && chambre?.accesDevJusqua ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="m-0 flex items-center gap-2.5 text-[14px] flex-wrap">
                    <Pill tone="ok">Actif</Pill> jusqu’au {quand(chambre.accesDevJusqua)}{chambre.accesDevPar ? <span className="text-muted">· par {chambre.accesDevPar}</span> : null}
                  </p>
                  {autorise ? (
                    <form action={desactiverModeDeveloppeur}>
                      <button type="submit" className="btn-contour btn-contour-sm text-bad hover:bg-surface-2">Désactiver</button>
                    </form>
                  ) : null}
                </div>
              ) : autorise ? (
                <form action={activerModeDeveloppeur} className="flex items-end gap-2.5 flex-wrap">
                  <Field label="Durée">
                    <select name="duree" defaultValue="7" className={`${INPUT} sm:w-[180px]`}>
                      <option value="1">24 heures</option>
                      <option value="7">7 jours</option>
                      <option value="30">30 jours</option>
                    </select>
                  </Field>
                  <SubmitButton pendingLabel="Activation…">Activer</SubmitButton>
                </form>
              ) : (
                <p className="m-0 text-[14px] text-muted">Désactivé</p>
              )}
              {visites.length ? (
                <div>
                  <span className="block text-[12.3px] font-semibold text-muted mb-1.5">Dernières visites</span>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1.5 text-[13.5px]">
                    {visites.map((v) => (
                      <li key={v.id}><span className="text-ink">{v.detail}</span> <span className="text-faint">· {quand(v.createdAt)} · {v.acteur}</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Panneau>
        );
      })() : null}

      {onglet === "paiements" ? (
        <Panneau titre="Encaissement par carte" sousTitre="Les cotisations payées par carte arrivent sur le compte Stripe de la Chambre" teinte="bleu">
          <div className="flex flex-col gap-4">
            {verrou}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="m-0 flex items-center gap-2.5 text-[14px]">
                <CreditCard size={18} className="text-muted" aria-hidden />
                {compte?.stripeCompteActif ? (
                  <span className="inline-flex items-center gap-2"><Pill tone="ok">Actif</Pill> Compte Stripe{compte.stripeComptePays ? ` · ${compte.stripeComptePays}` : ""}</span>
                ) : compte?.stripeCompteId ? (
                  <Pill tone="warn">Inscription à terminer</Pill>
                ) : (
                  <span className="text-muted">Aucun compte connecté</span>
                )}
              </p>
              <div className="flex items-center gap-2.5 flex-wrap">
                {compte?.stripeCompteActif ? (
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline">
                    <ExternalLink size={14} aria-hidden /> Tableau de bord Stripe
                  </a>
                ) : gere ? (
                  <form action={connecterStripe}>
                    <button type="submit" className="btn-action btn-action-sm">{compte?.stripeCompteId ? "Terminer l’inscription" : "Connecter Stripe"}</button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </Panneau>
      ) : null}

      {onglet === "mentions" ? (
        <form action={enregistrerMentions}>
          <Panneau titre="Mentions légales" sousTitre="Le bas de page des courriels (newsletter, rappels)" teinte="vert">
            <fieldset disabled={!gere} className="m-0 p-0 border-0 min-w-0 flex flex-col gap-4">
              {verrou}
              <Field label="Lien de la politique de confidentialité">
                <input name="confidentialite" inputMode="url" maxLength={500} defaultValue={brut?.confidentialite ?? ""} placeholder="votre-site.com/confidentialite" className={INPUT} />
              </Field>
              <Field label="Copyright">
                <input name="copyright" maxLength={300} defaultValue={brut?.copyright ?? ""} placeholder={reglages.mentions.copyright} className={INPUT} />
              </Field>
              {enregistrer}
            </fieldset>
          </Panneau>
        </form>
      ) : null}
    </>
  );
}
