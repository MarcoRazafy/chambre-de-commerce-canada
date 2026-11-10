import Image from "next/image";
import { Building2, Globe, Mail, MapPin, Phone, Save } from "lucide-react";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { ChampPhoto, Field, INPUT, SubmitButton } from "@/components/form-bits";
import { Card, Saillant } from "@/components/ui";
import { enregistrerProfilChambre } from "@/lib/actions/profil-chambre";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { completerProfil, NOM_CHAMBRE, numerosFiscaux } from "@/lib/profil-chambre-defauts";

// « Mon entreprise » : la Chambre elle-même. Sa présentation (logo, couverture, coordonnées)
// et ce qui figure sur ses factures (raison sociale, adresse, NEQ, TPS, TVQ, NIF, STAT, logo, mention)
export default async function MonEntreprise() {
  const brut = await getProfilChambreBrut();
  const p = completerProfil(brut);
  const v = (k: keyof NonNullable<typeof brut>) => (brut?.[k] as string | null | undefined) ?? "";

  return (
    <>
      <EnTeteAdmin surtitre="Administration" titre={<>Mon <Saillant>entreprise</Saillant></>} />

      <Card className="p-0 overflow-hidden mb-5">
        <div className="relative h-[180px] bg-cover bg-center" style={{ backgroundColor: "#ad0707", backgroundImage: p.couverture ? `url('${p.couverture}')` : "linear-gradient(120deg,#ad0707 0%,#5c1220 52%,#007140 100%)" }} />
        <div className="px-6 pb-5 flex items-end gap-5 flex-wrap -mt-10">
          <span className="relative w-[150px] h-[80px] rounded-[var(--radius-m)] bg-white border border-line shadow-[var(--shadow)] grid place-items-center p-2.5">
            <Image src={p.logo} alt={p.nom} width={300} height={160} className="max-w-full max-h-full w-auto h-auto object-contain" />
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="m-0 text-[22px]">{p.nom}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{p.adresse}</span>
              <span className="inline-flex items-center gap-1.5"><Mail size={14} />{p.email}</span>
              <span className="inline-flex items-center gap-1.5"><Phone size={14} />{p.telephone}</span>
              {p.site ? <span className="inline-flex items-center gap-1.5"><Globe size={14} />{p.site.replace(/^https?:\/\//, "")}</span> : null}
            </div>
          </div>
        </div>
      </Card>

      <form action={enregistrerProfilChambre} className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
        <Panneau titre="La Chambre" sousTitre="Sa présentation, son logo et sa couverture" teinte="rouge">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <ChampPhoto name="logo" retirer="retirer-logo" apercu={brut?.logo} libelle="Logo" ratio="aspect-[2/1]" aide="PNG sur fond transparent de préférence." />
              <ChampPhoto name="couverture" retirer="retirer-couverture" apercu={brut?.couverture} libelle="Couverture" ratio="aspect-[16/6]" aide="Une image large, en paysage." />
            </div>
            <Field label="Nom">
              <input name="nom" maxLength={200} defaultValue={v("nom")} placeholder={NOM_CHAMBRE} className={INPUT} />
            </Field>
            <Field label="Présentation">
              <textarea name="description" rows={4} maxLength={3000} defaultValue={v("description")} placeholder="Ce que fait la Chambre, pour qui…" className={`${INPUT} leading-relaxed`} />
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
            <Field label="Site web">
              <input name="site" maxLength={300} defaultValue={v("site")} placeholder={p.site} className={INPUT} />
            </Field>
          </div>
        </Panneau>

        <div className="flex flex-col gap-4">
          <Panneau titre="Facturation" sousTitre="Ce qui figure sur les factures de la Chambre" teinte="vert">
            <div className="flex flex-col gap-4">
              <ChampPhoto name="logoFacture" retirer="retirer-logoFacture" apercu={brut?.logoFacture} libelle="Logo des factures" ratio="aspect-[2/1]" aide="Vide : le logo de la Chambre." />
              <Field label="Raison sociale">
                <input name="raisonSociale" maxLength={200} defaultValue={v("raisonSociale")} placeholder={p.nom} className={INPUT} />
              </Field>
              <Field label="Adresse de facturation">
                <textarea name="adresseFacturation" rows={2} maxLength={500} defaultValue={v("adresseFacturation")} placeholder={p.adresse} className={INPUT} />
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="NIF (Madagascar)">
                  <input name="nif" maxLength={40} defaultValue={v("nif")} placeholder={p.nif} className={INPUT} />
                </Field>
                <Field label="STAT (Madagascar)">
                  <input name="stat" maxLength={60} defaultValue={v("stat")} placeholder={p.stat} className={INPUT} />
                </Field>
              </div>
              <Field label="Mention en bas des factures">
                <textarea name="mentionFacture" rows={2} maxLength={1000} defaultValue={v("mentionFacture")} placeholder="Ex. Merci de votre confiance. Paiement à 30 jours." className={INPUT} />
              </Field>
            </div>
          </Panneau>

          <Card className="p-5">
            <div className="text-[11.5px] uppercase tracking-[0.12em] font-semibold text-faint mb-3">Aperçu sur une facture</div>
            <div className="flex items-start gap-4">
              <span className="w-[110px] h-[56px] shrink-0 grid place-items-center">
                <Image src={p.logoFacture} alt="" width={220} height={112} className="max-w-full max-h-full w-auto h-auto object-contain" />
              </span>
              <div className="text-[12.5px] leading-relaxed text-ink">
                <div className="font-bold text-[13.5px] inline-flex items-center gap-1.5"><Building2 size={14} className="text-muted" />{p.raisonSociale}</div>
                <div className="text-muted whitespace-pre-line">{p.adresseFacturation}</div>
                <div className="text-muted">{numerosFiscaux(p).join(" · ")}</div>
              </div>
            </div>
          </Card>

          <SubmitButton pendingLabel="Enregistrement…" className="self-start"><Save size={15} /> Enregistrer</SubmitButton>
        </div>
      </form>
    </>
  );
}
