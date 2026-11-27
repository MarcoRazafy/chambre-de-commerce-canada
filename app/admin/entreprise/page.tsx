import Image from "next/image";
import { ExternalLink, Globe, Lock, Mail, MapPin, Phone, Save, UserPlus } from "lucide-react";
import { BoutonCopierLien } from "@/components/rendezvous/Reglages";
import { chambreCourante } from "@/lib/chambre-courante";
import { FondLogo } from "@/components/admin/FondLogo";
import { IconesImageChambre } from "@/components/admin/IconesImageChambre";
import { ListeFormules } from "@/components/admin/ListeFormules";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Card, Saillant } from "@/components/ui";
import { enregistrerProfilChambre } from "@/lib/actions/profil-chambre";
import { estAdministrateur } from "@/lib/autorisations";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { liensMembres } from "@/lib/liens-membres";
import { completerProfil } from "@/lib/profil-chambre-defauts";
import { prefixeNumeros } from "@/lib/prefixe-numeros";
import { FUSEAUX } from "@/lib/fuseau";
import { getFuseau } from "@/lib/fuseau-chambre";

export default async function MonEntreprise() {
  const [brut, moi, formules] = await Promise.all([
    getProfilChambreBrut(),
    getCurrentUser("admin"),
    prisma.formuleAdhesion.findMany({
      orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
      select: { id: true, pays: true, profil: true, montant: true, devise: true, active: true, _count: { select: { membres: true } } },
    }),
  ]);
  const gere = estAdministrateur(moi);
  const p = completerProfil(brut);
  const adhesion = (await liensMembres(await chambreCourante()))?.adhesion ?? null;
  const [prefixe, fuseau] = await Promise.all([prefixeNumeros(), getFuseau()]);
  const v = (k: keyof NonNullable<typeof brut>) => (brut?.[k] as string | null | undefined) ?? "";
  const rue = v("adresseRue") || (v("codePostal") || v("ville") || v("province") || v("pays") ? "" : v("adresse"));

  return (
    <>
      <EnTeteAdmin surtitre="Administration" titre={<>Mon <Saillant>entreprise</Saillant></>} />

      <Card className="p-0 overflow-hidden mb-5">
        <div className="relative">
          <div
            className="h-[160px] sm:h-[200px] bg-cover bg-center"
            style={{ backgroundColor: "#ad0707", backgroundImage: p.couverture ? `url('${p.couverture}')` : "linear-gradient(120deg,#ad0707 0%,#5c1220 52%,#007140 100%)" }}
            role="img"
            aria-label="Couverture de la Chambre"
          />
          <IconesImageChambre champ="couverture" personnalisee={Boolean(brut?.couverture)} className="absolute top-3 right-3" />
        </div>
        <div className="px-6 pb-6 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          <span className="relative -mt-12 self-start h-[92px] min-w-[92px] max-w-[260px] shrink-0 inline-flex items-center justify-center p-1 rounded-[var(--radius-m)] bg-white border border-line shadow-[var(--shadow)]" style={p.logoFond ? { backgroundColor: p.logoFond } : undefined}>
            <Image src={p.logo} alt={p.nom} width={600} height={600} sizes="260px" className="h-full w-auto max-w-full object-contain" />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              <IconesImageChambre champ="logo" personnalisee={Boolean(brut?.logo)} />
              <FondLogo actuel={p.logoFond} />
            </div>
          </span>
          <div className="min-w-0 flex-1 sm:pt-3">
            <h2 className="m-0 text-[21px] leading-tight text-balance">{p.nom}</h2>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="shrink-0" aria-hidden />{p.adresse}</span>
              <span className="inline-flex items-center gap-1.5 break-all"><Mail size={14} className="shrink-0" aria-hidden />{p.email}</span>
              <span className="inline-flex items-center gap-1.5"><Phone size={14} className="shrink-0" aria-hidden />{p.telephone}</span>
              {p.site ? <span className="inline-flex items-center gap-1.5 break-all"><Globe size={14} className="shrink-0" aria-hidden />{p.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {adhesion ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink mr-1"><UserPlus size={14} className="shrink-0" aria-hidden />Lien d’adhésion</span>
                  <a href={adhesion} target="_blank" rel="noopener noreferrer" className="text-[13px] text-muted break-all mr-1 hover:text-ink">{adhesion}</a>
                  <BoutonCopierLien lien={adhesion} libelle="Copier le lien" />
                  <a href={adhesion} target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2">
                    <ExternalLink size={14} aria-hidden /> Ouvrir
                  </a>
                </>
              ) : null}
              <SubmitButton form="profil-chambre" sm pendingLabel="Enregistrement…"><Save size={14} /> Enregistrer</SubmitButton>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 items-start grid-cols-[minmax(0,1fr)] xl:grid-cols-2">
      <form id="profil-chambre" action={enregistrerProfilChambre} className="flex flex-col gap-4 min-w-0">
        <Panneau titre="La Chambre" sousTitre="Sa présentation, ses coordonnées et ce qui figure sur ses factures" teinte="rouge">
          <div className="flex flex-col gap-4">
            <Field label="Nom">
              <input name="nom" maxLength={200} defaultValue={v("nom")} placeholder="Nom de l’entreprise" className={INPUT} />
            </Field>
            <Field label="Présentation">
              <textarea name="description" rows={5} maxLength={3000} defaultValue={v("description")} placeholder="Ce que fait l’entreprise, pour qui…" className={`${INPUT} block w-full leading-relaxed resize-y`} />
            </Field>
            <fieldset className="m-0 p-0 border-0 min-w-0 flex flex-col gap-3">
              <legend className="mb-2 p-0 text-[13px] font-semibold text-ink">Adresse</legend>
              <Field label="Rue">
                <input name="adresseRue" maxLength={300} defaultValue={rue} placeholder="Numéro et nom de la rue" autoComplete="street-address" className={INPUT} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ville">
                  <input name="ville" maxLength={120} defaultValue={v("ville")} autoComplete="address-level2" className={INPUT} />
                </Field>
                <Field label="Province">
                  <input name="province" maxLength={120} defaultValue={v("province")} autoComplete="address-level1" className={INPUT} />
                </Field>
                <Field label="Code postal">
                  <input name="codePostal" maxLength={20} defaultValue={v("codePostal")} autoComplete="postal-code" className={INPUT} />
                </Field>
                <Field label="Pays">
                  <input name="pays" maxLength={120} defaultValue={v("pays")} autoComplete="country-name" className={INPUT} />
                </Field>
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Courriel">
                <input name="email" type="email" maxLength={200} defaultValue={v("email")} placeholder="contact@entreprise.com" className={INPUT} />
              </Field>
              <Field label="Téléphone">
                <input name="telephone" maxLength={60} defaultValue={v("telephone")} placeholder="Numéro principal" className={INPUT} />
              </Field>
            </div>
            <Field label="Raison sociale">
              <input name="raisonSociale" maxLength={200} defaultValue={v("raisonSociale")} placeholder="Nom légal, s’il diffère du nom" className={INPUT} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="NEQ">
                <input name="neq" maxLength={40} defaultValue={v("neq")} placeholder="10 chiffres" className={INPUT} />
              </Field>
              <Field label="N° TPS">
                <input name="tps" maxLength={40} defaultValue={v("tps")} className={INPUT} />
              </Field>
              <Field label="N° TVQ">
                <input name="tvq" maxLength={40} defaultValue={v("tvq")} className={INPUT} />
              </Field>
            </div>
            <Field label="Fuseau horaire">
              <select name="fuseau" defaultValue={fuseau} className={`${INPUT} sm:max-w-[420px]`}>
                {FUSEAUX.map((f) => (
                  <option key={f.cle} value={f.cle}>{f.libelle}</option>
                ))}
              </select>
            </Field>
            <Field label="Préfixe des numéros (factures, paiements, billets)">
              <input name="prefixeNumeros" maxLength={5} defaultValue={v("prefixeNumeros")} placeholder={prefixe} className={`${INPUT} uppercase max-w-[160px]`} />
            </Field>
            <Field label="Site web">
              <input name="site" maxLength={300} defaultValue={v("site")} placeholder="www.entreprise.com" className={INPUT} />
            </Field>
            <fieldset className="m-0 p-0 border-0 min-w-0 flex flex-col gap-3 pt-1">
              <legend className="mb-2 p-0 text-[13px] font-semibold text-ink">Mentions légales</legend>
              <Field label="Conditions générales de vente (lien)">
                <input name="cgv" inputMode="url" maxLength={500} defaultValue={v("cgv")} placeholder="www.entreprise.com/cgv" className={INPUT} />
              </Field>
              <Field label="Politique de confidentialité (lien)">
                <input name="confidentialite" inputMode="url" maxLength={500} defaultValue={v("confidentialite")} placeholder="www.entreprise.com/confidentialite" className={INPUT} />
              </Field>
              <Field label="Copyright">
                <input name="copyright" maxLength={300} defaultValue={v("copyright")} placeholder={`© ${new Date().getFullYear()} ${p.nom}. Tous droits réservés.`} className={INPUT} />
              </Field>
            </fieldset>
          </div>
        </Panneau>

        <div className="flex justify-center pt-1">
          <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer les modifications</SubmitButton>
        </div>
      </form>

      <div id="formules" className="scroll-mt-24 min-w-0">
        <Panneau titre="Formules d’adhésion" sousTitre="Proposées à l’inscription ; elles fixent le montant des cotisations" teinte="vert">
          <div className="flex flex-col gap-4">
            {!gere ? (
              <p className="m-0 flex items-center gap-2 text-[13px] text-muted"><Lock size={14} aria-hidden /> Réservé aux admins.</p>
            ) : null}
            <ListeFormules gere={gere} formules={formules.map(({ _count, ...f }) => ({ ...f, membres: _count.membres }))} />
          </div>
        </Panneau>
      </div>
      </div>
    </>
  );
}
