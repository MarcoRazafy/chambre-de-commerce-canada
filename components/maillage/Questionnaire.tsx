"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import { enregistrerMaillage } from "@/lib/actions/maillage";
import {
  QUESTIONS,
  SECTIONS,
  VISIBILITES,
  estRepondu,
  progression,
  type Question,
  type Reponses,
  type SectionId,
  type Visibilite,
} from "@/lib/maillage";

type Obj = Record<string, unknown>;
const LABEL = "block text-[12.5px] font-semibold text-muted mb-1";

// Liste de mots-clés : on tape, Entrée ou virgule ajoute le mot
function Mots({ id, valeurs, onChange, placeholder }: { id: string; valeurs: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [t, setT] = useState("");
  const ajouter = () => {
    const m = t.trim().replace(/,$/, "");
    if (m && !valeurs.includes(m)) onChange([...valeurs, m]);
    setT("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[42px] px-2 py-1.5 border border-line rounded-[var(--radius-s)] bg-surface focus-within:border-accent">
      {valeurs.map((m) => (
        <span key={m} className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent-strong px-2.5 py-0.5 text-[12.5px] font-semibold">
          {m}
          <button type="button" aria-label={`Retirer ${m}`} className="border-0 bg-transparent cursor-pointer text-inherit opacity-70 hover:opacity-100" onClick={() => onChange(valeurs.filter((x) => x !== m))}>×</button>
        </span>
      ))}
      <input
        id={id}
        className="flex-1 min-w-[140px] border-0 outline-0 bg-transparent text-[13.5px] text-ink px-1 py-1"
        value={t}
        placeholder={valeurs.length ? "Ajouter…" : placeholder}
        onChange={(e) => setT(e.target.value)}
        onBlur={ajouter}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); ajouter(); }
          else if (e.key === "Backspace" && !t && valeurs.length) onChange(valeurs.slice(0, -1));
        }}
      />
    </div>
  );
}

// Cases à cocher en pastilles
function Options({ libelle, options, choisis, onChange }: { libelle: string; options: string[]; choisis: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={libelle}>
      {options.map((x) => {
        const on = choisis.includes(x);
        return (
          <label key={x} className={`inline-flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors ${on ? "border-accent bg-accent-soft text-ink font-semibold" : "border-line bg-surface text-muted hover:border-accent/50"}`}>
            <input type="checkbox" className="sr-only" checked={on} onChange={(e) => onChange(e.target.checked ? [...choisis, x] : choisis.filter((c) => c !== x))} />
            {on ? <Check size={13} /> : null}{x}
          </label>
        );
      })}
    </div>
  );
}

// Questionnaire de maillage, section par section, enregistré au fil de la saisie
export function Questionnaire({
  memberId,
  reponses,
  secteurs,
  onTermine,
}: {
  memberId: string;
  reponses: Reponses;
  secteurs: string[];
  onTermine?: () => void;
}) {
  const [r, setR] = useState<Reponses>(reponses);
  const [etape, setEtape] = useState(0);
  const [etat, setEtat] = useState<"" | "enreg" | "ok" | "err">("");
  const [erreur, setErreur] = useState("");
  const attente = useRef<Reponses>({});
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const haut = useRef<HTMLDivElement>(null);

  const envoyer = useCallback(async () => {
    if (minuteur.current) { clearTimeout(minuteur.current); minuteur.current = null; }
    const patch = attente.current;
    if (!Object.keys(patch).length) return;
    attente.current = {};
    setEtat("enreg");
    const res = await enregistrerMaillage(memberId, patch).catch((e: Error) => ({ ok: false as const, erreur: e.message }));
    if (res.ok) { setEtat("ok"); setErreur(""); }
    else { attente.current = { ...patch, ...attente.current }; setEtat("err"); setErreur(res.erreur); }
  }, [memberId]);
  useEffect(() => () => { if (Object.keys(attente.current).length) void envoyer(); }, [envoyer]);

  const changer = (id: string, v: unknown) => {
    setR((x) => ({ ...x, [id]: v }));
    attente.current[id] = v;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(envoyer, 700);
  };
  const aller = (i: number) => { void envoyer(); setEtape(i); haut.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const p = progression(r);
  const sec = SECTIONS[etape];
  const qs = QUESTIONS.filter((q) => q.section === sec.id);
  const faitSec = (s: SectionId) => QUESTIONS.filter((q) => q.section === s).every((q) => estRepondu(q, r[q.id]));

  function champ(q: Question) {
    const v = r[q.id];
    const o: Obj = v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
    const fid = (k = "") => `mq-${q.id}${k ? "-" + k : ""}`;
    const details = (rows = 2) =>
      q.details ? (
        <textarea className={`${INPUT} mt-2.5`} rows={rows} aria-label={q.details} placeholder={q.details} value={String(o.details ?? "")} onChange={(e) => changer(q.id, { ...o, details: e.target.value })} />
      ) : null;
    switch (q.type) {
      case "texte":
        return <textarea id={fid()} className={INPUT} rows={4} value={String(v ?? "")} placeholder={q.placeholder} onChange={(e) => changer(q.id, e.target.value)} />;
      case "champs":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.champs!.map((c) => (
              <div key={c.k} className={c.type === "textarea" ? "sm:col-span-2" : ""}>
                <label htmlFor={fid(c.k)} className={LABEL}>{c.label}{c.requis ? " *" : ""}</label>
                {c.type === "textarea" ? (
                  <textarea id={fid(c.k)} className={INPUT} rows={3} value={String(o[c.k] ?? "")} placeholder={c.placeholder} onChange={(e) => changer(q.id, { ...o, [c.k]: e.target.value })} />
                ) : (
                  <input id={fid(c.k)} className={INPUT} type={c.type ?? "text"} value={String(o[c.k] ?? "")} placeholder={c.placeholder} onChange={(e) => changer(q.id, { ...o, [c.k]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        );
      case "fiches": {
        const l: Obj[] = Array.isArray(v) && v.length ? (v as Obj[]) : [{}];
        const maj = (i: number, f: Obj | null) => changer(q.id, f ? l.map((x, j) => (j === i ? f : x)) : l.filter((_, j) => j !== i));
        return (
          <div className="flex flex-col gap-3">
            {l.map((f, i) => (
              <div key={i} className="rounded-[var(--radius-m)] border border-line bg-surface-2 p-3">
                <div className="flex items-center justify-between mb-2">
                  <b className="text-[12.5px] text-muted">{i + 1}.</b>
                  {l.length > 1 ? <button type="button" className="text-[12.5px] font-semibold text-muted hover:text-bad border-0 bg-transparent cursor-pointer" onClick={() => maj(i, null)}>Retirer</button> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {q.champs!.map((c) => (
                    <div key={c.k} className={c.type === "textarea" ? "sm:col-span-2" : ""}>
                      <label htmlFor={fid(`${i}-${c.k}`)} className={LABEL}>{c.label}{c.requis ? " *" : ""}</label>
                      {c.type === "textarea" ? (
                        <textarea id={fid(`${i}-${c.k}`)} className={INPUT} rows={2} value={String(f[c.k] ?? "")} onChange={(e) => maj(i, { ...f, [c.k]: e.target.value })} />
                      ) : (
                        <input id={fid(`${i}-${c.k}`)} className={INPUT} value={String(f[c.k] ?? "")} placeholder={c.placeholder} onChange={(e) => maj(i, { ...f, [c.k]: e.target.value })} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {l.length < (q.max ?? 5) ? (
              <button type="button" className="self-start inline-flex items-center gap-1.5 rounded-[var(--radius-s)] border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold cursor-pointer hover:border-accent" onClick={() => changer(q.id, [...l, {}])}>
                <Plus size={14} /> Ajouter
              </button>
            ) : null}
          </div>
        );
      }
      case "choix": {
        const choix = Array.isArray(o.choix) ? (o.choix as string[]) : [];
        return (<><Options libelle={q.titre} options={q.options!} choisis={choix} onChange={(c) => changer(q.id, { ...o, choix: c })} />{details()}</>);
      }
      case "secteurs": {
        const noms = Array.isArray(o.noms) ? (o.noms as string[]) : [];
        return (<><Options libelle={q.titre} options={secteurs} choisis={noms} onChange={(c) => changer(q.id, { ...o, noms: c })} />{details(1)}</>);
      }
      case "mots":
        return (
          <div className="flex flex-col gap-3">
            {q.listes!.map((l) => (
              <div key={l.k}>
                <label htmlFor={fid(l.k)} className={LABEL}>{l.label}</label>
                <Mots id={fid(l.k)} valeurs={Array.isArray(o[l.k]) ? (o[l.k] as string[]) : []} placeholder={l.placeholder} onChange={(m) => changer(q.id, { ...o, [l.k]: m })} />
              </div>
            ))}
            {details()}
          </div>
        );
      case "visibilite": {
        const val = (s: SectionId): Visibilite => (o[s] as Visibilite) ?? "chambre";
        return (
          <div className="flex flex-col gap-2">
            {SECTIONS.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <span className="text-[13px]"><b>{s.id}</b> · {s.titre}</span>
                <select className={`${INPUT} !w-auto`} aria-label={`Visibilité de la section ${s.titre}`} value={val(s.id)}
                  onChange={(e) => changer(q.id, Object.fromEntries(SECTIONS.map((x) => [x.id, x.id === s.id ? e.target.value : val(x.id)])))}>
                  {VISIBILITES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            ))}
            {!estRepondu(q, v) ? (
              <button type="button" className="self-start inline-flex items-center gap-1.5 rounded-[var(--radius-s)] border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold cursor-pointer hover:border-accent"
                onClick={() => changer(q.id, Object.fromEntries(SECTIONS.map((x) => [x.id, val(x.id)])))}>
                <Check size={14} /> Valider ces choix
              </button>
            ) : null}
            <p className="text-[12px] text-muted m-0">{VISIBILITES.map(([, l, d]) => `${l} : ${d.toLowerCase()}`).join(" · ")}</p>
          </div>
        );
      }
    }
  }

  return (
    <div ref={haut} className="flex flex-col gap-4">
      <div className="sticky top-0 z-[1] bg-surface pb-3 border-b border-line">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <b>{p.faites} sur {p.total} questions essentielles</b>
          <span className={`text-[12px] font-semibold ${etat === "err" ? "text-bad" : etat === "ok" ? "text-success" : "text-muted"}`}>
            {etat === "enreg" ? "Enregistrement…" : etat === "ok" ? "✓ Enregistré" : etat === "err" ? "Non enregistré" : ""}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-3 overflow-hidden"><i className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: "var(--bouton-rouge)" }} /></div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Sections">
          {SECTIONS.map((s, i) => (
            <button key={s.id} type="button" role="tab" aria-selected={i === etape} title={s.titre} onClick={() => aller(i)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold cursor-pointer ${i === etape ? "border-transparent text-white" : faitSec(s.id) ? "border-success/40 bg-success-soft text-success" : "border-line bg-surface text-muted"}`}
              style={i === etape ? { background: "var(--bouton-rouge)" } : undefined}>
              <span>{faitSec(s.id) ? "✓" : s.id}</span><span className="hidden sm:inline">{s.titre}</span>
            </button>
          ))}
        </div>
      </div>
      {erreur ? (
        <div className="rounded-[var(--radius-s)] bg-bad-soft text-bad px-3 py-2 text-[13px] flex items-center justify-between gap-2">
          {erreur}
          <button type="button" className="font-semibold underline border-0 bg-transparent text-inherit cursor-pointer" onClick={envoyer}>Réessayer</button>
        </div>
      ) : null}

      <section className="flex flex-col gap-5">
        <div>
          <span className="surtitre text-accent">Section {sec.id} · {etape + 1} sur {SECTIONS.length}</span>
          <h3 className="text-[19px] font-bold mt-1 mb-1">{sec.titre}</h3>
          <p className="text-[13px] text-muted m-0">{sec.intro}</p>
        </div>
        {qs.map((q) => {
          const ok = estRepondu(q, r[q.id]);
          return (
            <div key={q.id} className={`rounded-[var(--radius-m)] border p-4 ${ok ? "border-success/35 bg-success-soft/30" : "border-line"}`}>
              <label className="flex items-start gap-2 text-[14px] font-semibold mb-2" htmlFor={q.type === "texte" ? `mq-${q.id}` : undefined}>
                <span className="shrink-0 rounded-md bg-accent-soft text-accent-strong px-1.5 text-[11.5px] font-bold leading-[20px]">{q.id} ★</span>
                <span className="flex-1">{q.titre}</span>
                {ok ? <Check size={18} className="text-success shrink-0" /> : null}
              </label>
              {q.aide ? <p className="text-[12.5px] text-muted mt-0 mb-2">{q.aide}</p> : null}
              {champ(q)}
            </div>
          );
        })}
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        {etape > 0 ? (
          <button type="button" className="btn-contour btn-contour-sm text-ink" onClick={() => aller(etape - 1)}><ChevronLeft size={15} /> {SECTIONS[etape - 1].titre}</button>
        ) : <span />}
        {etape < SECTIONS.length - 1 ? (
          <button type="button" className="btn-action btn-action-sm" onClick={() => aller(etape + 1)}>{SECTIONS[etape + 1].titre} <ChevronRight size={15} /></button>
        ) : (
          <button type="button" className="btn-action btn-action-sm" onClick={async () => { await envoyer(); onTermine?.(); }}><Check size={15} /> Terminer</button>
        )}
      </div>
    </div>
  );
}
