"use client";

// Contacts sans entreprise (page Contacts) : on coche des contacts (ou tous), puis on les exporte ou on les retire
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Tags, Trash2, X } from "lucide-react";
import { ChoixTags } from "@/components/admin/ChoixTags";
import { LigneContactSeul, type ContactSeul } from "@/components/admin/LigneContactSeul";
import { Modal } from "@/components/Modal";
import { CancelButton, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { Card } from "@/components/ui";
import { ajouterTagsContactsSeuls, retirerContactsSeuls, retirerTagsContactsSeuls } from "@/lib/actions/contacts";

const pluriel = (n: number) => `${n} contact${n > 1 ? "s" : ""}`;

export function ListeContactsSeuls({ contacts, retour, tousTags }: { contacts: ContactSeul[]; retour: string; tousTags: string[] }) {
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const tout = useRef<HTMLInputElement>(null);

  // La recherche change la liste : on ne garde que les contacts encore affichés
  const visibles = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);
  const selection = [...choisis].filter((id) => visibles.has(id));
  const n = selection.length;
  const tous = n > 0 && n === contacts.length;

  useEffect(() => {
    if (tout.current) tout.current.indeterminate = n > 0 && !tous;
  }, [n, tous]);

  const choisir = (id: string, oui: boolean) =>
    setChoisis((s) => {
      const t = new Set(s);
      if (oui) t.add(id);
      else t.delete(id);
      return t;
    });
  const choisirTout = (oui: boolean) => setChoisis(oui ? new Set(contacts.map((c) => c.id)) : new Set());
  const champs = selection.map((id) => <input key={id} type="hidden" name="contacts" value={id} />);
  const tagsSelection = [...new Set(contacts.filter((c) => choisis.has(c.id)).flatMap((c) => c.etiquettes))].sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <>
      <div
        className={`sticky top-2 z-20 mb-3 flex items-center gap-2.5 flex-wrap rounded-[var(--radius-m)] px-4 py-2.5 transition-colors duration-150 ${
          n ? "bg-navy text-white shadow-[var(--shadow)]" : "bg-transparent px-0"
        }`}
        aria-live="polite"
      >
        {n ? (
          <>
            <b className="text-[14px] mr-1">{pluriel(n)} sélectionné{n > 1 ? "s" : ""}</b>
            {!tous ? (
              <button type="button" onClick={() => choisirTout(true)} className="border-0 bg-transparent text-white/80 underline text-[13px] cursor-pointer hover:text-white">
                Tout sélectionner ({contacts.length})
              </button>
            ) : null}
            <span className="flex-1" />
            <Modal
              title={`Ajouter des tags à ${pluriel(n)}`}
              trigger={(ouvrir) => (
                <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
                  <Plus size={14} /> Ajouter des tags
                </button>
              )}
            >
              {(fermer) => (
                <form action={ajouterTagsContactsSeuls}>
                  <input type="hidden" name="retour" value={retour} />
                  {champs}
                  <ModalBody>
                    <ChoixTags options={tousTags} creation />
                  </ModalBody>
                  <ModalFooter>
                    <CancelButton onClick={fermer} />
                    <SubmitButton pendingLabel="Ajout…"><Plus size={14} /> Ajouter</SubmitButton>
                  </ModalFooter>
                </form>
              )}
            </Modal>
            <Modal
              title={`Retirer des tags de ${pluriel(n)}`}
              trigger={(ouvrir) => (
                <button type="button" onClick={ouvrir} disabled={!tagsSelection.length} className="btn-contour btn-contour-sm bg-white text-ink border-white hover:bg-surface-2 disabled:opacity-50">
                  <Tags size={14} /> Retirer des tags
                </button>
              )}
            >
              {(fermer) => (
                <form action={retirerTagsContactsSeuls}>
                  <input type="hidden" name="retour" value={retour} />
                  {champs}
                  <ModalBody>
                    <ChoixTags options={tagsSelection} creation={false} />
                  </ModalBody>
                  <ModalFooter>
                    <CancelButton onClick={fermer} />
                    <SubmitButton pendingLabel="Retrait…" variant="danger"><X size={14} /> Retirer</SubmitButton>
                  </ModalFooter>
                </form>
              )}
            </Modal>
            <form action="/admin/contacts/export-seuls" method="post">
              {champs}
              <button type="submit" className="btn-contour btn-contour-sm bg-white text-ink border-white hover:bg-surface-2">
                <Download size={14} /> Exporter en CSV
              </button>
            </form>
            <Modal
              title={`Retirer ${pluriel(n)}`}
              trigger={(ouvrir) => (
                <button type="button" onClick={ouvrir} className="btn-contour btn-contour-sm bg-white text-bad border-white hover:bg-surface-2">
                  <Trash2 size={14} /> Retirer
                </button>
              )}
            >
              {(fermer) => (
                <form action={retirerContactsSeuls}>
                  <input type="hidden" name="retour" value={retour} />
                  {champs}
                  <ModalBody>
                    <p className="m-0 text-[13.6px] text-muted">{pluriel(n)} ne recevront plus la newsletter et disparaîtront de cette liste.</p>
                  </ModalBody>
                  <ModalFooter>
                    <CancelButton onClick={fermer} />
                    <SubmitButton variant="danger" pendingLabel="Retrait…"><Trash2 size={14} /> Retirer</SubmitButton>
                  </ModalFooter>
                </form>
              )}
            </Modal>
            <button
              type="button"
              onClick={() => choisirTout(false)}
              aria-label="Tout désélectionner"
              className="grid place-items-center w-9 h-9 rounded-full border-0 bg-white/10 text-white cursor-pointer hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <label className="flex items-center gap-2.5 text-[13px] text-muted cursor-pointer">
            <input
              ref={tout}
              type="checkbox"
              checked={tous}
              onChange={(ev) => choisirTout(ev.target.checked)}
              aria-label="Sélectionner tous les contacts"
              className="w-[18px] h-[18px] accent-[var(--accent)] cursor-pointer"
            />
            {pluriel(contacts.length)} · cochez des contacts pour leur ajouter ou retirer des tags, les exporter ou les retirer
          </label>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <ul className="list-none m-0 p-0 [&>li:first-child]:border-t-0">
          {contacts.map((c) => (
            <LigneContactSeul key={c.id} contact={c} retour={retour} choisi={choisis.has(c.id)} onChoisir={(oui) => choisir(c.id, oui)} />
          ))}
        </ul>
      </Card>
    </>
  );
}
