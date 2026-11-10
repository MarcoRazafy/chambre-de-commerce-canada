import { Fragment } from "react";
import { ActionsMessages } from "@/components/messagerie/ActionsMessages";
import { Bulle } from "@/components/messagerie/Bulle";
import { Composeur } from "@/components/messagerie/Composeur";
import { DefilerEnBas } from "@/components/messagerie/DefilerEnBas";
import {
  EnTeteConversation,
  type InfoConversation,
} from "@/components/messagerie/EnTeteConversation";
import type { ElementACocher } from "@/components/messagerie/ListeACocher";
import { ListeFils, type ResumeFil } from "@/components/messagerie/ListeFils";
import { MarquerLu } from "@/components/messagerie/MarquerLu";
import { Saillant, ViewHead } from "@/components/ui";
import { initialesDe } from "@/lib/avatars";
import { getProfilChambre } from "@/lib/profil-chambre";
import { heureExacte, jourLisible } from "@/lib/enums";
import {
  getMembresJoignables,
  getPersonnesJoignables,
  getThreads,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import type {
  Message,
  MessageThread,
  Personne,
  Space,
  User,
} from "@/lib/types";

function apercu(fil: MessageThread): string {
  const m = fil.messages.at(-1);
  if (!m)
    return fil.type === "groupe" ? "Groupe créé" : "Nouvelle conversation";

  let corps: string;
  if (m.supprime) corps = "Message supprimé";
  else if (m.texte) corps = m.texte;
  else {
    const p = m.pieces[0];
    const libelle = p
      ? { image: "Photo", video: "Vidéo", pdf: p.nom }[p.type]
      : "";
    corps = `📎 ${libelle}${m.pieces.length > 1 ? ` +${m.pieces.length - 1}` : ""}`;
  }

  if (fil.type === "groupe") {
    const auteur = m.moi ? "Vous" : m.de.split(" ")[0];
    return `${auteur} : ${corps}`;
  }
  return m.moi && !m.supprime ? `Vous : ${corps}` : corps;
}

const versElement = (p: Personne, valeur = p.id): ElementACocher => ({
  valeur,
  nom: p.nom,
  detail: [p.fonction, p.entreprise].filter(Boolean).join(" · "),
  avatar: p.photo,
  init: initialesDe(p.nom),
});

export async function MessageriePage({
  space,
  threadId,
}: {
  space: Space;
  threadId?: string;
}) {
  const user = await getCurrentUser(space);
  const [threads, membres, personnes] = await Promise.all([
    getThreads(user),
    getMembresJoignables(user, space === "admin"),
    getPersonnesJoignables(user.id),
  ]);
  const choisie = threads.find((t) => t.id === threadId);
  const active = choisie ?? threads[0];
  const base = `/${space}/messagerie`;

  const resumes: ResumeFil[] = threads.map((t) => ({
    id: t.id,
    nom: t.nom,
    sousTitre: t.sousTitre,
    avatar: t.avatar ?? null,
    init: t.init,
    type: t.type,
    unread: t.unread,
    heure: t.messages.at(-1)?.heure ?? "",
    apercu: apercu(t),
  }));

  return (
    <>
      <div className={choisie ? "hidden md:block" : undefined}>
        <ViewHead
          title={
            <>
              Messa<Saillant>gerie</Saillant>
            </>
          }
        />
      </div>

      <div className="flex border border-line rounded-[var(--radius-m)] bg-surface overflow-hidden flex-col md:flex-row md:h-[min(680px,calc(100vh-220px))] md:min-h-[480px]">
        <ListeFils
          fils={resumes}
          actifId={active?.id ?? ""}
          choixExplicite={Boolean(choisie)}
          base={base}
          space={space}
          membres={membres}
          personnes={personnes.map((p) => versElement(p))}
          className={choisie ? "hidden md:flex" : "flex"}
        />

        {active ? (
          <Conversation
            fil={active}
            fils={threads}
            personnes={personnes}
            space={space}
            user={user}
            base={base}
            choixExplicite={Boolean(choisie)}
          />
        ) : (
          <p className="hidden md:block m-auto text-[13.4px] text-faint">
            Aucune conversation.
          </p>
        )}
      </div>
    </>
  );
}

async function Conversation({
  fil,
  fils,
  personnes,
  space,
  user,
  base,
  choixExplicite,
}: {
  fil: MessageThread;
  fils: MessageThread[];
  personnes: Personne[];
  space: Space;
  user: User;
  base: string;
  choixExplicite: boolean;
}) {
  const lienProfil = fil.membre
    ? fil.membre.id === user.memberId
      ? "/membre/profil"
      : space === "admin"
        ? `/admin/membres/${fil.membre.id}`
        : `/membre/annuaire/${fil.membre.id}`
    : null;

  const equipe = fil.equipe && !fil.contact;

  const info: InfoConversation = {
    type: fil.type,
    contact: fil.contact ?? null,
    entreprise:
      fil.membre && lienProfil
        ? { nom: fil.membre.nom, lienProfil, siteweb: fil.membre.siteweb }
        : null,
    equipe: equipe
      ? await getProfilChambre().then((p) => ({ telephone: p.telephone, email: p.email }))
      : null,
  };

  const dejaEnContact = new Set(
    fils
      .filter((t) => t.type === "individuel" && !t.equipe)
      .map((t) => t.contact?.id),
  );
  const cibles = {
    conversations: fils.map((t): ElementACocher => ({
      valeur: `fil:${t.id}`,
      nom: t.nom,
      detail: t.sousTitre,
      avatar: t.avatar ?? null,
      init: t.init,
      groupe: t.type === "groupe",
    })),
    personnes: personnes
      .filter((p) => !dejaEnContact.has(p.id))
      .map((p) => versElement(p, `personne:${p.id}`)),
  };

  const membresDuFil = new Set(fil.participants.map((p) => p.id));
  const ajoutables = personnes
    .filter((p) => !membresDuFil.has(p.id))
    .map((p) => versElement(p));

  const dernier = fil.messages.at(-1)?.id ?? "vide";
  const visibles = fil.messages.filter((m) => !m.supprime);

  return (
    <div
      className={`${
        choixExplicite ? "flex fixed inset-0 z-[35]" : "hidden"
      } bg-surface md:relative md:inset-auto md:z-auto md:flex flex-1 min-w-0 min-h-0 flex-col`}
    >
      <MarquerLu
        threadId={fil.id}
        space={space}
        nonLus={fil.unread}
        choixExplicite={choixExplicite}
      />

      <EnTeteConversation
        key={fil.id}
        retour={base}
        threadId={fil.id}
        space={space}
        moiId={user.id}
        nom={fil.nom}
        sousTitre={fil.sousTitre}
        avatar={fil.avatar ?? null}
        init={fil.init}
        info={info}
        participants={fil.participants}
        ajoutables={ajoutables}
        messages={visibles.map((m) => ({
          id: m.id,
          de: m.moi ? "Vous" : m.de,
          texte: m.texte,
          heure: m.heure,
          pieces: m.pieces,
        }))}
      />

      <ActionsMessages space={space} cibles={cibles}>
        <div className="flex-1 min-h-0 overflow-y-auto p-[18px] flex flex-col gap-2.5">
          {fil.messages.length === 0 ? (
            <p className="m-auto text-[13px] text-faint text-center max-w-[32ch]">
              Aucun message pour l’instant. Écrivez le premier.
            </p>
          ) : null}

          {fil.messages.map((m: Message, i) => {
            const jour = jourLisible(m.envoyeLe);
            const nouveauJour =
              i === 0 || jourLisible(fil.messages[i - 1].envoyeLe) !== jour;

            return (
              <Fragment key={m.id}>
                {nouveauJour ? (
                  <div className="self-center my-1.5 text-[11px] font-semibold text-muted bg-surface-2 border border-line rounded-full px-3 py-1">
                    {jour}
                  </div>
                ) : null}
                <Bulle
                  message={m}
                  heure={heureExacte(m.envoyeLe)}
                  groupe={fil.type === "groupe" || fil.equipe}
                  nomAuteur={
                    fil.equipe && space === "membre"
                      ? "Équipe CanCham"
                      : undefined
                  }
                  equipeADroite={space === "admin" && fil.equipe}
                  space={space}
                />
              </Fragment>
            );
          })}

          <DefilerEnBas repere={`${fil.id}:${dernier}`} />
        </div>
      </ActionsMessages>

      <Composeur key={`${fil.id}:${dernier}`} threadId={fil.id} space={space} />
    </div>
  );
}
