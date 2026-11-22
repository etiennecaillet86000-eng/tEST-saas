import { normalizeDureeMois } from "./core/utils/depreciation.js";
import type { backendInterface } from "./backend.d";

export const STORAGE_KEY = "gestion-resto-local-v1";
const AUTO_KEY = "gestion-resto-auto-backup-v1";
const UNDO_KEY = "gestion-resto-undo-v1";
type Store = Record<string, any> & { nextId: number };
const DEFAULTS: Store = {
 nextId:1, ingredients:[], recettes:[], fraisFixes:["Location / aménagement","Equipements Cuisine / bar (Amortissement)","Licences / Assurances","Energie / eau","Communication / marketing","Animation / musique","Salaire / cotisations","Emprunt","Stock boissons / nourritures"].map(nom=>({nom,montantMensuelAvecRemu:0,montantMensuelHorsRemu:0})),
 parametres:{ticketMoyenHT:0,nbClientsParSemaine:0,nbSemainesSaison:24,tauxFoodCostParCategorie:[["Boissons froides (hors alcool)",25],["Sandwichs froids et Wraps",30],["Plats chauds",33],["Desserts maison",30],["Accompagnements",28],["Les formules ou menus",31]]}, joursOuvertureParSemaine:6, mixProduitParCategorie:[], mouvementsStock:[], ventesRecettes:[], emprunts:[], associesGerants:[], salaries:[], parametresJuridiques:{formeJuridique:"EI",regimeFiscal:"IR",regimeSocial:"TNS"}, amortissements:[], familles:[]
};
function normalizeEmprunt(value: any): any {
 if (!value || typeof value !== "object") return null;
 return {
  ...value,
  nom: typeof value.nom === "string" ? value.nom : "Emprunt",
  montant: Number(value.montant) || 0,
  tauxAnnuel: Number(value.tauxAnnuel) || 0,
  dureeMois: BigInt(Math.max(0, Number(value.dureeMois) || 0)),
  differeMois: BigInt(Math.max(0, Number(value.differeMois) || 0)),
  dateDebut: typeof value.dateDebut === "string" ? value.dateDebut : "",
  bienAmortissable: value.bienAmortissable === true,
  bienNom: typeof value.bienNom === "string" ? value.bienNom : "",
  bienValeur: Number(value.bienValeur) || 0,
  dateMiseService: typeof value.dateMiseService === "string" ? value.dateMiseService : (value.dateDebut || ""),
  bienDureeAns: Number(value.bienDureeAns) || 0,
  amortissementLieId: typeof value.amortissementLieId === "string" ? value.amortissementLieId : "",
  typeEmprunt: typeof value.typeEmprunt === "string" ? value.typeEmprunt : "Professionnel",
  bienCategorie: typeof value.bienCategorie === "string" ? value.bienCategorie : "Équipement de cuisine",
 };
}
export function readStore():Store { try {
 const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"); if(!d||typeof d!=="object")return structuredClone(DEFAULTS);
 const emprunts=(Array.isArray(d.emprunts)?d.emprunts:[]).map(normalizeEmprunt).filter(Boolean);
 const mustMigrate=Number(d._amortissementDureeVersion||0)<2;
 const amortissements=(Array.isArray(d.amortissements)?d.amortissements:[]).filter((x:any)=>x&&typeof x==="object").map((x:any)=>{
  const loan=emprunts.find((e:any)=>e.id===x.empruntLieId);
  const duration=mustMigrate?normalizeDureeMois(x.dureeMois,loan?.bienDureeAns):Math.max(0,Number(x.dureeMois)||0);
  if(loan) loan.bienDureeAns=duration/12;
  return {...x,nom:typeof x.nom==="string"?x.nom:"Bien",coutTotal:Number(x.coutTotal)||0,dureeMois:BigInt(duration),dateMiseService:typeof x.dateMiseService==="string"?x.dateMiseService:""};
 });
 const store={...structuredClone(DEFAULTS),...d,_amortissementDureeVersion:2,emprunts,amortissements};
 if(mustMigrate) write(store); // migration unique, clé de stockage historique conservée
 return store;
 } catch { return structuredClone(DEFAULTS); } }
function write(s:Store){const serialized=JSON.stringify(s,(_k,v)=>typeof v==="bigint"?v.toString():v);localStorage.setItem(STORAGE_KEY,serialized);localStorage.setItem(AUTO_KEY,JSON.stringify({savedAt:new Date().toISOString(),data:s}));}
const gets:Record<string,string>={getIngredients:"ingredients",getRecettes:"recettes",getFraisFixes:"fraisFixes",getParametres:"parametres",getJoursOuvertureParSemaine:"joursOuvertureParSemaine",getMixProduitParCategorie:"mixProduitParCategorie",getMouvementsStock:"mouvementsStock",getVentesRecettes:"ventesRecettes",getEmprunts:"emprunts",getAssociesGerants:"associesGerants",getSalaries:"salaries",getParametresJuridiques:"parametresJuridiques",getAmortissements:"amortissements",getFamilles:"familles"};
const domain:Record<string,string>={Ingredient:"ingredients",Recette:"recettes",Mouvement:"mouvementsStock",Vente:"ventesRecettes",Emprunt:"emprunts",AssocieGerant:"associesGerants",Salarie:"salaries",Amortissement:"amortissements"};
const fields:Record<string,string[]>={Ingredient:["nom","unite","prixUnitaireHT","seuilSecurite","stockInitial","famille"],Recette:["nom","categorie","categorieTVA","tauxTVA","ingredients","consommablesHT","prixVenteTTC"],Mouvement:["ingredientId","date","typeOp","quantite","motif"],Vente:["recetteId","date","quantite"],Emprunt:["nom","montant","tauxAnnuel","dureeMois","dateDebut","differeMois","bienAmortissable","bienNom","bienValeur","dateMiseService","bienDureeAns","amortissementLieId","typeEmprunt","bienCategorie"],AssocieGerant:["nom","statut","remunerationAnnuelle","typeAssocie","partsCapital","apportCapital","dividendesAnnuels"],Salarie:["nom","poste","salaireAnnuelBrut"],Amortissement:["nom","coutTotal","dureeMois","dateMiseService","methode","empruntLieId"]};
function actorMethod(method:string,args:any[],s:Store):any {
 if(gets[method])return structuredClone(s[gets[method]]);
 const saves:Record<string,string>={saveFraisFixes:"fraisFixes",saveParametres:"parametres",saveJoursOuvertureParSemaine:"joursOuvertureParSemaine",saveMixProduitParCategorie:"mixProduitParCategorie",saveParametresJuridiques:"parametresJuridiques",setFamilles:"familles"}; if(saves[method]){s[saves[method]]=args[0];return true;}
 for(const [prefix,key] of Object.entries(domain)){if(method===`create${prefix}`){const row:any={id:String(s.nextId++)};fields[prefix].forEach((f,i)=>{const v=args[i];if(v!==null&&v!==undefined)row[f]=v;});s[key].push(row);return row;}if(method===`update${prefix}`){const [id,...values]=args;const i=s[key].findIndex((r:any)=>r.id===id);if(i<0)return false;const row={...s[key][i]};fields[prefix].forEach((f,j)=>{if(values[j]!==null&&values[j]!==undefined)row[f]=values[j];else if(f==="famille")delete row[f];});s[key][i]=row;
 if(prefix==="Emprunt" && row.amortissementLieId){const a=s.amortissements.find((x:any)=>x.id===row.amortissementLieId);if(a){a.nom=row.bienNom||row.nom;a.coutTotal=row.bienValeur??row.montant;a.dureeMois=BigInt(Math.round((row.bienDureeAns||0)*12));a.dateMiseService=row.dateMiseService||row.dateDebut;a.empruntLieId=row.id;}}
 if(prefix==="Amortissement" && row.empruntLieId){const e=s.emprunts.find((x:any)=>x.id===row.empruntLieId);if(e){e.bienNom=row.nom;e.bienValeur=row.coutTotal;e.bienDureeAns=Number(row.dureeMois)/12;e.dateMiseService=row.dateMiseService||e.dateDebut;}}
 return true;}if(method===`delete${prefix}`){localStorage.setItem(UNDO_KEY,JSON.stringify(s));const removed=s[key].find((r:any)=>r.id===args[0]);
 if(prefix==="Emprunt" && removed?.amortissementLieId)s.amortissements=s.amortissements.filter((a:any)=>a.id!==removed.amortissementLieId);
 if(prefix==="Amortissement" && removed?.empruntLieId)s.emprunts=s.emprunts.filter((e:any)=>e.id!==removed.empruntLieId);
 const n=s[key].length;s[key]=s[key].filter((r:any)=>r.id!==args[0]);return s[key].length<n;}}
 if(method==="createVente"){const recette=s.recettes.find((r:any)=>r.id===args[0]);if(!recette)return {__kind__:"err",err:"Recette introuvable"};const row={id:String(s.nextId++),recetteId:args[0],date:args[1],quantite:args[2],moyenPaiement:args[3]||"Non renseigné"};s.ventesRecettes.push(row);return {__kind__:"ok",ok:row};}
 if(method.startsWith("delete")){localStorage.setItem(UNDO_KEY,JSON.stringify(s));}
 throw new Error(`Méthode locale inconnue : ${method}`);
}
export const localActor=new Proxy({}, {get(_t,p){if(typeof p!=="string")return undefined;return async(...args:any[])=>{const s=readStore();const result=actorMethod(p,args,s);write(s);return result;};}}) as backendInterface;
// Compatible signature retained for hooks that previously requested an ICP actor.
export function createActor(..._args:any[]):backendInterface{return localActor;}
export function exportData(){return {format:"gestion-resto-local",version:1,exportedAt:new Date().toISOString(),data:readStore(),auxiliary:{projection:localStorage.getItem("projection-store"),families:localStorage.getItem("ingredient-family-store"),ui:localStorage.getItem("gestion-resto-ui"),infos:localStorage.getItem("gestion_resto_infos_etablissement")}};}
export function undoLastDelete(){const raw=localStorage.getItem(UNDO_KEY);if(!raw)return false;try{write(JSON.parse(raw));localStorage.removeItem(UNDO_KEY);return true;}catch{return false;}}
export function getBackupInfo(){try{return JSON.parse(localStorage.getItem(AUTO_KEY)||"null");}catch{return null;}}
export function importData(obj:any){const data=obj?.format==="gestion-resto-local"?obj.data:obj;if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Fichier JSON non reconnu");const next={...structuredClone(DEFAULTS),...data};for(const key of Object.keys(DEFAULTS))if(key!=="nextId"&&!(key in data))throw new Error(`Champ requis manquant : ${key}`);write(next);const aux=obj?.auxiliary||{};for(const [key,value] of Object.entries({"projection-store":aux.projection,"ingredient-family-store":aux.families,"gestion-resto-ui":aux.ui,"gestion_resto_infos_etablissement":aux.infos}))if(typeof value==="string")localStorage.setItem(key,value);}
