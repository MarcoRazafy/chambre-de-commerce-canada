import { Trash2 } from "lucide-react";
import { ListeTags, type ResumeTag } from "@/components/admin/ListeTags";
import { AjouterEntreprisesTag, NouveauTag, type EntrepriseTag } from "@/components/admin/Tags";
import { EnTeteAdmin } from "@/components/admin/ui";
import { Card, Saillant } from "@/components/ui";
import { renommerEtiquette, supprimerEtiquette } from "@/lib/actions/maillage";
import { getEntreprisesContacts, getTousLesTags, type EntrepriseContact } from "@/lib/contacts-admin";
import { LigneEntrepriseTag } from "@/components/admin/LigneEntreprise";
import { prisma } from "@/lib/db";
import { appliquerReglesTags, getReglesTags } from "@/lib/tags-auto";
import { ReglesTags } from "@/components/admin/ReglesTags";
import { plat } from "@/lib/texte";

const CHAMP =
  "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";
const TH = "text-left surtitre text-faint font-semibold px-5 py-3 border-b border-line";

const pourChoix = (liste: EntrepriseContact[]): EntrepriseTag[] =>
  liste.map((e) => ({
    id: e.id,
    nom: e.nom,
    type: e.type,
    photo: e.photo,
    logo: e.logo,
    contact: e.contact?.nom ?? null,
    email: e.contact?.email ?? null,
  }));

// Tags : repères internes posés sur les entreprises (cibler une newsletter, suivre un groupe)
export default async function AdminEtiquettes({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; q?: string; tri?: string }>;
}) {
  const sp = await searchParams;
  const choisi = sp.e ?? null;
  // Tags automatiques d'abord : la page montre la situation du moment
  await appliquerReglesTags();
  const [entreprises, crees, tousTags, regles] = await Promise.all([getEntreprisesContacts(), prisma.tag.findMany({ select: { nom: true } }), getTousLesTags(), getReglesTags()]);

  // Les tags créés (même sans entreprise) et ceux posés sur des entreprises
  const parTag = new Map<string, EntrepriseContact[]>();
  for (const t of crees) parTag.set(t.nom, []);
  for (const e of entreprises) for (const t of e.etiquettes) parTag.set(t, [...(parTag.get(t) ?? []), e]);

  if (choisi) {
    const avec = parTag.get(choisi) ?? [];
    const sans = entreprises.filter((e) => !e.etiquettes.includes(choisi));
    return (
      <>
        <EnTeteAdmin
          surtitre="Tag"
          titre={choisi}
          actions={
            <>
              <form action={renommerEtiquette} className="flex gap-2 items-center">
                <input type="hidden" name="ancien" value={choisi} />
                <input name="nouveau" defaultValue={choisi} required aria-label="Nom du tag" className={`${CHAMP} w-[200px]`} />
                <button type="submit" className="btn-contour btn-contour-sm text-ink">Renommer</button>
              </form>
              <form action={supprimerEtiquette}>
                <input type="hidden" name="nom" value={choisi} />
                <button type="submit" className="btn-contour btn-contour-sm text-bad"><Trash2 size={14} /> Supprimer</button>
              </form>
              <AjouterEntreprisesTag nom={choisi} entreprises={pourChoix(sans)} />
            </>
          }
        />

        <Card className="p-0 overflow-x-auto">
          <div className="px-5 pt-4 pb-3 font-semibold text-ink">
            {avec.length} entreprise{avec.length > 1 ? "s" : ""}
          </div>
          {avec.length ? (
            <table className="w-full border-collapse text-[13.4px]">
              <thead>
                <tr className="bg-surface-2">
                  {["Entreprise", "Contact principal", "Courriel", ""].map((t, i) => <th key={i} className={TH}>{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {avec.map((e) => <LigneEntrepriseTag key={e.id} entreprise={e} tousTags={tousTags} tag={choisi} />)}
              </tbody>
            </table>
          ) : (
            <p className="m-0 px-5 pb-5 text-[13px] text-muted">Aucune entreprise n’a ce tag.</p>
          )}
        </Card>
      </>
    );
  }

  const recherche = (sp.q ?? "").trim();
  const tri = sp.tri === "nom" ? "nom" : "nombre";
  const resumes: ResumeTag[] = [...parTag.entries()]
    .map(([nom, es]) => ({ nom, entreprises: es.map(({ id, nom, type, photo, logo }) => ({ id, nom, type, photo, logo })) }))
    .filter((t) => !recherche || plat(t.nom).includes(plat(recherche)))
    .sort((a, b) =>
      tri === "nom" ? a.nom.localeCompare(b.nom, "fr") : b.entreprises.length - a.entreprises.length || a.nom.localeCompare(b.nom, "fr"),
    );

  return (
    <>
      <EnTeteAdmin surtitre="Communication" titre={<>Les <Saillant>tags</Saillant></>} actions={<NouveauTag />} />
      <ReglesTags regles={regles} tousTags={tousTags} />
      <ListeTags
        tags={resumes}
        totalTags={parTag.size}
        entreprisesTaguees={entreprises.filter((e) => e.etiquettes.length).length}
        totalEntreprises={entreprises.length}
        q={recherche}
        tri={tri}
      />
    </>
  );
}
