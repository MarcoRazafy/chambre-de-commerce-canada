import { EnTeteAdmin } from "@/components/admin/ui";
import { SupprimerMonCompteButton } from "@/components/forms/CompteForms";
import {
  FormulaireMotDePasse,
  FormulaireProfilEquipe,
} from "@/components/forms/ProfilEquipe";
import { ExternalLink, LogIn } from "lucide-react";
import { BoutonCopierLien } from "@/components/rendezvous/Reglages";
import { Card, Saillant } from "@/components/ui";
import { adresseOuSite } from "@/lib/adresse-chambre";
import { chambreCourante } from "@/lib/chambre-courante";
import { MOT_DE_PASSE_MIN } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export default async function MonProfil() {
  const user = await getCurrentUser("admin");
  const base = await adresseOuSite(await chambreCourante(), "equipe");
  const connexion = base ? `${base}/auth` : null;

  return (
    <>
      <EnTeteAdmin
        surtitre="Équipe CanCham"
        titre={
          <>
            Mon <Saillant>profil</Saillant>
          </>
        }
      />

      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <FormulaireProfilEquipe user={user} />
          <FormulaireMotDePasse email={user.email} minimum={MOT_DE_PASSE_MIN} />

          <Card className="p-5 border-dashed">
            <div className="surtitre text-faint mb-2">Zone sensible</div>
            <p className="m-0 mb-3 text-[12.5px] text-muted">
              La suppression retire votre compte et votre accès au back-office.
              Vos actions restent au journal, à votre nom. Le dernier
              administrateur ne peut pas partir sans successeur.
            </p>
            <SupprimerMonCompteButton nom={user.nom} email={user.email} />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
        {connexion ? (
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <LogIn size={17} className="text-muted" aria-hidden />
              <h2 className="m-0 text-[15px]">Lien de connexion</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <BoutonCopierLien lien={connexion} libelle="Copier le lien" />
              <a href={connexion} target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2">
                <ExternalLink size={14} aria-hidden /> Ouvrir
              </a>
            </div>
          </Card>
        ) : null}

        <Card className="carte-filet filet-fixe filet-degrade p-6">
          <div className="surtitre text-faint mb-3">Où ce profil apparaît</div>
          <ul className="list-none m-0 p-0 flex flex-col gap-3 text-[13.4px] text-muted">
            <li>
              <b className="text-ink">Messagerie</b> — votre nom et votre photo
              accompagnent chacun de vos messages.
            </li>
            <li>
              <b className="text-ink">Journal d’activité</b> — chaque paiement,
              validation ou publication porte votre nom.
            </li>
            <li>
              <b className="text-ink">Menu du back-office</b> — en bas du menu
              et en haut à droite de chaque page.
            </li>
          </ul>
        </Card>
        </div>
      </div>
    </>
  );
}
