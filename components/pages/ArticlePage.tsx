import { notFound } from "next/navigation";
import { Globe, LockKeyhole, Pencil } from "lucide-react";
import {
  AvatarRond,
  MediaBanner,
  OfferCard,
  SignaturePublication,
} from "@/components/domain";
import {
  ComposeurPublication,
  SupprimerMaPublication,
} from "@/components/forms/ComposeurPublication";
import { BtnLink, Card, EmptyState, Kicker } from "@/components/ui";
import { GaleriePhotos } from "@/components/GaleriePhotos";
import { SupprimerActualiteButton } from "@/components/forms/AdminContenuForms";
import {
  CarteCommentaire,
  FormulaireCommentaire,
} from "@/components/forms/Commentaires";
import { Reactions } from "@/components/forms/Reactions";
import { TexteLie } from "@/components/TexteLie";
import { OFFRES_DU_RAIL } from "@/lib/offres";
import { getDernieresOffres, getMember, getNewsItem } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { fmtDate } from "@/lib/format";
import type { Space } from "@/lib/types";

export async function ArticlePage({ space, id }: { space: Space; id: string }) {
  const admin = space === "admin";
  const user = await getCurrentUser(space);
  const [n, offres] = await Promise.all([
    getNewsItem(id, user.id),
    getDernieresOffres(OFFRES_DU_RAIL, "actualites"),
  ]);
  if (!n) notFound();
  const entreprise =
    !admin && user.memberId ? await getMember(user.memberId) : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-3 flex-wrap empty:hidden">
        {admin ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
              {n.public ? (
                <>
                  <Globe size={14} className="text-success-strong" /> Plateforme
                  et page publique
                </>
              ) : (
                <>
                  <LockKeyhole size={14} /> Plateforme uniquement
                </>
              )}
            </span>
            <BtnLink href={`/admin/actualites/${n.id}/modifier`} sm>
              <Pencil size={14} /> Modifier
            </BtnLink>
            <SupprimerActualiteButton
              newsId={n.id}
              titre={n.titre}
              commentaires={n.commentaires.length}
            />
          </div>
        ) : entreprise && n.auteur?.membreId === entreprise.id ? (
          <div className="flex items-center gap-1.5">
            <ComposeurPublication
              key={`${n.corps}|${n.images.join("|")}`}
              entreprise={entreprise.nom}
              avatar={
                <AvatarRond
                  src={entreprise.logo}
                  alt=""
                  initiales={entreprise.nom.slice(0, 2).toUpperCase()}
                  taille={44}
                  ajuste="contenu"
                  className="shrink-0 border border-line bg-surface-2 text-[13px] font-bold text-muted"
                />
              }
              publication={{
                id: n.id,
                texte: n.corps,
                images: n.images,
              }}
            />
            <SupprimerMaPublication
              newsId={n.id}
              commentaires={n.commentaires.length}
            />
          </div>
        ) : null}
      </div>

      <div className="flex gap-7 items-start flex-col xl:flex-row">
        <Card className="p-[22px] w-full min-w-0 xl:w-[680px] 2xl:w-[760px] xl:shrink-0">
          {n.libre ? (
            <>
              <h1 className="sr-only">{n.titre}</h1>
              <SignaturePublication news={n} />
              {n.corps ? (
                <p className="text-[15px] leading-[1.7] mt-4 mb-0 whitespace-pre-line break-words">
                  <TexteLie texte={n.corps} />
                </p>
              ) : null}
              {n.images.length ? (
                <div className="mt-4">
                  <GaleriePhotos images={n.images} alt={n.titre} />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Kicker>{n.auteur ? "Publication d’un membre" : n.cat}</Kicker>
              <h1 className="mt-2 mb-1.5 text-[24px]">{n.titre}</h1>
              <div className="text-[12.5px] text-faint mb-4">
                {fmtDate(n.date)}
                {n.auteur
                  ? ` · ${[n.auteur.personne, n.auteur.membre].filter(Boolean).join(", ")}`
                  : ""}
              </div>

              {n.images.length ? (
                <GaleriePhotos images={n.images} alt={n.titre} />
              ) : (
                <MediaBanner media={n.media} lg />
              )}

              <p className="text-[14.6px] leading-[1.75] mt-[18px] whitespace-pre-line">
                <TexteLie texte={n.corps} />
              </p>
            </>
          )}

          <div className="mt-5 pt-4 border-t border-line">
            <Reactions
              newsId={n.id}
              space={space}
              jaimes={n.jaimes}
              jaimeParMoi={n.jaimeParMoi}
              commentaires={n.commentaires.length}
              lienCommentaires="#commentaire"
            />
          </div>

          <div
            id="commentaires"
            className="flex items-center gap-2.5 mt-6 mb-3.5 scroll-mt-24"
          >
            <div className="w-[3px] self-stretch min-h-[18px] bg-accent rounded-sm" />
            <h2 className="text-[17px] font-semibold m-0">
              Commentaires
              {n.commentaires.length ? ` (${n.commentaires.length})` : ""}
            </h2>
          </div>

          {n.commentaires.length ? (
            <div className="flex flex-col gap-2.5">
              {n.commentaires.map((c) => (
                <CarteCommentaire
                  key={c.id}
                  commentaire={c}
                  space={space}
                  retour={`/${space}/actualites/${n.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted text-[13.4px] mb-3.5">
              Aucun commentaire pour le moment.
            </div>
          )}

          <div id="commentaire" className="mt-4 scroll-mt-24">
            <FormulaireCommentaire
              space={space}
              retour={`/${space}/actualites/${n.id}`}
              newsId={n.id}
            />
          </div>
        </Card>

        <aside className="w-full min-w-0 xl:flex-1 xl:sticky xl:top-[84px]">
          <h2 className="text-sm m-0 mb-2.5 font-semibold uppercase tracking-[0.04em] text-faint">
            Offres &amp; promotions membres
          </h2>
          {offres.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {offres.map((o) => (
                <OfferCard key={o.id} offer={o} />
              ))}
            </div>
          ) : (
            <EmptyState>Aucune offre en vedette pour le moment.</EmptyState>
          )}
        </aside>
      </div>
    </>
  );
}
