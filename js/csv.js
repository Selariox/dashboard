/* Constantes, utilitaires et import/export CSV */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const eur=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const STATUTS=['Brouillon','En préparation','Déposé','Présélectionné','Liste complémentaire','Accepté','Refusé','Retiré'];
/* Catégories de champs : modifiez ici pour ajouter ou renommer un champ (puis la base, voir sql/) */
const GROUPS=[
 ['Identification',[['id','N° du projet'],['acronyme','Acronyme'],['eotp','N° EOTP (si accepté)'],['titre','Titre']]],
 ['Programme',[['programme','Programme'],['dispositif','Dispositif'],['call','Call'],['role','Rôle']]],
 ['Équipe',[['labo','Laboratoire'],['contact','Contact'],['mail','Mail']]],
 ['Dépôt et financement',[['date_limite','Date limite de dépôt'],['date','Date de dépôt'],['statut','Statut'],['montant','Budget (€)']]],
 ['Suivi',[['prochaine_action','Prochaine action'],['echeance','Échéance de l’action'],['date_decision','Date de décision'],['notes','Notes']]]];
const COLS=GROUPS.flatMap(g=>g[1]),FIELDS=COLS.map(c=>c[0]);
const DATES=['date_limite','date','echeance','date_decision'];
const CSVH={id:'id_projet',date:'date_depot',call:'Call',role:'Rôle',labo:'laboratoire',statut:'statut du projet',montant:'budget',echeance:'echeance_action'};
const REQUIRED=['id','date','programme','dispositif','call','role','labo','contact','mail','statut'];
const ALIAS={idprojet:'id',id:'id',acronyme:'acronyme',eotp:'eotp',neotp:'eotp',noeotp:'eotp',titre:'titre',programme:'programme',dispositif:'dispositif',call:'call',role:'role',laboratoire:'labo',labo:'labo',contact:'contact',mail:'mail',email:'mail',datelimite:'date_limite',datelimitededepot:'date_limite',date:'date',datedepot:'date',datededepot:'date',statutduprojet:'statut',statut:'statut',montant:'montant',budget:'montant',prochaineaction:'prochaine_action',echeance:'echeance',echeanceaction:'echeance',datedecision:'date_decision',notes:'notes',commentaires:'notes'};
const LAB={prep:'En préparation',depose:'En évaluation',accepte:'Accepté',refuse:'Refusé',retire:'Retiré',autre:'Autre'},ORDER=['accepte','depose','prep','refuse','retire','autre'];
const cat=s=>{const n=norm(s);if(/refus|rejet|nonretenu|echec/.test(n))return'refuse';if(/accept|financ|retenu|laureat/.test(n))return'accepte';if(/retire|abandon/.test(n))return'retire';if(/brouillon|preparation/.test(n))return'prep';if(/depos|soumis|preselect|complementaire|evaluation|instruction/.test(n))return'depose';return'autre'};
const year=r=>(r.date||r.date_limite||'N/D').slice(0,4);
const fmtDate=d=>d?d.split('-').reverse().join('/'):'—';

/* ---------- CSV ---------- */
function parseCSV(t){t=t.replace(/^\uFEFF/,'');const first=t.split(/\r?\n/)[0];
 const d=[';',',','\t'].map(x=>[x,first.split(x).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const out=[];let row=[],f='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
  else if(c=='"')q=true;else if(c==d){row.push(f);f=''}
  else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);out.push(row);row=[];f=''}else f+=c}
 if(f||row.length){row.push(f);out.push(row)}
 return out.filter(r=>r.some(x=>x.trim()))}
function parseDate(s){s=String(s||'').trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return`${m[1]}-${m[2].padStart(2,0)}-${m[3].padStart(2,0)}`;
 m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);return m?`${m[3]}-${m[2].padStart(2,0)}-${m[1].padStart(2,0)}`:''}
function parseNum(s){s=String(s||'').replace(/[\s\u00a0€]/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');return parseFloat(s)||0}
function toCSV(head,lines){const q=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v)&&isNaN(v))v="'"+v;return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};return '\uFEFF'+[head,...lines].map(l=>l.map(q).join(';')).join('\r\n')}
function download(name,txt){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

