import { getTaxRates } from "@/core/utils/taxRates";
/**
 * TabBusinessInitial.tsx — Business Initial
 * Fully automated from projectionStore params.
 * Charges are auto-aggregated from backend (no manual entry).
 *
 * Three-scale display:
 *   Mensuel  — base month (moyenne pondérée par saisonnalitm)
 *   Annuel   — sum of 12 months (mensuel × 12, with seasonality applied)
 *   5 ans    — annuel × 5 (linear by default; growthCoefficient5ans élève
 *             each year: Year n = Annuel × growthCoefficient^(n-1))
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjectionStore } from "@/core/store/projectionStore";
import { getScenarioCoefficient } from "@/core/utils/projectionMath";
import { totalDotationsParAnnee } from "@/core/utils/finance";
import {
  useAmortissements,
  useAssociesGerants,
  useEmprunts,
  useFraisFixes,
  useSalaries,
} from "@/hooks/useQueries";
import { fmtEur, fmtPct } from "@/utils/format";
import {
  BarChart3,
  CheckCircle2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { PnLHorizon } from "./shared";
import {
  KpiCard,
  KpiSkeleton,
  MONTH_SHORT,
  PnLTable,
  TableSkeleton,
} from "./shared";

// Working days/month from calendrier d'exploitation
function joursParMoisFromCalendrier(
  joursParSemaine: number,
  semainesParAn: number,
): number {
  return (joursParSemaine * semainesParAn) / 12;
}

function HorizonTabs({
  value,
  onChange,
}: { value: PnLHorizon; onChange: (v: PnLHorizon) => void }) {
  const opts: { v: PnLHorizon; label: string }[] = [
    { v: "mensuel", label: "Mensuel" },
    { v: "annuel", label: "Annuel" },
    { v: "5ans", label: "5 ans" },
  ];
  return (
    <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === o.v
              ? "bg-card shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid={`bp-initial.horizon.${o.v}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function TabBusinessInitial() {
  const { params, businessPlanParams, calendrierExploitation } =
    useProjectionStore();
  const bpp = businessPlanParams;
  const pacteSocial = bpp.pacteSocialActive ?? false;
  const [horizon, setHorizon] = useState<PnLHorizon>("mensuel");

  // ── Auto-aggregated charges from backend ──
  const { data: salaries = [], isLoading: loadSal } = useSalaries();
  const { data: associes = [], isLoading: loadAss } = useAssociesGerants();
  const { data: fraisFixes = [], isLoading: loadFF } = useFraisFixes();
  const { data: amortissements = [], isLoading: loadAmort } =
    useAmortissements();
  const { data: emprunts = [], isLoading: loadEmp } = useEmprunts();
  const isLoading = loadSal || loadAss || loadFF || loadAmort || loadEmp;

  // ── Monthly charge aggregation (base mensuel) ──────────────────────────
  // Salaires: annual ÷ 12, × 1.42 employer charges
  const salairesMensuel = useMemo(
    () =>
      salaries.reduce((s, e) => s + (e.salaireAnnuelBrut * (1 + getTaxRates().patronalesSalaries/100)) / 12, 0) +
      associes.reduce((a, x) => a + x.remunerationAnnuelle / 12, 0),
    [salaries, associes],
  );

  // Pacte social: charges sociales associés (TNS 45%, assimilé 42%)
  const chargesSocialesAssociesMensuel = useMemo(() => {
    if (!pacteSocial) return 0;
    return (
      associes.reduce((s, a) => {
        const rates=getTaxRates(); const rate = a.statut === "assimile" ? rates.assimileSalarie/100 : rates.tns/100;
        return s + a.remunerationAnnuelle * rate;
      }, 0) / 12
    );
  }, [associes, pacteSocial]);
  // Frais fixes: already monthly
  const fraisFixesMensuel = useMemo(
    () => fraisFixes.reduce((s, l) => s + l.montantMensuelAvecRemu, 0),
    [fraisFixes],
  );
  // Amortissements: dureeMois stores MONTHS → monthly = coutTotal / dureeMois
  const amortissementMensuel = useMemo(
    () => totalDotationsParAnnee(amortissements, 1) / 12,
    [amortissements],
  );

  // Emprunts capital repayment
  const empruntsMensuel = useMemo(
    () =>
      emprunts.reduce(
        (s, e) =>
          s + (Number(e.dureeMois) > 0 ? e.montant / Number(e.dureeMois) : 0),
        0,
      ),
    [emprunts],
  );

  // Intérêts d'emprunts (charges financières) — midpoint approximation
  const interetsMensuel = useMemo(
    () =>
      emprunts.reduce((sum, e) => {
        const dureeMois = Number(e.dureeMois);
        if (dureeMois <= 0 || e.montant <= 0 || e.tauxAnnuel === 0) return sum;
        const tauxMensuel = e.tauxAnnuel / 100 / 12;
        return sum + e.montant * tauxMensuel * 0.5;
      }, 0),
    [emprunts],
  );

  // Working days per month from calendrier
  const JOURS_PAR_MOIS = useMemo(
    () =>
      joursParMoisFromCalendrier(
        calendrierExploitation?.joursOuvertureParSemaine ?? 6,
        calendrierExploitation?.semainesOuvertureParAn ?? 52,
      ),
    [calendrierExploitation],
  );

  const totalChargesMensuelBase =
    salairesMensuel +
    fraisFixesMensuel +
    empruntsMensuel +
    chargesSocialesAssociesMensuel;

  const scenarioCoeff = getScenarioCoefficient(params.scenario);
  const couvertsTotal = params.couvertsDejeunner + params.couvertsDiner;

  // ── Monthly data: 12 months with seasonality ────────────────────────────
  const monthlyData = useMemo(() => {
    const caBaseJour =
      couvertsTotal *
      (params.tauxRemplissage / 100) *
      params.ticketMoyen *
      scenarioCoeff;
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const mIdx = (now.getMonth() + i) % 12;
      const ca = caBaseJour * (params.seasonalite[mIdx] ?? 1) * JOURS_PAR_MOIS;
      const cmp = ca * (params.foodCostRatio / 100);
      const charges = totalChargesMensuelBase;
      const amor = amortissementMensuel;
      const int_ = interetsMensuel;
      const mb = ca - cmp;
      const ebe = mb - charges;
      const re = ebe - amor;
      const resultatAvantIS = re - int_;
      const imp = Math.max(resultatAvantIS, 0) * (bpp.tauxImposition / 100);
      const rn = resultatAvantIS - imp;
      return {
        label: MONTH_SHORT[mIdx],
        year: now.getFullYear() + Math.floor((now.getMonth() + i) / 12),
        ca,
        cmp,
        mb,
        charges,
        amor,
        int: int_,
        ebe,
        re,
        imp,
        rn,
      };
    });
  }, [
    params,
    couvertsTotal,
    scenarioCoeff,
    totalChargesMensuelBase,
    amortissementMensuel,
    interetsMensuel,
    bpp.tauxImposition,
    JOURS_PAR_MOIS,
  ]);

  // ── Annual totals (sum of 12 months) ────────────────────────────────────
  function sumField(key: keyof (typeof monthlyData)[0]) {
    return monthlyData.reduce((s, m) => s + (m[key] as number), 0);
  }
  const annuelCA = sumField("ca");
  const annuelCMP = sumField("cmp");
  const annuelCharges = sumField("charges");
  const annuelAmor = sumField("amor");
  const annuelInterets = sumField("int");
  const annuelMB = annuelCA - annuelCMP;
  const annuelEBE = annuelMB - annuelCharges;
  const annuelRE = annuelEBE - annuelAmor;
  const annuelAvantIS = annuelRE - annuelInterets;
  const annuelImp = Math.max(annuelAvantIS, 0) * (bpp.tauxImposition / 100);
  const annuelRN = annuelAvantIS - annuelImp;

  // ── 5-year projection ──────────────────────────────────────────────────
  // Year 1 = annuel, Year n = Year 1 × growthCoefficient^(n-1)
  // Structure allows easy future extension with per-year coefficients
  const growth = bpp.growthCoefficient5ans;
  const fiveYearData = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const coeff = growth ** i;
      const now = new Date();
      const ca = annuelCA * coeff;
      const cmp = annuelCMP * coeff;
      const mb = ca - cmp;
      const charges = annuelCharges * coeff;
      const amor = annuelAmor;
      const interets = annuelInterets; // use annual average
      const ebe = mb - charges;
      const re = ebe - amor;
      const resultatAvantIS = re - interets;
      const imp = Math.max(resultatAvantIS, 0) * (bpp.tauxImposition / 100);
      const rn = resultatAvantIS - imp;
      return {
        year: now.getFullYear() + i,
        ca,
        cmp,
        mb,
        charges,
        amor,
        interets,
        ebe,
        re,
        rn,
      };
    });
  }, [
    annuelCA,
    annuelCMP,
    annuelCharges,
    annuelAmor,
    annuelInterets,
    growth,
    bpp.tauxImposition,
  ]);

  const cinqAnsCA = fiveYearData.reduce((s, y) => s + y.ca, 0);
  const cinqAnsRN = fiveYearData.reduce((s, y) => s + y.rn, 0);

  // ── Display values per horizon ─────────────────────────────────────────
  const mensuelRow = monthlyData[0];
  const totCA =
    horizon === "mensuel"
      ? (mensuelRow?.ca ?? 0)
      : horizon === "annuel"
        ? annuelCA
        : cinqAnsCA;
  const totRN =
    horizon === "mensuel"
      ? (mensuelRow?.rn ?? 0)
      : horizon === "annuel"
        ? annuelRN
        : cinqAnsRN;
  const totInterets =
    horizon === "mensuel"
      ? (mensuelRow?.int ?? 0)
      : horizon === "annuel"
        ? annuelInterets
        : fiveYearData.reduce((s, y) => s + y.interets, 0);
  const totMB =
    horizon === "mensuel"
      ? (mensuelRow?.mb ?? 0)
      : horizon === "annuel"
        ? annuelMB
        : fiveYearData.reduce((s, y) => s + y.mb, 0);
  const totEBE =
    horizon === "mensuel"
      ? (mensuelRow?.ebe ?? 0)
      : horizon === "annuel"
        ? annuelEBE
        : fiveYearData.reduce((s, y) => s + y.ebe, 0);
  const totRE =
    horizon === "mensuel"
      ? (mensuelRow?.re ?? 0)
      : horizon === "annuel"
        ? annuelRE
        : fiveYearData.reduce((s, y) => s + y.re, 0);
  const totImp =
    horizon === "mensuel"
      ? (mensuelRow?.imp ?? 0)
      : horizon === "annuel"
        ? annuelImp
        : Math.max(
            totRE - fiveYearData.reduce((s, y) => s + y.interets, 0),
            0,
          ) *
          (bpp.tauxImposition / 100);
  const totCMP =
    horizon === "mensuel"
      ? (mensuelRow?.cmp ?? 0)
      : horizon === "annuel"
        ? annuelCMP
        : fiveYearData.reduce((s, y) => s + y.cmp, 0);
  const totCharges =
    horizon === "mensuel"
      ? (mensuelRow?.charges ?? 0)
      : horizon === "annuel"
        ? annuelCharges
        : fiveYearData.reduce((s, y) => s + y.charges, 0);
  const totAmor =
    horizon === "mensuel"
      ? (mensuelRow?.amor ?? 0)
      : horizon === "annuel"
        ? annuelAmor
        : fiveYearData.reduce((s, y) => s + y.amor, 0);

  const margeNette = totCA > 0 ? (totRN / totCA) * 100 : 0;
  const seuilMensuel =
    totMB > 0 && totCA > 0
      ? (totCharges + totAmor + totInterets) / (totMB / totCA)
      : 0;

  const hLabel =
    horizon === "mensuel"
      ? "Mensuel"
      : horizon === "annuel"
        ? "Annuel"
        : "5 ans";

  const pnlRows = [
    { label: "Chiffre d'affaires HT", valeur: totCA, pctCA: 100, isBold: true },
    { label: "", valeur: 0, isSeparator: true },
    { label: "(−) Coût des matières premières", valeur: -totCMP },
    { label: "Marge brute", valeur: totMB, isSubtotal: true, isBold: true },
    { label: "", valeur: 0, isSeparator: true },
    {
      label: "(−) Charges fixes (salaires + frais fixes + emprunts)",
      valeur: -totCharges,
      isBold: true,
    },
    ...(pacteSocial && chargesSocialesAssociesMensuel > 0
      ? [
          {
            label: "  ↳ Charges sociales associés (pacte social)",
            valeur: -(
              chargesSocialesAssociesMensuel *
              (horizon === "mensuel" ? 1 : horizon === "annuel" ? 12 : 60)
            ),
            isIndented: true,
          },
        ]
      : []),
    {
      label: "Excédent Brut d'Exploitation (EBE)",
      valeur: totEBE,
      isSubtotal: true,
      isBold: true,
    },
    {
      label: "(−) Dotations aux amortissements",
      valeur: -totAmor,
      isIndented: true,
    },
    {
      label: "Résultat d'exploitation",
      valeur: totRE,
      isSubtotal: true,
      isBold: true,
    },
    {
      label: "(−) Charges financières (intérêts emprunts)",
      valeur: -totInterets,
      isIndented: true,
      isNegative: totInterets > 0,
    },
    {
      label: "Résultat avant impôt",
      valeur: totRE - totInterets,
      isSubtotal: true,
      isBold: true,
    },
    {
      label: "(−) Impôts sur les bénéfices",
      valeur: -totImp,
      isIndented: true,
    },
    { label: "RÉSULTAT NET", valeur: totRN, isTotal: true, isBold: true },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <KpiSkeleton cols={4} />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="bp-initial.tab.panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold">Business Initial</h3>
          <p className="text-sm text-muted-foreground">
            Projection entièrement automatisée · Charges issues des onglets
            Salariés, Frais Fixes, Emprunts et Amortissements
          </p>
        </div>
        <HorizonTabs value={horizon} onChange={setHorizon} />
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label={`CA Projeté (${hLabel})`}
          value={fmtEur(totCA)}
          sub={`Scénario : ${params.scenario}`}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          accent
        />
        <KpiCard
          label="Résultat Net"
          value={fmtEur(totRN)}
          sub={`Marge nette : ${fmtPct(margeNette)}`}
          icon={
            totRN >= 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )
          }
          positive={totRN >= 0}
        />
        <KpiCard
          label="Seuil de rentabilité"
          value={`${fmtEur(seuilMensuel)}/mois`}
          sub="CA mensuel minimum"
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
        />
        <KpiCard
          label="EBE"
          value={fmtEur(totEBE)}
          sub={totCA > 0 ? fmtPct((totEBE / totCA) * 100) : "—"}
          icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
          positive={totEBE >= 0}
        />
      </div>

      {/* P&L */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-muted/20">
          <CardTitle className="text-sm font-semibold">
            Compte de résultat — {hLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PnLTable rows={pnlRows} ca={totCA} />
        </CardContent>
      </Card>

      {/* Mensuel: show 12 months breakdown */}
      {horizon === "mensuel" && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-muted/20">
            <CardTitle className="text-sm font-semibold">
              Détail mensuel — 12 mois glissants
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Mois</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                  <TableHead className="text-right">CMP</TableHead>
                  <TableHead className="text-right">Marge Brute</TableHead>
                  <TableHead className="text-right">Charges Fixes</TableHead>
                  <TableHead className="text-right">EBE</TableHead>
                  <TableHead className="text-right">Résultat Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((m, idx) => (
                  <TableRow
                    key={`${m.label}-${m.year}-${idx}`}
                    className={idx % 2 === 1 ? "bg-muted/5" : ""}
                    data-ocid={`bp-initial.monthly.item.${idx + 1}`}
                  >
                    <TableCell className="font-medium text-xs">
                      {m.label} {m.year}
                    </TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {fmtEur(m.ca)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmtEur(m.cmp)}
                    </TableCell>
                    <TableCell className="text-right">{fmtEur(m.mb)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmtEur(m.charges)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtEur(m.ebe)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        m.rn >= 0 ? "text-green-400" : "text-destructive"
                      }`}
                    >
                      {fmtEur(m.rn)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-muted/40 border-t-2 font-bold">
                  <TableCell className="font-bold">TOTAL ANNUEL</TableCell>
                  <TableCell className="text-right text-primary">
                    {fmtEur(annuelCA)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtEur(annuelCMP)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtEur(annuelMB)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtEur(annuelCharges)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtEur(annuelEBE)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      annuelRN >= 0 ? "text-green-400" : "text-destructive"
                    }`}
                  >
                    {fmtEur(annuelRN)}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Annuel: already shown in P&L, no extra table needed */}

      {/* 5 ans: year-by-year breakdown */}
      {horizon === "5ans" && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-muted/20">
            <CardTitle className="text-sm font-semibold">
              Projection année par année — 5 ans
              {growth !== 1.0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (croissance : ×{growth.toFixed(2)}/an)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                  <TableHead className="text-right">Marge Brute</TableHead>
                  <TableHead className="text-right">Charges Fixes</TableHead>
                  <TableHead className="text-right">EBE</TableHead>
                  <TableHead className="text-right">Résultat Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiveYearData.map((y, idx) => (
                  <TableRow
                    key={y.year}
                    className={idx % 2 === 1 ? "bg-muted/5" : ""}
                    data-ocid={`bp-initial.5ans.item.${idx + 1}`}
                  >
                    <TableCell className="font-medium">{y.year}</TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {fmtEur(y.ca)}
                    </TableCell>
                    <TableCell className="text-right">{fmtEur(y.mb)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmtEur(y.charges)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtEur(y.ebe)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        y.rn >= 0 ? "text-green-400" : "text-destructive"
                      }`}
                    >
                      {fmtEur(y.rn)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-muted/40 border-t-2 font-bold">
                  <TableCell className="font-bold">TOTAL 5 ANS</TableCell>
                  <TableCell className="text-right text-primary">
                    {fmtEur(cinqAnsCA)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtEur(fiveYearData.reduce((s, y) => s + y.mb, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtEur(fiveYearData.reduce((s, y) => s + y.charges, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtEur(fiveYearData.reduce((s, y) => s + y.ebe, 0))}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      cinqAnsRN >= 0 ? "text-green-400" : "text-destructive"
                    }`}
                  >
                    {fmtEur(cinqAnsRN)}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
