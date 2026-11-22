import { dotationsLineairesProrata } from "./depreciation.js";
import { mensualiteConstante, tableauEmprunt, soldeApresMois, interetsTotauxTableau } from "./loanCalculations.js";
import type { Emprunt, LigneAmortissement } from "../types";

// ── Loan calculations ─────────────────────────────────────────────────────────

/** Mensualité constante hors période de différé (différé en intérêts seuls). */
export function calcMensualite(montant: number, tauxAnnuel: number, dureeMois: number): number {
  return mensualiteConstante(montant, tauxAnnuel, dureeMois);
}

export function totalInterets(emprunt: Emprunt): number {
  return interetsTotauxTableau(tableauEmprunt(emprunt.montant, emprunt.tauxAnnuel, Number(emprunt.dureeMois), Number(emprunt.differeMois)));
}

export function coutTotalEmprunt(emprunt: Emprunt): number {
  return emprunt.montant + totalInterets(emprunt);
}

export function capitalRestantApresNMois(emprunt: Emprunt, nMois: number): number {
  const lignes = tableauEmprunt(emprunt.montant, emprunt.tauxAnnuel, Number(emprunt.dureeMois), Number(emprunt.differeMois));
  return soldeApresMois(lignes, nMois);
}

// ── Depreciation calculations ─────────────────────────────────────────────────

/** Dotation annuelle pleine (hors prorata de mise en service), durée stockée en mois. */
export function annuiteLineaire(asset: LigneAmortissement): number {
  const dureeMois = Number(asset.dureeMois);
  return dureeMois > 0 ? asset.coutTotal / (dureeMois / 12) : 0;
}

/**
 * Residual value after N years
 */
/** Annual dotation, prorata temporis from service date; final year is adjusted to exact depreciable value. */
export function projectionDotations(asset: LigneAmortissement): number[] {
  const start=(asset as any).dateMiseService as string|undefined;
  return dotationsLineairesProrata(asset.coutTotal,Number(asset.dureeMois),start?Number(start.slice(5,7)):1);
}
export function valeurResiduelle(asset:LigneAmortissement, annee:number):number {
 const cumulative=projectionDotations(asset).slice(0,Math.max(0,annee)).reduce((a,b)=>a+b,0);return Math.max(0,asset.coutTotal-cumulative);
}
export function dotationAnnuelleParAnnee(asset:LigneAmortissement,annee:number):number { return projectionDotations(asset)[annee-1]??0; }
/**
 * Total annual depreciation for a portfolio of assets
 */
export function totalDotationsParAnnee(
  assets: LigneAmortissement[],
  annee: number,
): number {
  return assets.reduce(
    (sum, asset) => sum + dotationAnnuelleParAnnee(asset, annee),
    0,
  );
}

/**
 * Monthly depreciation for year 1
 */
export function dotationMensuelle(asset: LigneAmortissement): number {
  return Number(asset.dureeMois) > 0 ? asset.coutTotal / Number(asset.dureeMois) : 0;
}

/**
 * Total monthly interest across all active loans for a given month offset.
 * Uses the constant-annuity formula: monthly interest = remaining capital × (rate/12)
 * @param emprunts  List of all loans
 * @param moisOffset Months since loan start (0-based). Use 0 for a generic monthly average.
 */
export function totalInteretsMensuelActif(
  emprunts: Emprunt[],
  moisOffset: number,
): number {
  return emprunts.reduce((sum, e) => {
    const dureeMois = Number(e.dureeMois);
    if (dureeMois <= 0 || e.montant <= 0) return sum;
    if (moisOffset >= dureeMois + Number(e.differeMois)) return sum; // loan fully repaid
    const tauxMensuel = e.tauxAnnuel / 100 / 12;
    if (tauxMensuel === 0) return sum; // zero-rate loan has no interest
    const capital = capitalRestantApresNMois(e, moisOffset);
    return sum + capital * tauxMensuel;
  }, 0);
}

/**
 * Average monthly interest across a full year (12 months from moisStart)
 */
export function moyenneInteretsMensuelAnnuel(
  emprunts: Emprunt[],
  moisStart: number,
): number {
  let total = 0;
  for (let i = 0; i < 12; i++) {
    total += totalInteretsMensuelActif(emprunts, moisStart + i);
  }
  return total / 12;
}

/**
 * Total interest for a full year (12 months from moisStart)
 */
export function totalInteretsAnnuel(
  emprunts: Emprunt[],
  moisStart: number,
): number {
  let total = 0;
  for (let i = 0; i < 12; i++) {
    total += totalInteretsMensuelActif(emprunts, moisStart + i);
  }
  return total;
}
