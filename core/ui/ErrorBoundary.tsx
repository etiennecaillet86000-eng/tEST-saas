import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

/** Présente un message explicite si une erreur de rendu React survient. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur d’affichage de l’application", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="m-6 rounded-lg border border-destructive/40 bg-card p-6 text-foreground">
          <h1 className="text-lg font-semibold">Cette page n’a pas pu s’afficher</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Une erreur est survenue pendant l’affichage. Rechargez la page. Si le problème persiste,
            exportez vos données avant de contacter l’assistance.
          </p>
          <button type="button" className="mt-4 rounded-md border px-3 py-2 text-sm" onClick={() => this.setState({ hasError: false })}>
            Réessayer
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
