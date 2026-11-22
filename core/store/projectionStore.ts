import { RECIPE_CATEGORIES } from "@/core/constants";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  HorizonType,
  ProjectionParams,
  ScenarioType,
} from "../types/projection";
import type { MixCategorie } from "../utils/projectionMath";

const DEFAULT_PARAMS: ProjectionParams = {
  horizon: 12,
  scenario: "realiste",
  couvertsDejeunner: 30,
  couvertsDiner: 40,
  tauxRemplissage: 70,
  ticketMoyen: 28,
  seasonalite: [1.0, 0.9, 1.0, 1.1, 1.0, 0.85, 1.2, 1.3, 1.0, 0.95, 0.9, 1.15],
  inflationCharges: 2.5,
  foodCostRatio: 30,
};

// RECIPE_CATEGORIES is imported from @/core/constants — 7 categories
// Distribute 100% evenly: first 2 get 15%, last 5 get 14% → total = 100%
const MIX_PCT_DEFAULTS = [
  15, // Entrée
  15, // Plats
  14, // Snacking
  14, // Boisson
  14, // Dessert
  14, // Accompagnement
  14, // Formules
];

const DEFAULT_MIX_CATEGORIES: MixCategorie[] = RECIPE_CATEGORIES.map(
  (label, i) => ({
    label,
    pctCA: MIX_PCT_DEFAULTS[i] ?? Math.round(100 / RECIPE_CATEGORIES.length),
    margeBruteAvg: 70,
  }),
);

export interface BusinessPlanParams {
  /** Taux d'imposition sur les bénéfices (%) */
  tauxImposition: number;
  /** Coefficient de croissance annuelle pour la projection 5 ans (ex: 1.03 = +3%/an) */
  growthCoefficient5ans: number;
  /** Pacte social : si activé, inclure les charges sociales des associés/gérants dans les projections */
  pacteSocialActive: boolean;
}

export interface CalendrierExploitation {
  /** Jours d'ouverture par semaine (1-7) */
  joursOuvertureParSemaine: number;
  /** Semaines d'ouverture par an (1-52) */
  semainesOuvertureParAn: number;
}

const DEFAULT_BP_PARAMS: BusinessPlanParams = {
  tauxImposition: 25,
  growthCoefficient5ans: 1.0,
  pacteSocialActive: false,
};

const DEFAULT_CALENDRIER: CalendrierExploitation = {
  joursOuvertureParSemaine: 6,
  semainesOuvertureParAn: 52,
};

interface ProjectionState {
  scenario: ScenarioType;
  horizon: HorizonType;
  comparisonMode: boolean;
  params: ProjectionParams;

  // ── Mix produit categories (Paramétrage tab) ──────────────────────────────
  mixCategories: MixCategorie[];

  // ── Business plan params (Paramétrage tab) ────────────────────────────────
  businessPlanParams: BusinessPlanParams;

  // ── Calendrier d'exploitation (Paramétrage tab) ──────────────────────────
  calendrierExploitation: CalendrierExploitation;

  // ── Mix produit projection results (shared with Operations) ─────────────
  /** Seuil de rentabilité mensuel calculé depuis le mix produits (€) */
  mixProduitSeuilMensuel: number;
  /** Marge brute globale pondérée par le mix (%) */
  mixProduitMargeGlobale: number;
  /** CA projeté mensuel depuis le mix produits (€) */
  mixProduitCAProjeteMensuel: number;

  setScenario: (s: ScenarioType) => void;
  setHorizon: (h: HorizonType) => void;
  setComparisonMode: (v: boolean) => void;
  updateParams: (partial: Partial<ProjectionParams>) => void;
  updateSeasonalite: (monthIndex: number, value: number) => void;
  resetParams: () => void;
  updateMixCategories: (categories: MixCategorie[]) => void;
  updateBusinessPlanParams: (partial: Partial<BusinessPlanParams>) => void;
  updateCalendrier: (partial: Partial<CalendrierExploitation>) => void;
  /** Called by TabRentabiliteMixProduits to export its computed values */
  setMixProduitResults: (seuil: number, marge: number, ca: number) => void;
}

/** Rehydrate a potentially-stale stored state by merging it with safe defaults */
function ensureSafeState(
  partial: Partial<ProjectionState>,
): Partial<ProjectionState> {
  const safe: Partial<ProjectionState> = { ...partial };
  // Ensure params is a complete object with all numeric fields
  const p = (partial.params ?? {}) as Partial<ProjectionParams>;
  safe.params = {
    horizon:
      typeof p.horizon === "number" && !Number.isNaN(p.horizon)
        ? p.horizon
        : DEFAULT_PARAMS.horizon,
    scenario: p.scenario ?? DEFAULT_PARAMS.scenario,
    couvertsDejeunner:
      typeof p.couvertsDejeunner === "number" &&
      !Number.isNaN(p.couvertsDejeunner)
        ? p.couvertsDejeunner
        : DEFAULT_PARAMS.couvertsDejeunner,
    couvertsDiner:
      typeof p.couvertsDiner === "number" && !Number.isNaN(p.couvertsDiner)
        ? p.couvertsDiner
        : DEFAULT_PARAMS.couvertsDiner,
    tauxRemplissage:
      typeof p.tauxRemplissage === "number" && !Number.isNaN(p.tauxRemplissage)
        ? p.tauxRemplissage
        : DEFAULT_PARAMS.tauxRemplissage,
    ticketMoyen:
      typeof p.ticketMoyen === "number" && !Number.isNaN(p.ticketMoyen)
        ? p.ticketMoyen
        : DEFAULT_PARAMS.ticketMoyen,
    seasonalite:
      Array.isArray(p.seasonalite) && p.seasonalite.length === 12
        ? p.seasonalite.map((v) =>
            typeof v === "number" && !Number.isNaN(v) ? v : 1.0,
          )
        : DEFAULT_PARAMS.seasonalite,
    inflationCharges:
      typeof p.inflationCharges === "number" &&
      !Number.isNaN(p.inflationCharges)
        ? p.inflationCharges
        : DEFAULT_PARAMS.inflationCharges,
    foodCostRatio:
      typeof p.foodCostRatio === "number" && !Number.isNaN(p.foodCostRatio)
        ? p.foodCostRatio
        : DEFAULT_PARAMS.foodCostRatio,
  };
  // Ensure calendrierExploitation has valid non-zero values
  const cal = (partial.calendrierExploitation ??
    {}) as Partial<CalendrierExploitation>;
  safe.calendrierExploitation = {
    joursOuvertureParSemaine:
      typeof cal.joursOuvertureParSemaine === "number" &&
      cal.joursOuvertureParSemaine > 0
        ? cal.joursOuvertureParSemaine
        : DEFAULT_CALENDRIER.joursOuvertureParSemaine,
    semainesOuvertureParAn:
      typeof cal.semainesOuvertureParAn === "number" &&
      cal.semainesOuvertureParAn > 0
        ? cal.semainesOuvertureParAn
        : DEFAULT_CALENDRIER.semainesOuvertureParAn,
  };
  // Ensure businessPlanParams is complete
  const bpp = (partial.businessPlanParams ?? {}) as Partial<BusinessPlanParams>;
  safe.businessPlanParams = {
    tauxImposition:
      typeof bpp.tauxImposition === "number" &&
      !Number.isNaN(bpp.tauxImposition)
        ? bpp.tauxImposition
        : DEFAULT_BP_PARAMS.tauxImposition,
    growthCoefficient5ans:
      typeof bpp.growthCoefficient5ans === "number" &&
      !Number.isNaN(bpp.growthCoefficient5ans)
        ? bpp.growthCoefficient5ans
        : DEFAULT_BP_PARAMS.growthCoefficient5ans,
    pacteSocialActive:
      typeof bpp.pacteSocialActive === "boolean"
        ? bpp.pacteSocialActive
        : DEFAULT_BP_PARAMS.pacteSocialActive,
  };
  // Ensure mixCategories is a valid non-empty array
  safe.mixCategories =
    Array.isArray(partial.mixCategories) && partial.mixCategories.length > 0
      ? partial.mixCategories
      : DEFAULT_MIX_CATEGORIES;
  // Ensure numeric projection results are numbers
  safe.mixProduitSeuilMensuel =
    typeof partial.mixProduitSeuilMensuel === "number" &&
    !Number.isNaN(partial.mixProduitSeuilMensuel)
      ? partial.mixProduitSeuilMensuel
      : 0;
  safe.mixProduitMargeGlobale =
    typeof partial.mixProduitMargeGlobale === "number" &&
    !Number.isNaN(partial.mixProduitMargeGlobale)
      ? partial.mixProduitMargeGlobale
      : 0;
  safe.mixProduitCAProjeteMensuel =
    typeof partial.mixProduitCAProjeteMensuel === "number" &&
    !Number.isNaN(partial.mixProduitCAProjeteMensuel)
      ? partial.mixProduitCAProjeteMensuel
      : 0;
  return safe;
}

export const useProjectionStore = create<ProjectionState>()(
  persist(
    (set) => ({
      scenario: "realiste",
      horizon: 12,
      comparisonMode: false,
      params: { ...DEFAULT_PARAMS },
      mixCategories: DEFAULT_MIX_CATEGORIES,
      businessPlanParams: { ...DEFAULT_BP_PARAMS },
      calendrierExploitation: { ...DEFAULT_CALENDRIER },

      mixProduitSeuilMensuel: 0,
      mixProduitMargeGlobale: 0,
      mixProduitCAProjeteMensuel: 0,

      setScenario: (s) =>
        set((state) => ({
          scenario: s,
          params: { ...state.params, scenario: s },
        })),

      setHorizon: (h) =>
        set((state) => ({
          horizon: h,
          params: { ...state.params, horizon: h },
        })),

      setComparisonMode: (v) => set({ comparisonMode: v }),

      updateParams: (partial) =>
        set((state) => ({
          params: { ...state.params, ...partial },
        })),

      updateSeasonalite: (monthIndex, value) =>
        set((state) => {
          const next = [
            ...state.params.seasonalite,
          ] as ProjectionParams["seasonalite"];
          next[monthIndex] = value;
          return { params: { ...state.params, seasonalite: next } };
        }),

      resetParams: () =>
        set({
          scenario: "realiste",
          horizon: 12,
          comparisonMode: false,
          params: { ...DEFAULT_PARAMS },
        }),

      updateMixCategories: (categories) => set({ mixCategories: categories }),

      updateBusinessPlanParams: (partial) =>
        set((state) => ({
          businessPlanParams: { ...state.businessPlanParams, ...partial },
        })),

      updateCalendrier: (partial) =>
        set((state) => ({
          calendrierExploitation: {
            ...state.calendrierExploitation,
            ...partial,
          },
        })),

      setMixProduitResults: (seuil, marge, ca) =>
        set({
          mixProduitSeuilMensuel: seuil,
          mixProduitMargeGlobale: marge,
          mixProduitCAProjeteMensuel: ca,
        }),
    }),
    {
      name: "projection-store",
      // Rehydrate stored state defensively — replace missing/NaN fields with defaults
      merge: (persisted, current) => {
        const safe = ensureSafeState(persisted as Partial<ProjectionState>);
        return { ...current, ...safe } as ProjectionState;
      },
    },
  ),
);
