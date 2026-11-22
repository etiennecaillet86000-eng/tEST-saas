/** Outils d’amortissement linéaire. La durée est toujours exprimée en mois. */
export function normalizeDureeMois(value, dureeEmpruntAns = 0) {
  const n = Math.max(0, Math.round(Number(value) || 0));
  if (!n) return 0;
  const years = Number(dureeEmpruntAns) || 0;
  // Le lien au prêt permet de reconnaître sans ambiguïté l’ancien stockage en années.
  if (years > 0 && years <= 10 && n === Math.round(years)) return n * 12;
  if (years > 0 && n === Math.round(years * 12)) return n;
  // Ancien formulaire autonome : durées de 1 à 10 = années. En présence du prêt,
  // le champ de durée en années ci-dessus permet une détection plus précise.
  return n <= 10 ? n * 12 : n;
}

/** Dotations annuelles prorata temporis, arrondies au centime et soldant exactement le coût. */
export function dotationsLineairesProrata(valeur, dureeMois, moisMiseService = 1) {
  const months = Math.max(0, Math.round(Number(dureeMois) || 0));
  const cost = Number(valeur) || 0;
  if (!(months > 0) || !(cost > 0)) return [];
  let remaining = months;
  const rows = [];
  const month = Math.max(1, Math.min(12, Math.floor(Number(moisMiseService) || 1)));
  const firstYearMonths = 13 - month;
  while (remaining > 0) {
    const chunk = Math.min(remaining, rows.length === 0 ? firstYearMonths : 12);
    const amount = Math.round((cost / months * chunk + Number.EPSILON) * 100) / 100;
    rows.push(amount);
    remaining -= chunk;
  }
  rows[rows.length - 1] = Math.round((cost - rows.slice(0, -1).reduce((a, b) => a + b, 0) + Number.EPSILON) * 100) / 100;
  return rows;
}

export function dotationMensuelleMoyenne(valeur, dureeMois) {
  const months = Number(dureeMois);
  return months > 0 ? (Number(valeur) || 0) / months : 0;
}
