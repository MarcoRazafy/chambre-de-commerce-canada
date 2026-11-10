import Image from "next/image";
import { Building2, Globe, Mail, MapPin, Phone, Save } from "lucide-react";
import { IconesImageChambre } from "@/components/admin/IconesImageChambre";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { Field, INPUT, SubmitButton } from "@/components/form-bits";
import { Card, Saillant } from "@/components/ui";
import { enregistrerProfilChambre } from "@/lib/actions/profil-chambre";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { completerProfil, NOM_CHAMBRE, numerosFiscaux } from "@/lib/profil-chambre-defauts";

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
          <span className="relative -mt-12 w-[168px] h-[92px] shrink-0 rounded-[var(--radius-m)] bg-white border border-line shadow-[var(--shadow)] grid place-items-center p-3">
            <Image src={p.logo} alt={p.nom} width={320} height={180} className="max-w-full max-h-full w-auto h-auto object-contain" />
            <IconesImageChambre champ="logo" personnalisee={Boolean(brut?.logo)} className="absolute -bottom-3 -right-3" />
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

      <form action={enregistrerProfilChambre} className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panneau titre="La Chambre" sousTitre="Sa présentation, ses coordonnées et ce qui figure sur ses factures" teinte="rouge">
          <div className="flex flex-col gap-4">
            <Field label="Nom">
              <input name="nom" maxLength={200} defaultValue={v("nom")} placeholder={NOM_CHAMBRE} className={INPUT} />
            </Field>
            <Field label="Présentation">
              <textarea name="description" rows={5} maxLength={3000} defaultValue={v("description")} placeholder="Ce que fait la Chambre, pour qui…" className={`${INPUT} block w-full leading-relaxed resize-y`} />
            </Field>
            <Field label="Adresse">
              <input name="adresse" maxLength={500} defaultValue={v("adresse")} placeholder={p.adresse} className={INPUT} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Courriel">
                <input name="email" type="email" maxLength={200} defaultValue={v("email")} placeholder={p.email} className={INPUT} />
              </Field>
              <Field label="Téléphone">
                <input name="telephone" maxLength={60} defaultValue={v("telephone")} placeholder={p.telephone} className={INPUT} />
              </Field>
            </div>
            <Field label="Raison sociale">
              <input name="raisonSociale" maxLength={200} defaultValue={v("raisonSociale")} placeholder={p.nom} className={INPUT} />
            </Field>
            <Field label="Adresse de facturation">
              <textarea name="adresseFacturation" rows={2} maxLength={500} defaultValue={v("adresseFacturation")} placeholder={p.adresse} className={`${INPUT} block w-full resize-y`} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="NEQ">
                <input name="neq" maxLength={40} defaultValue={v("neq")} placeholder="1234567890" className={INPUT} />
              </Field>
              <Field label="N° TPS">
                <input name="tps" maxLength={40} defaultValue={v("tps")} placeholder="123456789 RT0001" className={INPUT} />
              </Field>
              <Field label="N° TVQ">
                <input name="tvq" maxLength={40} defaultValue={v("tvq")} placeholder="1234567890 TQ0001" className={INPUT} />
              </Field>
            </div>
            <Field label="Site web">
              <input name="site" maxLength={300} defaultValue={v("site")} placeholder={p.site} className={INPUT} />
            </Field>
          </div>
        </Panneau>

        <Card className="p-5 lg:sticky lg:top-4">
          <div className="text-[11.5px] uppercase tracking-[0.12em] font-semibold text-faint mb-3">Aperçu sur une facture</div>
          <div className="flex items-start gap-4">
            <span className="w-[110px] h-[56px] shrink-0 grid place-items-center">
              <Image src={p.logo} alt="" width={220} height={112} className="max-w-full max-h-full w-auto h-auto object-contain" />
            </span>
            <div className="text-[12.5px] leading-relaxed text-ink min-w-0">
              <div className="font-bold text-[13.5px] inline-flex items-center gap-1.5"><Building2 size={14} className="text-muted shrink-0" />{p.raisonSociale}</div>
              <div className="text-muted whitespace-pre-line">{p.adresseFacturation}</div>
              <div className="text-muted">{numerosFiscaux(p).join(" · ")}</div>
            </div>
          </div>
          <p className="m-0 mt-3 text-[12px] text-faint">Le logo des factures est celui de l’entreprise.</p>
        </Card>

        <div className="lg:col-span-2 sticky bottom-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-bg/90 backdrop-blur border-t border-line flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[12.5px] text-muted">Un champ vide garde la valeur affichée en gris.</span>
          <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer les modifications</SubmitButton>
        </div>
      </form>
    </>
  );
}
