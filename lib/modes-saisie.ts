const MODES_SAISIE = ["Espèces", "Virement bancaire", "Mobile Money", "Chèque"];

export const modesSaisie = (mobileMoney: boolean) =>
  mobileMoney ? MODES_SAISIE : MODES_SAISIE.filter((m) => m !== "Mobile Money");
