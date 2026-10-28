/* ---------- État & import ---------- */
let rows=[],sort={k:'date',d:-1},editing=null;
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',5000)}
const fail=(e,m='Opération impossible')=>toast(m+' : '+(e&&e.message?e.message:e));
async function start(){try{rows=await dbLoad()}catch(e){rows=[];fail(e,'Chargement impossible')}render()}
async function importText(t){
 if(t.length>5e6){toast('Fichier trop volumineux (5 Mo maximum).');return}
 const T=parseCSV(t);if(T.length<2){toast('Fichier vide ou sans ligne de données.');return}
 const map={};T[0].forEach((h,i)=>{const k=ALIAS[norm(h)];if(k&&!(k in map))map[k]=i});
 const miss=REQUIRED.filter(([k])=>!(k in map)).map(c=>c[1]);
 if(miss.length){toast('Import annulé. Colonnes manquantes : '+miss.join(', ')+'.');return}
 const byId=new Map();let skip=0,baddate=0;
 T.slice(1).forEach(r=>{const o={};COLS.forEach(([k])=>o[k]=k in map?(r[map[k]]||'').trim():'');
  if(!o.id){skip++;return}
  const raw=o.date;o.date=parseDate(raw);if(raw&&!o.date)baddate++;o.montant=parseNum(o.montant);byId.set(o.id,o)});
 const list=[...byId.values()],known=new Set(rows.map(r=>r.id)),upd=list.filter(o=>known.has(o.id)).length;
 try{await dbUpsert(list)}catch(e){fail(e,'Import refusé par la base');return}
 list.forEach(o=>{const i=rows.findIndex(x=>x.id===o.id);i>=0?rows[i]=o:rows.push(o)});
 render();
 toast(`Import terminé : ${list.length-upd} ajouté(s), ${upd} mis à jour`+(skip?`, ${skip} ligne(s) sans id ignorée(s)`:'')+(baddate?`, ${baddate} date(s) illisible(s)`:'')+'.');
}

/* ---------- stats ---------- */
function stats(list){const s={n:list.length,depose:0,accepte:0,refuse:0,autre:0,dem:0,obt:0};
 list.forEach(r=>{const c=cat(r.statut);s[c]++;s.dem+=r.montant||0;if(c==='accepte')s.obt+=r.montant||0});
 s.taux=s.accepte+s.refuse?s.accepte/(s.accepte+s.refuse):null;return s}
const pct=v=>v==null?'—':Math.round(v*100)+' %';
const strip=(s,cls='strip')=>`<div class="${cls}" title="${ORDER.map(k=>LAB[k]+' : '+s[k]).join(' · ')}">${ORDER.map(k=>s[k]?`<i class="${k}" style="width:${s[k]/s.n*100}%"></i>`:'').join('')}</div>`;
const groupBy=(list,fn)=>{const m=new Map();list.forEach(r=>{const k=fn(r)||'Non renseigné';if(!m.has(k))m.set(k,[]);m.get(k).push(r)});return m};
const empty=()=>`<div class="empty"><p><b>Aucun projet pour l’instant.</b><br>Importez un fichier CSV ou ajoutez un projet à la main.</p><button class="btn pri" data-act="import">Importer un CSV</button></div>`;

/* ---------- Overview ---------- */
function renderOverview(){
 const s=stats(rows);$('#ovSub').textContent=rows.length?`${s.n} projet${s.n>1?'s':''} suivi${s.n>1?'s':''}, ${new Set(rows.map(r=>r.labo).filter(Boolean)).size} laboratoire(s).`:'Vue d’ensemble du portefeuille.';
 if(!rows.length){$('#ovBody').innerHTML=`<div class="panel">${empty()}</div>`;return}
 const k=(v,l,c='')=>`<div class="kpi ${c}"><b>${v}</b><span>${l}</span></div>`;
 const yrs=[...groupBy(rows,year)].sort((a,b)=>a[0].localeCompare(b[0])),mx=Math.max(...yrs.map(y=>y[1].length));
 const years=yrs.map(([y,l])=>{const t=stats(l);return`<div class="ycol"><span class="n">${l.length}</span><div class="ybar" style="height:${l.length/mx*140}px">${ORDER.map(c=>t[c]?`<i class="${c}" style="height:${t[c]/l.length*100}%" title="${LAB[c]} : ${t[c]}"></i>`:'').join('')}</div><small>${y}</small></div>`}).join('');
 const progs=[...groupBy(rows,r=>r.programme)].sort((a,b)=>b[1].length-a[1].length).slice(0,6).map(([p,l])=>{const t=stats(l);return`<tr><td>${esc(p)}</td><td class="num">${l.length}</td><td>${strip(t,'mini')}</td><td class="num">${pct(t.taux)}</td></tr>`}).join('');
 const recent=[...rows].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6).map(r=>`<tr><td><b>${esc(r.id)}</b><br><span class="sub">${esc(r.programme)} · ${esc(r.call)}</span></td><td>${fmtDate(r.date)}</td><td>${tag(r.statut)}</td></tr>`).join('');
 $('#ovBody').innerHTML=`<div class="kpis">${k(s.n,'Projets déposés au total')}${k(s.depose,'En attente de décision','wait')}${k(s.accepte,'Acceptés','ok')}${k(s.refuse,'Refusés','ko')}${k(pct(s.taux),'Taux de succès')}${k(eur.format(s.obt),'Montant obtenu')}</div>
 <div class="panel"><h3>Répartition des projets par statut</h3>${strip(s)}<div class="legend">${ORDER.filter(c=>s[c]).map(c=>`<em style="--c:var(--${{accepte:'ok',depose:'wait',refuse:'ko',autre:'oth'}[c]})">${LAB[c]} · ${s[c]} (${Math.round(s[c]/s.n*100)} %)</em>`).join('')}<em style="--c:transparent">Montant demandé : ${eur.format(s.dem)}</em></div></div>
 <div class="grid2"><div class="panel"><h3>Dépôts par année</h3><div class="years">${years}</div></div>
 <div class="panel wrap"><h3>Derniers dépôts</h3><table><tbody>${recent}</tbody></table></div></div>
 <div class="panel wrap" style="margin-top:16px"><h3>Principaux programmes</h3><table><thead><tr><th>Programme</th><th class="num">Projets</th><th>Statuts</th><th class="num">Succès</th></tr></thead><tbody>${progs}</tbody></table></div>`;
}
const tag=s=>{const c=cat(s);return`<span class="tag ${c}">${esc(s||LAB[c])}</span>`};

/* ---------- Reports ---------- */
const AXES={programme:['Programme',r=>r.programme],dispositif:['Dispositif',r=>r.dispositif],call:['Call',r=>r.call],role:['Rôle',r=>r.role],labo:['Laboratoire',r=>r.labo],annee:['Année',year]};
let repRows=[];
function renderReports(){
 const by=$('#repBy').value||'programme',yr=$('#repYear').value;
 const yrs=[...new Set(rows.map(year))].sort();$('#repYear').innerHTML='<option value="">Toutes</option>'+yrs.map(y=>`<option ${y===yr?'selected':''}>${y}</option>`).join('');
 const list=yr?rows.filter(r=>year(r)===yr):rows;
 if(!list.length){$('#repBody').innerHTML=empty();repRows=[];return}
 const tot=stats(list);
 const g=[...groupBy(list,AXES[by][1])].map(([k,l])=>[k,stats(l)]).sort((a,b)=>b[1].n-a[1].n);
 repRows=[...g,['Total',tot]];
 const line=(k,t,b)=>`<tr style="${b?'font-weight:600':''}"><td>${esc(k)}</td><td class="num">${t.n}</td><td class="num">${t.depose}</td><td class="num">${t.accepte}</td><td class="num">${t.refuse}</td><td>${b?'':strip(t,'mini')}</td><td class="num">${pct(t.taux)}</td><td class="num">${eur.format(t.dem)}</td><td class="num">${eur.format(t.obt)}</td></tr>`;
 $('#repBody').innerHTML=`<table><thead><tr><th>${AXES[by][0]}</th><th class="num">Projets</th><th class="num">Déposés</th><th class="num">Acceptés</th><th class="num">Refusés</th><th>Répartition</th><th class="num">Taux de succès</th><th class="num">Demandé</th><th class="num">Obtenu</th></tr></thead><tbody>${g.map(([k,t])=>line(k,t)).join('')}${line('Total',tot,1)}</tbody></table>
 <p class="hint">Taux de succès = acceptés ÷ (acceptés + refusés). Les projets encore en attente ne sont pas comptés. Les montants proviennent de la colonne facultative « montant ».</p>`;
}

/* ---------- Data ---------- */
function renderData(){
 $('#dataSub').textContent=`${rows.length} projet${rows.length>1?'s':''} enregistré${rows.length>1?'s':''} dans votre base Supabase.`;
 if(!rows.length){$('#dataBody').innerHTML=empty();return}
 const q=norm($('#q').value),f=$('#fStat').value;
 let l=rows.filter(r=>(!f||cat(r.statut)===f)&&(!q||norm(Object.values(r).join(' ')).includes(q)));
 l.sort((a,b)=>{const x=a[sort.k]??'',y=b[sort.k]??'';return(typeof x==='number'?x-y:String(x).localeCompare(String(y),'fr',{numeric:true}))*sort.d});
 const ths=COLS.map(([k,h])=>`<th class="s ${k==='montant'?'num':''}" data-k="${k}">${h}${sort.k===k?(sort.d>0?' ▲':' ▼'):''}</th>`).join('');
 $('#dataBody').innerHTML=l.length?`<table><thead><tr>${ths}<th></th></tr></thead><tbody>${l.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${fmtDate(r.date)}</td><td>${esc(r.programme)}</td><td>${esc(r.dispositif)}</td><td>${esc(r.call)}</td><td>${esc(r.role)}</td><td>${esc(r.labo)}</td><td>${esc(r.contact)}</td><td>${r.mail?`<a href="mailto:${esc(r.mail)}" style="color:var(--acc)">${esc(r.mail)}</a>`:''}</td><td>${tag(r.statut)}</td><td class="num">${r.montant?eur.format(r.montant):'—'}</td><td><button class="btn" data-edit="${esc(r.id)}">Modifier</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Aucun projet ne correspond à ces filtres.</div>';
}

/* ---------- Formulaire ---------- */
function openForm(id){
 editing=id;const r=rows.find(x=>x.id===id)||{};
 $('#dlgT').textContent=id?`Modifier ${id}`:'Ajouter un projet';$('#dlgDel').style.display=id?'':'none';
 const ls={statut:'dl-statut',role:'dl-role'};
 $('#fg').innerHTML=COLS.map(([k,h])=>`<label class="${k==='mail'||k==='labo'?'full':''}">${h}<input name="${k}" ${k==='date'?'type="date"':k==='montant'?'type="number" min="0" step="1"':k==='mail'?'type="email"':''} ${ls[k]?`list="${ls[k]}"`:''} value="${esc(k==='montant'?(r.montant||''):(r[k]||''))}" ${k==='id'?(id?'readonly':'required'):''}></label>`).join('');
 $('#dlg').showModal();
}
async function saveForm(){
 const o={};$$('#fg input').forEach(i=>o[i.name]=i.value.trim());
 if(!o.id){toast('L’id_projet est obligatoire.');return}
 o.montant=parseNum(o.montant);
 const dup=rows.findIndex(x=>x.id===o.id),cur=rows.findIndex(x=>x.id===editing);
 if(dup>=0&&dup!==cur){toast('Cet id_projet existe déjà.');return}
 try{await dbUpsert([o])}catch(e){fail(e,'Enregistrement impossible');return}
 if(cur>=0)rows[cur]=o;else rows.push(o);
 render();$('#dlg').close();
}

/* ---------- Navigation & événements ---------- */
function render(){renderOverview();renderReports();renderData()}
function tab(t){$$('nav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));$$('main>section').forEach(s=>s.hidden=s.id!==t)}
$$('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('#repBy').innerHTML=Object.entries(AXES).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
$('#repBy').onchange=$('#repYear').onchange=renderReports;
$('#q').oninput=$('#fStat').onchange=renderData;
$('#dataBody').onclick=e=>{const h=e.target.closest('th.s'),b=e.target.closest('[data-edit]');
 if(h){const k=h.dataset.k;sort={k,d:sort.k===k?-sort.d:1};renderData()}else if(b)openForm(b.dataset.edit)};
$('#btnImport').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const f=e.target.files[0];if(f)importText(await f.text());e.target.value='';tab('data')};
$('#btnAdd').onclick=()=>openForm(null);
$('#dlgSave').onclick=saveForm;$('#dlgCancel').onclick=()=>$('#dlg').close();
$('#dlgDel').onclick=async()=>{if(!confirm('Supprimer ce projet ?'))return;try{await dbDelete(editing)}catch(e){fail(e,'Suppression impossible');return}rows=rows.filter(r=>r.id!==editing);render();$('#dlg').close()};
$('#btnPrint').onclick=()=>print();
$('#btnLogout').onclick=logout;
document.addEventListener('click',e=>{if(e.target.closest('[data-act=import]'))$('#btnImport').click()});
$('#btnClear').onclick=async()=>{if(!confirm('Effacer définitivement tous les projets ?'))return;try{await dbDeleteAll()}catch(e){fail(e,'Suppression impossible');return}rows=[];render()};
$('#btnExp').onclick=()=>download('projets-recherche.csv',toCSV(COLS.map(c=>c[1]),rows.map(r=>COLS.map(([k])=>r[k]))));
$('#btnTpl').onclick=()=>download('modele-projets.csv',toCSV(COLS.map(c=>c[1]),[['PRJ-2025-001','2025-03-14','ANR','JCJC','AAPG 2025','Coordinateur','Mon laboratoire','Prénom Nom','prenom.nom@exemple.fr','Déposé','250000']]));
$('#btnRepCsv').onclick=()=>repRows.length&&download('rapport.csv',toCSV([AXES[$('#repBy').value][0],'Projets','Déposés','Acceptés','Refusés','Taux de succès','Demandé (€)','Obtenu (€)'],repRows.map(([k,t])=>[k,t.n,t.depose,t.accepte,t.refuse,pct(t.taux),t.dem,t.obt])));
['dragover','dragenter'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('#main').classList.add('drop')}));
['dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('#main').classList.remove('drop')}));
document.addEventListener('drop',async e=>{const f=e.dataTransfer.files[0];if(f){importText(await f.text());tab('data')}});
boot();
