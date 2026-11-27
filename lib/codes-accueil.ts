import { MOTIF_CODE } from "@/lib/prefixe-numeros-base";

export function codeRepresentant(code: string, rang: number): string {
  return rang === 0 ? code : `${code}-${rang + 1}`;
}

export function codeInscription(code: string): string {
  return code.replace(/-\d{1,2}$/, "");
}

export function estCodeInscription(code: string): boolean {
  return new RegExp(`^${MOTIF_CODE}$`).test(code);
}

export function extraireCode(lu: string): string {
  return (
    new RegExp(`${MOTIF_CODE}(?:-\\d{1,2})?`, "i").exec(lu)?.[0].toUpperCase() ??
    lu.trim()
  );
}
