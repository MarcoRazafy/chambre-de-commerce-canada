import Image from "next/image";
import { ProtectionDocument } from "@/components/ProtectionDocument";
import { COORDONNEES } from "@/lib/coordonnees";
import { fmtDate } from "@/lib/format";
import { libelleFormule } from "@/lib/membership";
import { affichageSite } from "@/lib/liens";
import type { Member } from "@/lib/types";

const TITRE_CHARTE =
  "font-[family-name:var(--font-texte)]! font-bold! tracking-[-0.015em]";

export function CertificatAdhesion({
  membre: m,
  fin,
}: {
  membre: Pick<Member, "nom" | "formule">;
  fin?: string | null;
}) {
  return (
    <ProtectionDocument className="mx-auto w-full max-w-[1000px] print:max-w-none">
      <div className="@container aspect-[297/210] w-full print:h-[210mm] print:w-[297mm]">
        <div className="certificat flex h-full w-full bg-[linear-gradient(100deg,#ad0707_0%,#7a4a1f_52%,#007140_100%)] p-[1.1cqw] print:bg-none print:p-0">
          <div className="marque flex h-full w-full bg-white p-[1.2cqw]">
            <div className="flex h-full w-full flex-col items-center border border-[#0f1d2c]/20 px-[5cqw] py-[2.6cqw] text-center text-[#0f1d2c]">
              <Image
                src="/marque/sigle.png"
                alt="IMPACT 261"
                width={889}
                height={1000}
                sizes="260px"
                draggable={false}
                className="h-auto w-[13.5cqw]"
              />

              <h1
                className={`${TITRE_CHARTE} m-0 mt-[1.9cqw] text-[5.4cqw] leading-none text-[#ad0707]`}
              >
                Certificat d’adhésion
              </h1>

              <p className="m-0 mt-[2.1cqw] max-w-[68cqw] text-[1.7cqw] leading-relaxed text-[#243447]">
                La Chambre de Commerce et de Coopération Canada-Madagascar
                atteste que
              </p>

              <div className="mt-[1.7cqw] w-[64cqw] max-w-full">
                <div
                  className={`${TITRE_CHARTE} text-[3.8cqw] leading-tight break-words`}
                >
                  {m.nom}
                </div>
                <span
                  aria-hidden
                  className="mt-[0.9cqw] block h-[0.25cqw] w-full rounded-full bg-[linear-gradient(90deg,#ad0707,#007140)]"
                />
              </div>

              <p className="m-0 mt-[2.1cqw] max-w-[68cqw] text-[1.7cqw] leading-relaxed text-[#243447]">
                est membre de la CanCham Madagascar
                {m.formule ? (
                  <>
                    {" "}
                    au titre de la catégorie{" "}
                    <b className="font-semibold text-[#0f1d2c]">
                      {libelleFormule(m.formule)}
                    </b>
                  </>
                ) : null}
                , et bénéficie à ce titre de l’ensemble des avantages réservés
                aux membres.
              </p>

              <div className="mt-auto grid w-full grid-cols-3 items-end gap-[2cqw]">
                <div className="text-left">
                  {fin ? (
                    <>
                      <div className="text-[1.05cqw] font-semibold uppercase tracking-[0.16em] text-[#4a5a6b]">
                        Valable jusqu’au
                      </div>
                      <div
                        className={`${TITRE_CHARTE} mt-[0.5cqw] text-[2.1cqw] leading-none text-[#ad0707]`}
                      >
                        {fmtDate(fin)}
                      </div>
                    </>
                  ) : null}
                </div>

                <SceauMembre className="mx-auto w-[9.5cqw]" />

                <div className="text-right">
                  <Image
                    src="/marque/signature-presidente.png"
                    alt="Signature de la présidente du Conseil d’Administration"
                    width={395}
                    height={292}
                    sizes="220px"
                    draggable={false}
                    className="ml-auto -mb-[1cqw] h-auto w-[13cqw]"
                  />
                  <span
                    aria-hidden
                    className="ml-auto block h-px w-[21cqw] max-w-full bg-[#0f1d2c]/60"
                  />
                  <div className="mt-[0.7cqw] text-[1.5cqw] font-semibold leading-snug">
                    Ando Lalaina RATOVOMANANA
                  </div>
                  <div className="text-[1.25cqw] leading-snug text-[#4a5a6b]">
                    Présidente du Conseil d’Administration
                  </div>
                </div>
              </div>

              <div className="mt-[1.5cqw] text-[1.15cqw] text-[#4a5a6b]">
                Le présent certificat est délivré pour servir et valoir ce que
                de droit. · {affichageSite(COORDONNEES.site)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectionDocument>
  );
}

function SceauMembre({ className }: { className?: string }) {
  const rayon = 39;
  const tour = 2 * Math.PI * rayon;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Sceau : membre officiel de la CanCham Madagascar"
      className={`h-auto ${className ?? ""}`}
    >
      <defs>
        <path
          id="sceau-anneau"
          fill="none"
          d={`M 50 ${50 - rayon} A ${rayon} ${rayon} 0 1 1 49.99 ${50 - rayon}`}
        />
        <linearGradient id="sceau-degrade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ad0707" />
          <stop offset="1" stopColor="#007140" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="49" fill="url(#sceau-degrade)" />
      <circle
        cx="50"
        cy="50"
        r="33"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeDasharray="2 2.6"
        opacity="0.85"
      />
      <circle cx="50" cy="50" r="29.5" fill="#007140" />

      <text
        fill="#ffffff"
        fontSize="7"
        fontWeight="700"
        letterSpacing="0.04em"
        fontFamily="var(--font-texte)"
      >
        <textPath
          href="#sceau-anneau"
          startOffset="0"
          textLength={tour}
          lengthAdjust="spacing"
        >
          MEMBRE OFFICIEL · CANCHAM MADAGASCAR ·
        </textPath>
      </text>

      <path
        d="M37 50.5 L46 59.5 L64 39.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
