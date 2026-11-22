/**
 * Projections.tsx — Finance > Projections Financières
 *
 * 5 sub-tabs:
 *   1. Paramétrage         — CENTRAL CONFIG (single source of truth for all params)
 *   2. Business Plan Réel  — Real sales projection
 *   3. Business Initial    — Fully automated simulation
 *   4. Rentabilité Mix Produit — Category mix P&L
 *   5. Capacité d'Autofinancement — CAF & correlation
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Component, type ReactNode } from "react";
import TabBusinessPlanReel from "./projections/TabBusinessPlanReel";
import TabCAF from "./projections/TabCAF";
import TabParametrage from "./projections/TabParametrage";
import TabRentabiliteMixProduit from "./projections/TabRentabiliteMixProduit";

// ── Top-level error boundary so a sub-tab crash never blacks out the whole page
class TabErrorBoundary extends Component<
  { children: ReactNode; tabName: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidUpdate(prevProps: { children: ReactNode; tabName: string }) {
    // Reset error state when the tab content changes (parent re-mounts with different children)
    if (prevProps.tabName !== this.props.tabName && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-muted-foreground text-sm">
            Une erreur s&apos;est produite dans l&apos;onglet{" "}
            <strong>{this.props.tabName}</strong>.
          </p>
          <button
            type="button"
            className="text-xs text-primary underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Projections() {
  return (
    <div className="space-y-6" data-ocid="projections.page">
      <div>
        <h2 className="text-lg font-semibold">
          Finance — Projections Financières
        </h2>
        <p className="text-sm text-muted-foreground">
          Paramétrez une fois, consultez partout — toutes les projections
          utilisent le même paramétrage central.
        </p>
      </div>

      <Tabs
        defaultValue="parametrage"
        className="space-y-6"
        data-ocid="projections.tabs"
      >
        <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/40 p-1">
          <TabsTrigger
            value="parametrage"
            className="flex-1 min-w-[120px]"
            data-ocid="projections.tab.parametrage"
          >
            ⚙ Paramétrage
          </TabsTrigger>
          <TabsTrigger
            value="bp-reel"
            className="flex-1 min-w-[140px]"
            data-ocid="projections.tab.bp-reel"
          >
            Business Plan Réel
          </TabsTrigger>
          <TabsTrigger
            value="rentabilite-mix"
            className="flex-1 min-w-[160px]"
            data-ocid="projections.tab.rentabilite-mix"
          >
            Rentabilité Mix Produit
          </TabsTrigger>
          <TabsTrigger
            value="caf"
            className="flex-1 min-w-[180px]"
            data-ocid="projections.tab.caf"
          >
            Capacité d&apos;Autofinancement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parametrage">
          <TabErrorBoundary tabName="Paramétrage">
            <TabParametrage />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="bp-reel">
          <TabErrorBoundary tabName="Business Plan Réel">
            <TabBusinessPlanReel />
          </TabErrorBoundary>
        </TabsContent>


        <TabsContent value="rentabilite-mix">
          <TabErrorBoundary tabName="Rentabilité Mix Produit">
            <TabRentabiliteMixProduit />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="caf">
          <TabErrorBoundary tabName="Capacité d'Autofinancement">
            <TabCAF />
          </TabErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
