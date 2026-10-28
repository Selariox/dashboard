/* Utilitaires et import/export CSV */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const eur=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const COLS=[['id','id_projet'],['date','date'],['programme','programme'],['dispositif','dispositif'],['call','Call'],['role','Rôle'],['labo','laboratoire'],['contact','contact'],['mail','mail'],['statut','statut du projet'],['montant','montant (€)']];
const REQUIRED=COLS.slice(0,10);
const ALIAS={idprojet:'id',id:'id',date:'date',programme:'programme',dispositif:'dispositif',call:'call',role:'role',laboratoire:'labo',labo:'labo',contact:'contact',mail:'mail',email:'mail',statutduprojet:'statut',statut:'statut',montant:'montant',budget:'montant'};
const LAB={depose:'Déposé',accepte:'Accepté',refuse:'Refusé',autre:'Autre'},ORDER=['accepte','depose','refuse','autre'];
const cat=s=>{const n=norm(s);if(/refus|rejet|nonretenu|echec/.test(n))return'refuse';if(/accept|financ|retenu|laureat/.test(n))return'accepte';if(/depos|soumis|evaluation|encours|instruction/.test(n))return'depose';return'autre'};
const year=r=>r.date?r.date.slice(0,4):'N/D';
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

