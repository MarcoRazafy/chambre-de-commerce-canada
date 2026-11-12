import Image from "next/image";
import { Globe, Mail, MapPin, Phone, Save } from "lucide-react";
import { IconesImageChambre } from "@/components/admin/IconesImageChambre";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Card, Saillant } from "@/components/ui";
import { enregistrerProfilChambre } from "@/lib/actions/profil-chambre";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { completerProfil } from "@/lib/profil-chambre-defauts";

// « Mon entreprise » : la Chambre elle-même. Sa présentation (logo, couverture, coordonnées)
// et ce qui figure sur ses factures (raison sociale, adresse, NEQ, TPS, TVQ ; le logo est celui de l'entreprise)
export default async function MonEntreprise() {
  const brut = await getProfilChambreBrut();
  const p = completerProfil(brut);
  const v = (k: keyof NonNullable<typeof brut>) => (brut?.[k] as string | null | undefined) ?? "";

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
          {/* Le cadre prend la forme du logo : hauteur fixe, largeur selon ses proportions (bornée) */}
          <span className="relative -mt-12 self-start h-[92px] min-w-[92px] max-w-[260px] shrink-0 inline-flex items-center justify-center p-1 rounded-[var(--radius-m)] bg-white border border-line shadow-[var(--shadow)]">
            <Image src={p.logo} alt={p.nom} width={600} height={600} sizes="260px" className="h-full w-auto max-w-full object-contain" />
            <IconesImageChambre champ="logo" personnalisee={Boolean(brut?.logo)} className="absolute -bottom-4 left-1/2 -translate-x-1/2" />
          </span>
          <div className="min-w-0 flex-1 sm:pt-3">
            <h2 className="m-0 text-[21px] leading-tight text-balance">{p.nom}</h2>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="shrink-0" aria-hidden />{p.adresse}</span>
              <span className="inline-flex items-center gap-1.5 break-all"><Mail size={14} className="shrink-0" aria-hidden />{p.email}</span>
              <span className="inline-flex items-center gap-1.5"><Phone size={14} className="shrink-0" aria-hidden />{p.telephone}</span>
              {p.site ? <span className="inline-flex items-center gap-1.5 break-all"><Globe size={14} className="shrink-0" aria-hidden />{p.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span> : null}
            </div>
          </div>
        </div>
      </Card>

      <form action={enregistrerProfilChambre} className="flex flex-col gap-4">
        <Panneau titre="La Chambre" sousTitre="Sa présentation, ses coordonnées et ce qui figure sur ses factures" teinte="rouge">
          <div className="flex flex-col gap-4">
            <Field label="Nom">
              <input name="nom" maxLength={200} defaultValue={v("nom")} placeholder="Nom de l’entreprise" className={INPUT} />
            </Field>
            <Field label="Présentation">
              <textarea name="description" rows={5} maxLength={3000} defaultValue={v("description")} placeholder="Ce que fait l’entreprise, pour qui…" className={`${INPUT} block w-full leading-relaxed resize-y`} />
            </Field>
            <Field label="Adresse rue">
              <input name="adresseRue" maxLength={300} defaultValue={v("adresseRue")} placeholder="Numéro et nom de la rue" autoComplete="street-address" className={INPUT} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Code postal">
                <input name="codePostal" maxLength={20} defaultValue={v("codePostal")} autoComplete="postal-code" className={INPUT} />
              </Field>
              <Field label="Ville">
                <input name="ville" maxLength={120} defaultValue={v("ville")} autoComplete="address-level2" className={INPUT} />
              </Field>
              <Field label="Pays">
                <input name="pays" maxLength={120} defaultValue={v("pays")} autoComplete="country-name" className={INPUT} />
              </Field>
            </div>
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
                <input name="tps" maxLength={40} defaultValue={v("tps")} placeholder="9 chiffres + RT0001" className={INPUT} />
              </Field>
              <Field label="N° TVQ">
                <input name="tvq" maxLength={40} defaultValue={v("tvq")} placeholder="10 chiffres + TQ0001" className={INPUT} />
              </Field>
            </div>
            <Field label="Site web">
              <input name="site" maxLength={300} defaultValue={v("site")} placeholder="www.entreprise.com" className={INPUT} />
            </Field>
          </div>
        </Panneau>

        <div className="sticky bottom-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-bg/90 backdrop-blur border-t border-line flex items-center justify-end gap-3 flex-wrap">
          <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer les modifications</SubmitButton>
        </div>
      </form>
    </>
  );
}
