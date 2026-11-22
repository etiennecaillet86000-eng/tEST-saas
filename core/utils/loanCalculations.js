/** Calculs autonomes du tableau d’emprunt, partageables avec les tests Node. */
export function mensualiteConstante(capital, tauxAnnuel, dureeMois) {
  if (!(capital > 0) || !(dureeMois > 0)) return 0;
  const tauxMensuel = tauxAnnuel / 100 / 12;
  if (tauxMensuel === 0) return capital / dureeMois;
  return capital * tauxMensuel / (1 - (1 + tauxMensuel) ** -dureeMois);
}

/** Le différé ajoute des mois au terme : intérêts seuls puis mensualité constante. */
export function tableauEmprunt(capitalInitial, tauxAnnuel, dureeRemboursement, differeMois = 0) {
  if (!(capitalInitial > 0) || !(dureeRemboursement > 0)) return [];
  const grace = Math.max(0, Math.floor(differeMois));
  const tauxMensuel = tauxAnnuel / 100 / 12;
  const mensualite = mensualiteConstante(capitalInitial, tauxAnnuel, dureeRemboursement);
  let capital = capitalInitial;
  const lignes = [];
  for (let i = 0; i < grace + dureeRemboursement; i++) {
    const interets = capital * tauxMensuel;
    const enDiffere = i < grace;
    const paiement = enDiffere ? interets : Math.min(mensualite, capital + interets);
    const capitalRembourse = Math.max(0, paiement - interets);
    const capitalFin = Math.max(0, capital - capitalRembourse);
    lignes.push({ mois: i + 1, capitalDebut: capital, mensualite: paiement, interets, capitalRembourse, capitalFin, differe: enDiffere });
    capital = capitalFin;
  }
  if (lignes.length) lignes[lignes.length - 1].capitalFin = 0;
  return lignes;
}

export function interetsTotauxTableau(lignes) {
  return lignes.reduce((s, l) => s + l.interets, 0);
}

export function soldeApresMois(lignes, mois) {
  if (mois <= 0) return lignes[0]?.capitalDebut ?? 0;
  return lignes[Math.min(Math.floor(mois), lignes.length) - 1]?.capitalFin ?? 0;
}

export function soldesAnnuels(lignes) {
  const years = [];
  for (let i = 0; i < lignes.length; i += 12) {
    const period = lignes.slice(i, i + 12);
    years.push({ annee: years.length + 1, capitalDebut: period[0].capitalDebut, interets: period.reduce((s,l)=>s+l.interets,0), capitalRembourse: period.reduce((s,l)=>s+l.capitalRembourse,0), capitalFin: period.at(-1).capitalFin });
  }
  return years;
}
