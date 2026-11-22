import test from "node:test";
import assert from "node:assert/strict";
import { tableauEmprunt, interetsTotauxTableau, soldesAnnuels } from "../src/core/utils/loanCalculations.js";
import { dotationsLineairesProrata, normalizeDureeMois } from "../src/core/utils/depreciation.js";
const near=(a,b,t=0.02)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
test("échéancier V2.0b1 cohérent sans différé",()=>{const r=tableauEmprunt(100000,5,84,0);assert.equal(r.length,84);near(interetsTotauxTableau(r),18724.84);near(soldesAnnuels(r).reduce((a,x)=>a+x.interets,0),interetsTotauxTableau(r));near(r.at(-1).capitalFin,0);});
test("échéancier V2.0b1 cohérent avec 6 mois de différé",()=>{const r=tableauEmprunt(100000,5,84,6);assert.equal(r.length,90);near(interetsTotauxTableau(r),21224.84);assert.ok(r.slice(0,6).every(x=>x.differe&&x.capitalFin===100000));near(soldesAnnuels(r).reduce((a,x)=>a+x.interets,0),interetsTotauxTableau(r));near(r.at(-1).capitalFin,0);});
test("bien linéaire 100000€, 5 ans démarré en janvier: somme exacte",()=>{const r=dotationsLineairesProrata(100000,60,1);near(r.reduce((a,b)=>a+b,0),100000,1e-9);near(r[0],20000);});
test("bien linéaire 100000€, 7 ans démarré en juillet: aucun reste amorti",()=>{const r=dotationsLineairesProrata(100000,84,7);near(r.reduce((a,b)=>a+b,0),100000,1e-9);near(100000-r.reduce((a,b)=>a+b,0),0,1e-9);assert.equal(r.length,8);});

test("les champs d’un emprunt historique manquants restent facultatifs",()=>{
 const legacy={id:"old-1",nom:"Prêt historique",montant:12000,tauxAnnuel:3,dureeMois:60n,dateDebut:"2024-01-01",differeMois:0n};
 assert.equal(legacy.bienAmortissable,undefined);
 const rows=tableauEmprunt(Number(legacy.montant)||0,Number(legacy.tauxAnnuel)||0,Number(legacy.dureeMois)||0,Number(legacy.differeMois)||0);
 assert.equal(rows.length,60); assert.equal(rows.at(-1).capitalFin,0);
});
test("création d’un emprunt et d’un bien associé donne une projection amortissable",()=>{
 const bien={id:"asset-1",nom:"Four professionnel",coutTotal:12000,dureeMois:60n,dateMiseService:"2026-01-01",empruntLieId:"loan-1"};
 const dotations=dotationsLineairesProrata(bien.coutTotal,Number(bien.dureeMois),1);
 assert.equal(bien.empruntLieId,"loan-1"); assert.equal(dotations.length,5); near(dotations.reduce((a,b)=>a+b,0),12000,1e-9);
});

import { validateEmpruntForm, stringifyEmpruntPayload } from "../src/core/utils/loanFormValidation.js";
test("formulaire emprunt: un prêt sans bien amortissable est valide",()=>{
 const errors=validateEmpruntForm({nom:"Prêt cuisine",montantStr:"25000",tauxStr:"3.5",dureeStr:"60",dateDebut:"2026-01-01",differeStr:"0",bienActif:false});
 assert.deepEqual(errors,{});
});
test("formulaire emprunt: champs manquants du bien visibles seulement si activé",()=>{
 const base={nom:"Prêt cuisine",montantStr:"25000",tauxStr:"3.5",dureeStr:"60",dateDebut:"2026-01-01",differeStr:"0"};
 assert.deepEqual(validateEmpruntForm({...base,bienActif:false}),{});
 const errors=validateEmpruntForm({...base,bienActif:true});
 assert.ok(errors.bienNom && errors.bienValeur && errors.bienDureeAns && errors.dateMiseService);
});
test("formulaire emprunt: les champs requis du prêt affichent des erreurs",()=>{
 const errors=validateEmpruntForm({nom:"",montantStr:"0",tauxStr:"-1",dureeStr:"0",dateDebut:"",differeStr:"-1",bienActif:false});
 assert.deepEqual(Object.keys(errors).sort(),["dateDebut","differeStr","dureeStr","montantStr","nom","tauxStr"].sort());
});

test("journaliser un emprunt avec des durées BigInt ne bloque plus sa sauvegarde",()=>{
 const payload={nom:"Prêt",dureeMois:60n,differeMois:0n};
 assert.equal(stringifyEmpruntPayload(payload),'{"nom":"Prêt","dureeMois":"60","differeMois":"0"}');
});

test("bien 10 000 € sur 60 mois démarré en janvier: 2 000 € sur cinq ans",()=>{
 const r=dotationsLineairesProrata(10000,60,1); assert.equal(r.length,5);
 for(const x of r) near(x,2000); near(r.reduce((a,b)=>a+b,0),10000,1e-9);
});
test("bien 10 000 € sur 60 mois démarré en juillet: prorata, cinq ans pleins et solde",()=>{
 const r=dotationsLineairesProrata(10000,60,7); assert.equal(r.length,6);
 near(r[0],1000); for(const x of r.slice(1,5)) near(x,2000); near(r[5],1000);
 near(r.reduce((a,b)=>a+b,0),10000,1e-9);
});
test("migration des durées historiques en années sans convertir les mois",()=>{
 assert.equal(normalizeDureeMois(5,5),60);
 assert.equal(normalizeDureeMois(60,5),60);
 assert.equal(normalizeDureeMois(60,0),60);
 assert.equal(normalizeDureeMois(7,0),84);
});
