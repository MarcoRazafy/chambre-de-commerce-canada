"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Questionnaire } from "@/components/maillage/Questionnaire";
import type { Reponses } from "@/lib/maillage";

// Espace membre : le questionnaire s'ouvre dans une fenêtre (bouton, ou lien de relance « ?repondre=1 »)
export function RepondreQuestionnaire({
  memberId,
  reponses,
  secteurs,
  commence,
  fini,
}: {
  memberId: string;
  reponses: Reponses;
  secteurs: string[];
  commence: boolean;
  fini: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  // Ouvert par le bouton, ou d'emblée en arrivant du lien de relance (?repondre=1)
  const [manuel, setOuvert] = useState(false);
  const [ferme, setFerme] = useState(false);
  const ouvert = manuel || (params.get("repondre") === "1" && !ferme);
  const fermer = () => {
    setOuvert(false);
    setFerme(true);
    router.replace("/membre/profil?onglet=maillage", { scroll: false });
    router.refresh();
  };
  return (
    <>
      <button type="button" className="btn-action btn-action-sm" onClick={() => setOuvert(true)}>
        <ClipboardPaste size={15} /> {fini ? "Revoir mes réponses" : commence ? "Continuer le questionnaire" : "Répondre au questionnaire"}
      </button>
      <Modal title="Questionnaire de maillage" largeur="max-w-[860px]" ouvert={ouvert} onFermer={fermer}>
        {() => (
          <div className="p-5">
            <Questionnaire memberId={memberId} reponses={reponses} secteurs={secteurs} onTermine={fermer} />
          </div>
        )}
      </Modal>
    </>
  );
}
