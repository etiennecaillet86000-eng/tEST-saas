export const TAX_RATES_KEY = "gestion_resto_taux_fiscaux_v2";
export const DEFAULT_TAX_RATES = { tns:45, assimileSalarie:42, chargesSalariales:22, patronalesSalaries:42, isReduit:15, isNormal:25, ir:30, flatTaxDividendes:12.8, prelevementsSociaux:17.2, seuilIsReduit:42500 };
export type TaxRates = typeof DEFAULT_TAX_RATES;
export function getTaxRates(): TaxRates { try { const v=JSON.parse(localStorage.getItem(TAX_RATES_KEY)||"{}"); return {...DEFAULT_TAX_RATES,...v}; } catch { return DEFAULT_TAX_RATES; } }
export function calcTnsCharges(remu:number,rates=getTaxRates()){return remu*rates.tns/100;}
export function calcEmployerCharges(brut:number,rates=getTaxRates()){return brut*rates.patronalesSalaries/100;}
export function calculateIS(profit:number,rates=getTaxRates()){const p=Math.max(0,profit);return Math.min(p,rates.seuilIsReduit)*rates.isReduit/100+Math.max(0,p-rates.seuilIsReduit)*rates.isNormal/100;}
export function distributeDividends(total:number,owners:{partsCapital?:number}[]){return owners.map(o=>total*(Number(o.partsCapital)||0)/100);}
export function capitalSharesValid(owners:{partsCapital?:number}[]){return Math.abs(owners.reduce((s,o)=>s+(Number(o.partsCapital)||0),0)-100)<0.005;}
