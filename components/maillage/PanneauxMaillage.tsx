import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, CheckCircle2, Sparkles, X } from "lucide-react";
import { Panneau, Vide } from "@/components/admin/ui";
import { fmtDate } from "@/lib/format";
import { ecarterSuggestion, mettreEnRelation, relancerMaillage } from "@/lib/actions/maillage";
import type { DonneesMaillage, Suggestion } from "@/lib/maillage-donnees";

type Espace = "admin" | "membre";
type Relation = {
  id: string;
  note: string | null;
  createdAt: string;
  a: { id: string; nom: string; secteur: string; ville: string; logo: string | null };
  b: { id: string; nom: string; secteur: string; ville: string; logo: string | null };
  autre: { id: string; nom: string; secteur: string; ville: string; logo: string | null } | null;
};

const fiche = (espace: Espace, id: string) => (espace === "admin" ? `/admin/membres/${id}` : `/membre/annuaire/${id}`);

function Pastille({ nom, logo, taille = 36 }: { nom: string; logo?: string | null; taille?: number }) {
  if (logo) {
    return (
      <span className="shrink-0 rounded-[10px] overflow-hidden border border-line bg-white" style={{ width: taille, height: taille }}>
        <Image src={logo} alt="" width={taille} height={taille} className="w-full h-full object-contain" />
      </span>
    );
  }
  const ini = nom.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="shrink-0 rounded-[10px] grid place-items-center font-bold text-white text-[12px] bg-navy" style={{ width: taille, height: taille }}>
      {ini}
    </span>
  );
}

// Barre d'avancement du questionnaire
export function Avancement({ d }: { d: DonneesMaillage }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <b>{d.faites} sur {d.total} questions essentielles</b>
        <span className="text-muted">{d.pct} %</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-surface-3 overflow-hidden">
        <i className="block h-full rounded-full" style={{ width: `${d.pct}%`, background: "var(--bouton-rouge)" }} />
      </div>
    </div>
  );
}

// Équipe : où en est le membre ; s'il n'a pas (tout) répondu, la relance. Les réponses ne s'affichent pas ici.
export function EtatQuestionnaireAdmin({ d }: { d: DonneesMaillage }) {
  const fini = d.pct === 100;
  return (
    <Panneau titre="Questionnaire de maillage" teinte={fini ? "vert" : "rouge"}>
      <Avancement d={d} />
      {fini ? (
        <p className="m-0 mt-4 flex items-center gap-2 rounded-[var(--radius-s)] bg-success-soft px-3 py-2.5 text-[13px] text-success-strong">
          <CheckCircle2 size={16} className="shrink-0" />
          Questionnaire complété{d.completeLe ? ` le ${fmtDate(d.completeLe)}` : ""}. Les réponses servent aux suggestions ci-dessous.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[13px] text-muted">
            {d.commence ? "Commencé mais pas terminé." : "Pas encore répondu au questionnaire."}
            {d.relanceLe ? ` Dernière relance le ${fmtDate(d.relanceLe)}.` : ""}
          </p>
          <form action={relancerMaillage}>
            <input type="hidden" name="memberId" value={d.membre.id} />
            <button type="submit" className="btn-action btn-action-sm">
              <BellRing size={15} /> {d.relanceLe ? "Relancer à nouveau" : "Relancer le membre"}
            </button>
          </form>
        </div>
      )}
    </Panneau>
  );
}

// Suggestions de mises en relation : l'équipe les accepte ou les écarte ; le membre les lit
export function ListeSuggestions({
  suggestions,
  memberId,
  espace,
  limite,
  retour,
}: {
  suggestions: Suggestion[];
  memberId?: string;
  espace: Espace;
  limite?: number;
  retour?: string;
}) {
  const liste = limite ? suggestions.slice(0, limite) : suggestions;
  if (!liste.length) {
    return <Vide>{espace === "membre" ? "Pas encore de suggestion : complétez le questionnaire et vos tags « Ce que vous recherchez »." : "Aucune suggestion pour l’instant."}</Vide>;
  }
  return (
    <ul className="list-none m-0 p-0 flex flex-col gap-3">
      {liste.map((s) => {
        const autre = memberId ? (s.a.id === memberId ? s.b : s.a) : null;
        return (
          <li key={`${s.a.id}-${s.b.id}`} className="rounded-[var(--radius-m)] border border-line bg-surface p-3.5">
            <div className="flex items-center gap-3">
              <span className="shrink-0 grid place-items-center w-9 h-9 rounded-[10px] text-white" style={{ background: "var(--bouton-rouge)" }}><Sparkles size={16} /></span>
              <div className="min-w-0 flex-1">
                {autre ? (
                  <Link href={fiche(espace, autre.id)} className="font-semibold text-ink no-underline hover:text-accent">{autre.nom}</Link>
                ) : (
                  <span className="font-semibold text-ink">
                    <Link href={fiche(espace, s.a.id)} className="no-underline text-ink hover:text-accent">{s.a.nom}</Link>
                    {" ↔ "}
                    <Link href={fiche(espace, s.b.id)} className="no-underline text-ink hover:text-accent">{s.b.nom}</Link>
                  </span>
                )}
                <div className="text-[12px] text-muted">Pertinence {s.score} %</div>
              </div>
            </div>
            <ul className="m-0 mt-2 pl-[52px] text-[12.8px] text-muted list-disc">
              {s.why.slice(0, 3).map((w) => <li key={w}>{w}</li>)}
            </ul>
            {espace === "admin" ? (
              <div className="mt-3 pl-[52px] flex flex-wrap gap-2">
                <form action={mettreEnRelation}>
                  <input type="hidden" name="a" value={s.a.id} />
                  <input type="hidden" name="b" value={s.b.id} />
                  <input type="hidden" name="retour" value={retour ?? "/admin/maillage"} />
                  <button type="submit" className="btn-action btn-action-sm">Mettre en relation <ArrowRight size={14} /></button>
                </form>
                <form action={ecarterSuggestion}>
                  <input type="hidden" name="a" value={s.a.id} />
                  <input type="hidden" name="b" value={s.b.id} />
                  <input type="hidden" name="retour" value={retour ?? "/admin/maillage"} />
                  <button type="submit" className="btn-contour btn-contour-sm text-muted"><X size={14} /> Écarter</button>
                </form>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

// Suggestions en cartes (onglet « Suggestions IA » de l'annuaire) : les deux entreprises, le score, les raisons
export function GrilleSuggestions({ suggestions, retour }: { suggestions: Suggestion[]; retour: string }) {
  if (!suggestions.length) return <Vide>Aucune nouvelle suggestion.</Vide>;
  const pays = (p: string) => (/canada/i.test(p) ? "Canada" : p);
  return (
    <ul className="list-none m-0 p-0 grid gap-4 grid-cols-1 lg:grid-cols-2">
      {suggestions.map((s) => (
        <li key={`${s.a.id}-${s.b.id}`} className="rounded-[var(--radius-l)] border border-line bg-surface p-4 flex flex-col gap-3 min-w-0">
          <div className="grid items-center gap-3 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            {[s.a, s.b].map((m, i) => (
              <Link
                key={m.id}
                href={fiche("admin", m.id)}
                className={`flex items-center gap-2.5 min-w-0 no-underline group ${i ? "sm:order-3" : ""}`}
              >
                <Pastille nom={m.nom} />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink truncate group-hover:text-accent">{m.nom}</span>
                  <span className="block text-[12px] text-muted truncate">{pays(m.pays)}</span>
                </span>
              </Link>
            ))}
            <span className="sm:order-2 justify-self-start sm:justify-self-center text-[13px] font-bold text-success-strong border-[1.5px] border-success rounded-full px-2.5 py-0.5 tabular-nums whitespace-nowrap">
              {s.score} %
            </span>
          </div>
          <ul className="m-0 pl-3 border-l-2 border-success list-none flex flex-col gap-1 text-[13px] text-ink">
            {s.why.map((w) => <li key={w}>{w}</li>)}
          </ul>
          <div className="flex flex-wrap gap-2 mt-auto">
            <form action={mettreEnRelation}>
              <input type="hidden" name="a" value={s.a.id} />
              <input type="hidden" name="b" value={s.b.id} />
              <input type="hidden" name="retour" value={retour} />
              <button type="submit" className="btn-action btn-action-sm">Mettre en relation <ArrowRight size={14} /></button>
            </form>
            <form action={ecarterSuggestion}>
              <input type="hidden" name="a" value={s.a.id} />
              <input type="hidden" name="b" value={s.b.id} />
              <input type="hidden" name="retour" value={retour} />
              <button type="submit" className="btn-contour btn-contour-sm text-muted"><X size={14} /> Écarter</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Mises en relation faites par la Chambre
export function ListeRelations({ relations, espace }: { relations: Relation[]; espace: Espace }) {
  if (!relations.length) return <Vide>Aucune mise en relation pour l’instant.</Vide>;
  return (
    <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
      {relations.map((r) => {
        const paire = r.autre ? [r.autre] : [r.a, r.b];
        return (
          <li key={r.id} className="flex items-center gap-3 rounded-[var(--radius-m)] border border-line bg-surface px-3.5 py-3">
            <div className="flex -space-x-2">{paire.map((p) => <Pastille key={p.id} nom={p.nom} logo={p.logo} />)}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13.6px]">
                {paire.map((p, i) => (
                  <span key={p.id}>{i ? " ↔ " : ""}<Link href={fiche(espace, p.id)} className="no-underline text-ink hover:text-accent">{p.nom}</Link></span>
                ))}
              </div>
              <div className="text-[12px] text-muted">
                {r.autre ? `${r.autre.secteur} · ${r.autre.ville} · ` : ""}présentés le {fmtDate(r.createdAt.slice(0, 10))}
              </div>
              {r.note ? <p className="m-0 mt-1 text-[12.8px] text-ink">{r.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
