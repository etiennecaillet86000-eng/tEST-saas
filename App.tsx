import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/core/ui/Layout";
import Amortissements from "@/modules/finance/Amortissements";
import BusinessPlan from "@/modules/finance/BusinessPlan";
import BusinessPlanReel from "@/modules/finance/BusinessPlanReel";
import Comptabilite from "@/modules/finance/Comptabilite";
import Emprunts from "@/modules/finance/Emprunts";
import FraisFixes from "@/modules/finance/FraisFixes";
import Marges from "@/modules/finance/Marges";
import Projections from "@/modules/finance/Projections";
import Rentabilite from "@/modules/finance/Rentabilite";
import AssociesGerants from "@/modules/hr/AssociesGerants";
import SalairesCotisations from "@/modules/hr/SalairesCotisations";
import Ingredients from "@/modules/restaurant/Ingredients";
import Dashboard from "@/modules/restaurant/Dashboard";
import Historique from "@/modules/restaurant/Historique";
import VentesRapides from "@/modules/restaurant/VentesRapides";
import Operations from "@/modules/restaurant/Operations";
import Recettes from "@/modules/restaurant/Recettes";
import SimulateurCarte from "@/modules/restaurant/SimulateurCarte";
import Stock from "@/modules/restaurant/Stock";
import ParametresJuridiques from "@/modules/settings/ParametresJuridiques";
import { useEffect, useState } from "react";

type Route =
  | "/"
  | "/dashboard"
  | "/historique"
  | "/ingredients"
  | "/operations"
  | "/recettes"
  | "/simulateur"
  | "/stock"
  | "/ventes"
  | "/salaries"
  | "/associes"
  | "/frais-fixes"
  | "/emprunts"
  | "/amortissements"
  | "/business-plan"
  | "/business-plan-reel"
  | "/comptabilite"
  | "/rentabilite"
  | "/marges"
  | "/projections"
  | "/parametres";

const ROUTES: Record<Route, React.ComponentType> = {
  "/": Dashboard,
  "/dashboard": Dashboard,
  "/historique": Historique,
  "/ventes": VentesRapides,
  "/ingredients": Ingredients,
  "/operations": Operations,
  "/recettes": Recettes,
  "/simulateur": SimulateurCarte,
  "/stock": Stock,
  "/salaries": SalairesCotisations,
  "/associes": AssociesGerants,
  "/frais-fixes": FraisFixes,
  "/emprunts": Emprunts,
  "/amortissements": Amortissements,
  "/business-plan": BusinessPlan,
  "/business-plan-reel": BusinessPlanReel,
  "/comptabilite": Comptabilite,
  "/rentabilite": Rentabilite,
  "/marges": Marges,
  "/projections": Projections,
  "/parametres": ParametresJuridiques,
};

function getRouteFromHash(): Route {
  const hash = window.location.hash.replace("#", "") || "/";
  return (Object.keys(ROUTES).includes(hash) ? hash : "/") as Route;
}

function AppContent() {
  const [route, setRoute] = useState<Route>(getRouteFromHash);

  useEffect(() => {
    function onHashChange() {
      setRoute(getRouteFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const PageComponent = ROUTES[route];

  return (
    <Layout currentRoute={route}>
      <PageComponent />
    </Layout>
  );
}

export default function App() {
  return <AppContent />;
}
