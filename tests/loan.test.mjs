import test from "node:test";
import assert from "node:assert/strict";
import { tableauEmprunt, mensualiteConstante, interetsTotauxTableau, soldesAnnuels } from "../src/core/utils/loanCalculations.js";
const near = (actual, expected, tolerance=0.01) => assert.ok(Math.abs(actual-expected) <= tolerance, `${actual} != ${expected}`);
test("100 000 €, 5 %, 7 ans sans différé : mensualité constante et solde nul", () => {
 const rows=tableauEmprunt(100000,5,84,0); assert.equal(rows.length,84);
 near(mensualiteConstante(100000,5,84),1413.39,0.01);
 near(rows[0].mensualite,rows[83].mensualite); near(rows.at(-1).capitalFin,0);
 near(rows[0].interets,416.6666667); assert.ok(rows[0].capitalRembourse>0);
 near(interetsTotauxTableau(rows),18724.84,0.02); assert.equal(soldesAnnuels(rows).length,7);
});
test("100 000 €, 5 %, 7 ans avec 6 mois de différé : intérêts seuls puis annuité", () => {
 const rows=tableauEmprunt(100000,5,84,6); assert.equal(rows.length,90);
 for (const r of rows.slice(0,6)) { assert.equal(r.differe,true); near(r.mensualite,416.6666667); near(r.capitalFin,100000); near(r.capitalRembourse,0); }
 near(rows[6].mensualite,1413.39,0.01); near(rows[6].capitalDebut,100000); near(rows.at(-1).capitalFin,0);
 near(interetsTotauxTableau(rows),21224.84,0.02); assert.equal(soldesAnnuels(rows).length,8);
});
test("taux zéro et durée invalide", () => { near(mensualiteConstante(1200,0,12),100); assert.deepEqual(tableauEmprunt(1000,2,0),[]); });
