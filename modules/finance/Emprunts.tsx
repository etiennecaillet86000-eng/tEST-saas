import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tableauEmprunt, soldesAnnuels } from "@/core/utils/loanCalculations.js";
import { validateEmpruntForm } from "@/core/utils/loanFormValidation.js";
import {
  calcMensualite,
  capitalRestantApresNMois,
  coutTotalEmprunt,
  totalInterets,
} from "@/core/utils/finance";
import {
  type Emprunt,
  useCreateEmprunt,
  useDeleteEmprunt,
  useCreateAmortissement,
  useEmprunts,
  useUpdateEmprunt,
} from "@/hooks/useQueries";
import { fmtEur } from "@/utils/format";
import {
  ChevronDown,
  ChevronRight,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────────────
interface LignTableau {
  mois: number;
  differe?: boolean;
  capitalDebut: number;
  mensualite: number;
  interets: number;
  capitalRembourse: number;
  capitalFin: number;
}

interface EmpruntForm {
  nom: string;
  montantStr: string;
  tauxStr: string;
  dureeStr: string;
  dateDebut: string;
  differeStr: string;
  bienActif: boolean; bienNom: string; bienValeur: string; dateMiseService: string; bienDureeAns: string; amortissementLieId: string;
  typeEmprunt: string; bienCategorie: string; methodeAmortissement: string;
}

const emptyForm = (): EmpruntForm => ({
  nom: "",
  montantStr: "",
  tauxStr: "0",
  dureeStr: "60",
  dateDebut: new Date().toISOString().slice(0, 10),
  differeStr: "0", bienActif: false, bienNom: "", bienValeur: "", dateMiseService: new Date().toISOString().slice(0,10), bienDureeAns: "5", amortissementLieId: "", typeEmprunt: "Professionnel", bienCategorie: "Équipement de cuisine", methodeAmortissement: "Linéaire",
});

function formFromEmprunt(e: Emprunt): EmpruntForm {
  return {
    nom: e.nom ?? "",
    montantStr: Number(e.montant) > 0 ? String(e.montant) : "",
    tauxStr: Number(e.tauxAnnuel) >= 0 ? String(e.tauxAnnuel) : "0",
    dureeStr: Number(e.dureeMois) > 0 ? String(Number(e.dureeMois)) : "",
    dateDebut: e.dateDebut ?? new Date().toISOString().slice(0, 10),
    differeStr: String(Math.max(0, Number(e.differeMois) || 0)),
    bienActif: !!e.bienAmortissable,
    bienNom: e.bienNom ?? "",
    bienValeur: Number(e.bienValeur) > 0 ? String(e.bienValeur) : "",
    dateMiseService: e.dateMiseService || e.dateDebut || new Date().toISOString().slice(0, 10),
    bienDureeAns: Number(e.bienDureeAns) > 0 ? String(e.bienDureeAns) : "5",
    typeEmprunt: e.typeEmprunt ?? "Professionnel", bienCategorie: e.bienCategorie ?? "Équipement de cuisine",
    amortissementLieId: e.amortissementLieId ?? "",
    methodeAmortissement: "Linéaire",
  };
}

// ── Local amortization table calculation ───────────────────────────────────────

function buildTableau(emprunt: Emprunt): LignTableau[] {
  const montant = Number(emprunt.montant) || 0;
  const taux = Number(emprunt.tauxAnnuel) || 0;
  const duree = Number(emprunt.dureeMois) || 0;
  const differe = Number(emprunt.differeMois) || 0;
  return tableauEmprunt(montant, taux, duree, differe);
}

const SKELETON_ROWS = [0, 1, 2];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Emprunts() {
  const { data: empruntsData, isLoading } = useEmprunts();
  // Les anciennes sauvegardes peuvent contenir des champs ajoutés en V2.0b2 absents.
  const emprunts = Array.isArray(empruntsData) ? empruntsData : [];
  const createMut = useCreateEmprunt();
  const updateMut = useUpdateEmprunt();
  const deleteMut = useDeleteEmprunt();
  const createAmortMut=useCreateAmortissement();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Emprunt | null>(null);
  const [form, setForm] = useState<EmpruntForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mensualitePreview = calcMensualite(
    Number.parseFloat(form.montantStr) || 0,
    Number.parseFloat(form.tauxStr) || 0,
    Number.parseInt(form.dureeStr) || 0,
  );

  // KPI aggregates
  const kpis = useMemo(() => {
    const totalMensuel = emprunts.reduce(
      (s, e) =>
        s + calcMensualite(Number(e.montant) || 0, Number(e.tauxAnnuel) || 0, Number(e.dureeMois) || 0),
      0,
    );
    const totalCapital = emprunts.reduce((s, e) => s + (Number(e.montant) || 0), 0);
    const totalInteretsCumul = emprunts.reduce(
      (s, e) => s + totalInterets(e),
      0,
    );
    const totalCout = emprunts.reduce((s, e) => s + coutTotalEmprunt(e), 0);
    return { totalMensuel, totalCapital, totalInteretsCumul, totalCout };
  }, [emprunts]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setOpen(true);
  }

  function openEdit(e: Emprunt) {
    setEditing(e);
    setForm(formFromEmprunt(e));
    setErrors({});
    setOpen(true);
  }

  async function handleSave() {
    const nextErrors = validateEmpruntForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    const montant = Number.parseFloat(form.montantStr) || 0;
    const tauxAnnuel = Number.parseFloat(form.tauxStr) || 0;
    const dureeMois = BigInt(Math.max(0, Number.parseInt(form.dureeStr) || 0));
    const differeMois = BigInt(Math.max(0, Number.parseInt(form.differeStr) || 0));
    const bienValeur = Number(form.bienValeur) || 0;
    const bienDureeAns = Number(form.bienDureeAns) || 0;
    const payload = {
      nom: form.nom,
      montant,
      tauxAnnuel,
      dureeMois,
      dateDebut: form.dateDebut,
      differeMois,
      bienAmortissable: form.bienActif,
      bienNom: form.bienNom,
      bienValeur,
      dateMiseService: form.dateMiseService || form.dateDebut,
      bienDureeAns,
      typeEmprunt: form.typeEmprunt,
      bienCategorie: form.bienCategorie,
      amortissementLieId: form.amortissementLieId || undefined,
    };
    try {
      let saved: Emprunt;
      if (editing) {
        await updateMut.mutateAsync({ ...editing, ...payload });
        saved = { ...editing, ...payload };
        toast.success("Emprunt mis à jour");
      } else {
        saved = await createMut.mutateAsync(payload);
        toast.success("Emprunt créé");
      }

      // Liaison souple : les prêts historiques restent valides, et un bien n'est
      // créé que si l'utilisateur a activé l'option et renseigné ses données.
      if (form.bienActif && bienValeur > 0 && bienDureeAns > 0 && !saved.amortissementLieId) {
        const bien = await createAmortMut.mutateAsync({
          nom: form.bienNom || form.nom,
          coutTotal: bienValeur,
          dureeMois: BigInt(Math.round(bienDureeAns * 12)),
          dateMiseService: form.dateMiseService || form.dateDebut,
          methode: form.methodeAmortissement,
          empruntLieId: saved.id,
        });
        const linked = { ...saved, ...payload, amortissementLieId: bien.id };
        await updateMut.mutateAsync(linked);
      }
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Erreur : ${msg}`);
    }
  }

  async function handleDelete(id: string) {
    const emprunt=emprunts.find(e=>e.id===id);
    if(!window.confirm(emprunt?.amortissementLieId ? "Supprimer cet emprunt supprimera aussi le bien amortissable lié. Continuer ?" : "Supprimer cet emprunt ?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Emprunt supprimé");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Erreur : ${msg}`);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const set =
    (k: keyof EmpruntForm) => (ev: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [k]: ev.target.value }));
      setErrors((e) => ({ ...e, [k]: "" }));
    };
  const fieldError = (key: keyof EmpruntForm) => errors[key] ? <p className="text-xs text-destructive" role="alert">{errors[key]}</p> : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Emprunts</h2>
          <p className="text-sm text-muted-foreground">
            Suivi des emprunts bancaires et mensualités
          </p>
        </div>
        <Button onClick={openAdd} data-ocid="emprunts.open_modal_button">
          <Plus className="mr-2 h-4 w-4" /> Ajouter
        </Button>
      </div>

      {/* KPI cards */}
      {emprunts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Total mensualités
              </p>
              <p className="text-xl font-bold text-primary">
                {fmtEur(kpis.totalMensuel)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Capital total
              </p>
              <p className="text-xl font-bold">{fmtEur(kpis.totalCapital)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Intérêts cumulés
              </p>
              <p className="text-xl font-bold text-destructive">
                {fmtEur(kpis.totalInteretsCumul)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Coût total</p>
              <p className="text-xl font-bold">{fmtEur(kpis.totalCout)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {SKELETON_ROWS.map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : emprunts.length === 0 ? (
        <div
          className="rounded-lg border bg-card p-10 text-center text-muted-foreground"
          data-ocid="emprunts.empty_state"
        >
          <Landmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">Aucun emprunt enregistré</p>
          <p className="text-xs">
            Ajoutez vos prêts bancaires pour suivre vos mensualités.
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-3">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Tableau des emprunts
              <Badge variant="secondary">
                {emprunts.length} emprunt{emprunts.length > 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-8" />
                    <TableHead className="min-w-[160px]">Nom</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">Taux annuel</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                    <TableHead>Date début</TableHead>
                    <TableHead className="text-right">Mensualité</TableHead>
                    <TableHead className="text-right">
                      Intérêts totaux
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emprunts.map((e, idx) => {
                    const mensualite = calcMensualite(
                      e.montant,
                      e.tauxAnnuel,
                      Number(e.dureeMois),
                    );
                    const interetsTotaux = totalInterets(e);
                    const isExpanded = expandedId === e.id;
                    const tableau = isExpanded ? buildTableau(e) : [];
                    const annuelles = isExpanded ? soldesAnnuels(tableau) : [];

                    return (
                      <Fragment key={e.id}>
                        <TableRow
                          key={e.id}
                          data-ocid={`emprunts.item.${idx + 1}`}
                          className="cursor-pointer hover:bg-muted/20"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : e.id)
                          }
                        >
                          <TableCell className="w-8 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{e.nom}</TableCell>
                          <TableCell className="text-right">
                            {fmtEur(e.montant)}
                          </TableCell>
                          <TableCell className="text-right">
                            {e.tauxAnnuel} %
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(e.dureeMois)} mois
                          </TableCell>
                          <TableCell className="text-sm">
                            {e.dateDebut}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {fmtEur(mensualite)}
                          </TableCell>
                          <TableCell className="text-right text-destructive text-sm">
                            {fmtEur(interetsTotaux)}
                          </TableCell>
                          <TableCell onClick={(ev) => ev.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(e)}
                                data-ocid={`emprunts.edit_button.${idx + 1}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(e.id)}
                                data-ocid={`emprunts.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable amortization table */}
                        {isExpanded && (
                          <TableRow
                            key={`${e.id}-expanded`}
                            className="bg-muted/10"
                          >
                            <TableCell colSpan={9} className="p-0">
                              <div className="border-t border-border/50 p-3">
                                <p className="mb-2 text-sm font-semibold">Soldes et intérêts annuels</p>
                                <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Année</TableHead><TableHead className="text-right">Capital début</TableHead><TableHead className="text-right">Intérêts</TableHead><TableHead className="text-right">Capital remboursé</TableHead><TableHead className="text-right">Capital fin</TableHead></TableRow></TableHeader><TableBody>{annuelles.map(y=><TableRow key={y.annee}><TableCell>{y.annee}</TableCell><TableCell className="text-right">{fmtEur(y.capitalDebut)}</TableCell><TableCell className="text-right">{fmtEur(y.interets)}</TableCell><TableCell className="text-right">{fmtEur(y.capitalRembourse)}</TableCell><TableCell className="text-right">{fmtEur(y.capitalFin)}</TableCell></TableRow>)}</TableBody></Table></div>
                              </div>
                              <div className="overflow-x-auto border-t border-border/50">
                                <p className="px-3 pt-3 text-sm font-semibold">Échéancier mensuel {Number(e.differeMois) > 0 ? `· ${Number(e.differeMois)} mois de différé en intérêts seuls` : ""}</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/20 text-xs">
                                      <TableHead className="py-2">
                                        Mois
                                      </TableHead>
                                      <TableHead className="text-right py-2">
                                        Capital début
                                      </TableHead>
                                      <TableHead className="text-right py-2">
                                        Mensualité
                                      </TableHead>
                                      <TableHead className="text-right py-2">
                                        Intérêts
                                      </TableHead>
                                      <TableHead className="text-right py-2">
                                        Capital remboursé
                                      </TableHead>
                                      <TableHead className="text-right py-2">
                                        Capital fin
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tableau.map((l) => (
                                      <TableRow
                                        key={l.mois}
                                        className="text-xs hover:bg-transparent"
                                      >
                                        <TableCell className="py-1.5 font-medium">
                                          {l.mois}{l.differe ? " · différé" : ""}
                                        </TableCell>
                                        <TableCell className="text-right py-1.5">
                                          {fmtEur(l.capitalDebut)}
                                        </TableCell>
                                        <TableCell className="text-right py-1.5 text-primary">
                                          {fmtEur(l.mensualite)}
                                        </TableCell>
                                        <TableCell className="text-right py-1.5 text-destructive">
                                          {fmtEur(l.interets)}
                                        </TableCell>
                                        <TableCell className="text-right py-1.5">
                                          {fmtEur(l.capitalRembourse)}
                                        </TableCell>
                                        <TableCell className="text-right py-1.5">
                                          {fmtEur(l.capitalFin)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-ocid="emprunts.dialog" className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>{editing ? "Modifier l'emprunt" : "Nouvel emprunt"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Les champs marqués d’un * sont obligatoires.</p>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <section className="space-y-3">
              <div><h3 className="font-semibold">Infos du prêt</h3><p className="text-xs text-muted-foreground">Les informations principales utilisées pour calculer les échéances.</p></div>
              <div className="grid gap-1.5"><Label htmlFor="loan-name">Nom de l'emprunt *</Label><Input id="loan-name" placeholder="Ex. Prêt matériel de cuisine" value={form.nom} onChange={set("nom")} aria-invalid={!!errors.nom} />{fieldError("nom")}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5"><Label>Type d'emprunt</Label><Select value={form.typeEmprunt} onValueChange={v=>setForm(f=>({...f,typeEmprunt:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Professionnel">Prêt professionnel</SelectItem><SelectItem value="Matériel">Prêt matériel</SelectItem><SelectItem value="Immobilier">Prêt immobilier</SelectItem><SelectItem value="Trésorerie">Prêt de trésorerie</SelectItem><SelectItem value="Autre">Autre</SelectItem></SelectContent></Select></div>
                <div className="grid gap-1.5"><Label htmlFor="loan-start">Date de début *</Label><Input id="loan-start" type="date" value={form.dateDebut} onChange={set("dateDebut")} aria-invalid={!!errors.dateDebut} />{fieldError("dateDebut")}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5"><Label htmlFor="loan-amount">Montant emprunté (€) *</Label><Input id="loan-amount" type="number" min="0.01" step="0.01" placeholder="Ex. 25 000" value={form.montantStr} onChange={set("montantStr")} aria-invalid={!!errors.montantStr} />{fieldError("montantStr")}</div>
                <div className="grid gap-1.5"><Label htmlFor="loan-rate">Taux annuel (%) *</Label><Input id="loan-rate" type="number" min="0" step="0.01" value={form.tauxStr} onChange={set("tauxStr")} aria-invalid={!!errors.tauxStr} />{fieldError("tauxStr")}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5"><Label>Durée de remboursement *</Label><Select value={form.dureeStr} onValueChange={v=>{setForm(f=>({...f,dureeStr:v}));setErrors(e=>({...e,dureeStr:""}));}}><SelectTrigger aria-invalid={!!errors.dureeStr}><SelectValue placeholder="Choisir une durée" /></SelectTrigger><SelectContent>{[12,24,36,48,60,72,84,96,120,144,180,240,300,360].map(m=><SelectItem key={m} value={String(m)}>{m} mois ({m/12} ans)</SelectItem>)}</SelectContent></Select>{fieldError("dureeStr")}</div>
                <div className="grid gap-1.5"><Label htmlFor="loan-deferral">Différé (mois)</Label><Input id="loan-deferral" type="number" min="0" step="1" value={form.differeStr} onChange={set("differeStr")} aria-invalid={!!errors.differeStr} />{fieldError("differeStr")}</div>
              </div>
            </section>
            <section className="space-y-3 rounded-lg border p-4">
              <div><h3 className="font-semibold">Différé</h3><p className="text-xs text-muted-foreground">Pendant le différé, seuls les intérêts sont payés. Le nombre de mois est ajouté à la durée totale.</p></div>
              <p className="text-sm">Différé actuel : <strong>{Number(form.differeStr) || 0} mois</strong></p>
            </section>
            <section className="space-y-3 rounded-lg border p-4">
              <div><h3 className="font-semibold">Bien financé amortissable</h3><p className="text-xs text-muted-foreground">Facultatif : activez cette option pour retrouver le bien dans l’onglet Amortissements.</p></div>
              <label className="flex cursor-pointer items-start gap-3 text-sm font-medium"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={form.bienActif} onChange={e=>setForm(f=>({...f,bienActif:e.target.checked}))}/>Ce prêt finance un bien amortissable</label>
              {form.bienActif && <div className="space-y-3 border-t pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5"><Label>Catégorie du bien</Label><Select value={form.bienCategorie} onValueChange={v=>setForm(f=>({...f,bienCategorie:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Équipement de cuisine","Matériel de bar","Mobilier","Véhicule","Travaux / aménagement","Matériel informatique","Autre"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-1.5"><Label>Nom du bien *</Label><Input placeholder="Ex. Four professionnel" value={form.bienNom} onChange={set("bienNom")} aria-invalid={!!errors.bienNom} />{fieldError("bienNom")}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5"><Label>Valeur amortissable (€) *</Label><Input type="number" min="0.01" step="0.01" value={form.bienValeur} onChange={set("bienValeur")} aria-invalid={!!errors.bienValeur} />{fieldError("bienValeur")}</div>
                  <div className="grid gap-1.5"><Label>Durée d'amortissement (années) *</Label><Select value={form.bienDureeAns} onValueChange={v=>setForm(f=>({...f,bienDureeAns:v}))}><SelectTrigger aria-invalid={!!errors.bienDureeAns}><SelectValue /></SelectTrigger><SelectContent>{[3,4,5,6,7,8,10,12,15,20].map(y=><SelectItem key={y} value={String(y)}>{y} ans</SelectItem>)}</SelectContent></Select>{fieldError("bienDureeAns")}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5"><Label>Date de mise en service *</Label><Input type="date" value={form.dateMiseService} onChange={set("dateMiseService")} aria-invalid={!!errors.dateMiseService} />{fieldError("dateMiseService")}</div>
                  <div className="grid gap-1.5"><Label>Méthode d'amortissement</Label><Select value={form.methodeAmortissement} onValueChange={v=>setForm(f=>({...f,methodeAmortissement:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Linéaire">Linéaire</SelectItem><SelectItem value="Dégressif">Dégressif</SelectItem></SelectContent></Select></div>
                </div>
              </div>}
            </section>
            {form.montantStr && form.dureeStr && <div className="rounded-md border border-primary/20 bg-primary/10 px-4 py-3 space-y-1"><p className="text-sm font-medium text-primary">Mensualité estimée : {fmtEur(mensualitePreview)}</p><p className="text-xs text-muted-foreground">Coût total estimé : {fmtEur(mensualitePreview * (Number(form.dureeStr) || 0) + (Number(form.montantStr) || 0) * (Number(form.tauxStr) || 0) / 100 / 12 * (Number(form.differeStr) || 0))}</p></div>}
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)} data-ocid="emprunts.cancel_button">Annuler</Button>
            <Button onClick={handleSave} disabled={isPending} data-ocid="emprunts.submit_button">{isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
