/** Validation lisible des champs d'un emprunt avant appel au stockage. */
export function validateEmpruntForm(form) {
  const errors = {};
  if (!form.nom?.trim()) errors.nom = "Indiquez le nom de cet emprunt.";
  if (!(Number(form.montantStr) > 0)) errors.montantStr = "Le montant doit être supérieur à 0 €.";
  if (!Number.isFinite(Number(form.tauxStr)) || Number(form.tauxStr) < 0) errors.tauxStr = "Saisissez un taux annuel positif ou nul.";
  if (!(Number(form.dureeStr) > 0) || !Number.isInteger(Number(form.dureeStr))) errors.dureeStr = "Choisissez une durée supérieure à 0 mois.";
  if (!form.dateDebut) errors.dateDebut = "Indiquez la date de début du prêt.";
  if (Number(form.differeStr) < 0 || !Number.isFinite(Number(form.differeStr)) || !Number.isInteger(Number(form.differeStr))) errors.differeStr = "Le différé doit être un nombre de mois positif ou nul.";
  if (form.bienActif) {
    if (!form.bienNom?.trim()) errors.bienNom = "Indiquez le nom du bien financé.";
    if (!(Number(form.bienValeur) > 0)) errors.bienValeur = "La valeur du bien doit être supérieure à 0 €.";
    if (!(Number(form.bienDureeAns) > 0) || !Number.isFinite(Number(form.bienDureeAns))) errors.bienDureeAns = "La durée d'amortissement doit être supérieure à 0 an.";
    if (!form.dateMiseService) errors.dateMiseService = "Indiquez la date de mise en service.";
  }
  return errors;
}

/** JSON.stringify ne gère pas BigInt (durées ICP) : convertit les entiers en texte pour les logs. */
export function stringifyEmpruntPayload(payload) {
  return JSON.stringify(payload, (_key, value) => typeof value === "bigint" ? value.toString() : value);
}
