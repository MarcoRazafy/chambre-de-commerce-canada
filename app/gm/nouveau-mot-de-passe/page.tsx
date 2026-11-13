import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Link2Off, Lock } from "lucide-react";
import { MarqueGM, PIED_GM } from "@/components/gm/MarqueGM";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte, CadreAuth } from "@/components/public/CadreAuth";
import { ChampMotDePasse } from "@/components/public/ChampsAuth";
import { definirMotDePasseGM } from "@/lib/actions/gm-compte";
import { MOT_DE_PASSE_MIN } from "@/lib/auth";
import { compteGMDuLien } from "@/lib/gm-compte";

export const metadata: Metadata = { title: "Nouveau mot de passe · Administrateur" };

// Nouveau mot de passe (Admin GM), depuis le lien reçu par courriel
export default async function NouveauMotDePasseGM({ searchParams }: { searchParams: Promise<{ jeton?: string; erreur?: string }> }) {
  const { jeton, erreur } = await searchParams;
  const compte = await compteGMDuLien(jeton);

  return (
    <CadreAuth classe="espace-admin" marque={<MarqueGM />} pied={PIED_GM} illustration={!compte ? "oubli" : "mot-de-passe"}>
      <span className="surtitre text-marque-rouge">Administrateur</span>

      {!compte ? (
        <div className="apparition">
          <span className="mt-4 mb-5 w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center">
            <Link2Off size={22} aria-hidden />
          </span>
          <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-3">Ce lien n’est plus valable</h1>
          <p className="text-[14.5px] text-muted m-0 mb-6">Il a déjà servi, ou il a expiré. Demandez-en un nouveau.</p>
          <Link href="/gm/mot-de-passe-oublie" className="btn-action w-full no-underline">Recevoir un nouveau lien</Link>
        </div>
      ) : (
        <>
          <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mt-2.5 mb-2">Nouveau mot de passe</h1>
          <p className="text-[14.5px] text-muted m-0 mb-6">Pour le compte <strong className="text-ink">{compte.email}</strong>.</p>
          {erreur ? <Alerte>{erreur}</Alerte> : null}
          <form action={definirMotDePasseGM} className="flex flex-col gap-4">
            <input type="hidden" name="jeton" value={jeton} />
            <ChampMotDePasse label="Nouveau mot de passe" hint={`${MOT_DE_PASSE_MIN} caractères au moins`} icone={<Lock size={16} />} name="motDePasse" required minLength={MOT_DE_PASSE_MIN} autoComplete="new-password" autoFocus />
            <ChampMotDePasse label="Confirmation" icone={<Lock size={16} />} name="confirmation" required minLength={MOT_DE_PASSE_MIN} autoComplete="new-password" />
            <div className="mt-1">
              <BoutonEnvoi enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
            </div>
          </form>
        </>
      )}

      <p className="text-[13.5px] text-muted mt-6 mb-0 pt-5 border-t border-line">
        <Link href="/gm/connexion" className="text-marque-vert font-semibold no-underline hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>
      </p>
    </CadreAuth>
  );
}
