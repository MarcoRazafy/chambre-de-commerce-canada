"use client";

import { Check, KeyRound } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import { ChampPhoto, Field, SubmitButton } from "@/components/form-bits";
import { Card } from "@/components/ui";
import { modifierProfilEquipe } from "@/lib/actions/equipe";
import { changerMonMotDePasse } from "@/lib/actions/motdepasse";
import type { User } from "@/lib/types";

export function FormulaireProfilEquipe({ user }: { user: User }) {
  return (
    <Card className="p-6">
      <form action={modifierProfilEquipe} className="flex flex-col gap-4">
        <ChampPhoto
          name="photo"
          retirer="retirerPhoto"
          apercu={user.photo}
          libelle="Photo de profil"
          aide="Un portrait cadré sur le visage. JPEG, PNG ou WebP."
          rond
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet">
            <input
              name="nom"
              required
              defaultValue={user.nom}
              autoComplete="name"
              className={INPUT}
            />
          </Field>
          <Field label="Fonction">
            <input
              name="fonction"
              required
              defaultValue={user.fonction}
              autoComplete="organization-title"
              placeholder="Ex. Chargée des adhésions"
              className={INPUT}
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              name="email"
              required
              defaultValue={user.email}
              autoComplete="email"
              className={INPUT}
            />
          </Field>
          <Field label="Téléphone">
            <input
              type="tel"
              name="tel"
              defaultValue={user.tel ?? ""}
              autoComplete="tel"
              placeholder="+261 34 00 000 00"
              className={INPUT}
            />
          </Field>
        </div>
        <div className="flex justify-end pt-1">
          <SubmitButton pendingLabel="Enregistrement…">
            <Check size={15} /> Enregistrer le profil
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function FormulaireMotDePasse({
  email,
  minimum,
}: {
  email: string;
  minimum: number;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-[17px] m-0 mb-1">Mot de passe</h2>
      <p className="m-0 mb-4 text-[13px] text-muted">
        Remplacez le mot de passe provisoire reçu par e-mail, ou changez le
        vôtre. Vos autres sessions ouvertes seront fermées.
      </p>
      <form action={changerMonMotDePasse} className="flex flex-col gap-4">
        <input
          type="text"
          name="identifiant"
          autoComplete="username"
          value={email}
          hidden
          readOnly
        />
        <Field label="Mot de passe actuel">
          <input
            type="password"
            name="actuel"
            required
            autoComplete="current-password"
            className={INPUT}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nouveau mot de passe"
            hint={`${minimum} caractères au moins.`}
          >
            <input
              type="password"
              name="nouveau"
              required
              minLength={minimum}
              autoComplete="new-password"
              className={INPUT}
            />
          </Field>
          <Field label="Confirmation">
            <input
              type="password"
              name="confirmation"
              required
              minLength={minimum}
              autoComplete="new-password"
              className={INPUT}
            />
          </Field>
        </div>
        <div className="flex justify-end pt-1">
          <SubmitButton pendingLabel="Enregistrement…">
            <KeyRound size={15} /> Changer le mot de passe
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
