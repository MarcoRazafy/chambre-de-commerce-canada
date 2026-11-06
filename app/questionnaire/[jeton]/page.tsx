import { Suspense } from 'react';
import QuestionnairePublic from '@/components/maillage/QuestionnairePublic';

// Questionnaire de maillage, ouvert par le lien personnel envoyé au membre (sans compte ni mot de passe).
// Le jeton de l'adresse est lu sous <Suspense> : le bandeau s'affiche tout de suite.
export default function QuestionnairePage() {
  return (
    <Suspense fallback={<div className="mq-page"><header className="mq-bandeau"><img src="/logo-mark.png" alt="" width={30} height={21} /><div><b>CanCham Madagascar</b><span>Questionnaire de maillage des membres</span></div></header></div>}>
      <QuestionnairePublic />
    </Suspense>
  );
}
