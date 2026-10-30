/* ---------- État ---------- */
let rows=[],sort={k:'id',d:1},editing=null;
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',5000)}
const fail=(e,m='Opération impossible')=>{const s=e&&e.message?e.message:String(e);toast(m+' : '+s+(/row-level security/i.test(s)?' — la règle de sécurité ne reconnaît pas votre compte (voir sql/fix-policy.sql).':''))};

/* ---------- Effets visuels ---------- */
const fmtK=(v,f)=>f==='eur'?eur.format(v):f==='pct'?v+' %':v;
function countUps(){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 $$('[data-count]').forEach(el=>{const to=+el.dataset.count,f=el.dataset.fmt;if(!to)return;const t0=performance.now();
  (function step(t){const p=Math.min((t-t0)/800,1);el.textContent=fmtK(Math.round(to*(1-Math.pow(1-p,3))),f);if(p<1)requestAnimationFrame(step)})(t0)})}
function movePill(){const b=$('nav [aria-selected=true]'),p=$('nav .pill');if(!b||!p||!b.offsetWidth)return;
 p.style.width=b.offsetWidth+'px';p.style.height=b.offsetHeight+'px';p.style.transform=`translate(${b.offsetLeft}px,${b.offsetTop}px)`}
function fitKpis(){$$('.kpi b').forEach(b=>{b.style.fontSize='';if(!b.clientWidth)return;const cur=b.textContent;if(b.dataset.count)b.textContent=fmtK(+b.dataset.count,b.dataset.fmt);
 let fs=parseFloat(getComputedStyle(b).fontSize);while(b.scrollWidth>b.clientWidth&&fs>14){fs-=1;b.style.fontSize=fs+'px'}b.textContent=cur})}
function playFx(){const m=$('#main'),sec=$('main>section:not([hidden])');if(!sec)return;movePill();fitKpis();
 sec.querySelectorAll('.kpi,.panel,tbody tr').forEach((el,i)=>el.style.setProperty('--i',Math.min(i,14)));
 sec.querySelectorAll('.ybar').forEach((el,i)=>el.style.setProperty('--j',i));
 m.classList.remove('anim');void m.offsetWidth;m.classList.add('anim');
 clearTimeout(playFx.t);playFx.t=setTimeout(()=>m.classList.remove('anim'),1800);countUps()}
addEventListener('resize',()=>{movePill();fitKpis()});

/* ---------- Routes : une adresse par onglet (#/overview, #/reports, #/data) ---------- */
const ROUTES=['overview','reports','data'],NAMES={overview:'Overview',reports:'Reports',data:'Data'};
function tab(t){$$('nav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));$$('main>section').forEach(s=>s.hidden=s.id!==t);
 document.title='Dashboard · '+NAMES[t];scrollTo(0,0);movePill();playFx()}
function route(){const t=location.hash.replace(/^#\/?/,'').split('/')[0];tab(ROUTES.includes(t)?t:'overview')}
addEventListener('hashchange',route);
async function start(){try{rows=await dbLoad()}catch(e){rows=[];fail(e,'Chargement impossible')}render();route()}

/* ---------- Import CSV (les colonnes absentes du fichier ne touchent pas aux données existantes) ---------- */
async function importText(t){
 if(t.length>5e6){toast('Fichier trop volumineux (5 Mo maximum).');return}
 const T=parseCSV(t);if(T.length<2){toast('Fichier vide ou sans ligne de données.');return}
 const map={};T[0].forEach((h,i)=>{const k=ALIAS[norm(h)];if(k&&!(k in map))map[k]=i});
 const miss=REQUIRED.filter(k=>!(k in map)).map(k=>CSVH[k]||k);
 if(miss.length){toast('Import annulé. Colonnes manquantes : '+miss.join(', ')+'.');return}
 const old=new Map(rows.map(r=>[r.id,r])),byId=new Map(),blank=Object.fromEntries(FIELDS.map(k=>[k,k==='montant'?0:'']));
 let skip=0,bad=0;
 T.slice(1).forEach(r=>{const get=k=>k in map?(r[map[k]]||'').trim():undefined,id=get('id');
  if(!id){skip++;return}
  const o={...blank,...(old.get(id)||{}),id};
  FIELDS.forEach(k=>{let v=get(k);if(v===undefined||k==='id')return;
   if(DATES.includes(k)){const p=parseDate(v);if(v&&!p)bad++;v=p}else if(k==='montant')v=parseNum(v);
   o[k]=v});
  byId.set(id,o)});
 const list=[...byId.values()],upd=list.filter(o=>old.has(o.id)).length;
 try{await dbUpsert(list)}catch(e){fail(e,'Import refusé par la base')
  return}
 list.forEach(o=>{const i=rows.findIndex(x=>x.id===o.id);i>=0?rows[i]=o:rows.push(o)});
 render();
 toast(`Import terminé : ${list.length-upd} ajouté(s), ${upd} mis à jour`+(skip?`, ${skip} ligne(s) sans id ignorée(s)`:'')+(bad?`, ${bad} date(s) illisible(s)`:'')+'.');
}

/* ---------- Statistiques ---------- */
const OPEN=['depose','accepte','refuse'];
function stats(list){const s={n:list.length,prep:0,depose:0,accepte:0,refuse:0,retire:0,autre:0,dem:0,obt:0};
 list.forEach(r=>{const c=cat(r.statut);s[c]++;if(OPEN.includes(c))s.dem+=r.montant||0;if(c==='accepte')s.obt+=r.montant||0});
 s.taux=s.accepte+s.refuse?s.accepte/(s.accepte+s.refuse):null;return s}
const pct=v=>v==null?'—':Math.round(v*100)+' %';
const go=(s='',y='')=>`data-go="${s}|${y}" role="link" tabindex="0"`;
const strip=(s,cls='strip')=>`<div class="${cls}" title="${ORDER.map(k=>LAB[k]+' : '+s[k]).join(' · ')}">${ORDER.map(k=>s[k]?`<i class="s-${k}" style="width:${s[k]/s.n*100}%" ${cls==='strip'?go('c:'+k):''}></i>`:'').join('')}</div>`;
const groupBy=(list,fn)=>{const m=new Map();list.forEach(r=>{const k=fn(r)||'Non renseigné';if(!m.has(k))m.set(k,[]);m.get(k).push(r)});return m};
const tag=s=>{const c=cat(s);return`<span class="tag s-${c}">${esc(s||LAB[c])}</span>`};
const empty=()=>`<div class="empty"><p><b>Aucun projet pour l’instant.</b><br>Créez un projet ou importez un fichier CSV.</p><button class="btn pri" data-act="new">Nouveau projet</button><button class="btn" data-act="import">Importer un CSV</button></div>`;

/* ---------- Overview ---------- */
const OVF=['#oYear','#oProg','#oLabo','#oRole'];
const ovMatch=r=>(!$('#oYear').value||year(r)===$('#oYear').value)&&(!$('#oProg').value||r.programme===$('#oProg').value)&&(!$('#oLabo').value||r.labo===$('#oLabo').value)&&(!$('#oRole').value||r.role===$('#oRole').value);
function renderOverview(){
 const R=rows.filter(ovMatch),act=OVF.map(i=>$(i).value).filter(Boolean),s=stats(R);
 $('#ovSub').textContent=!rows.length?'Vue d’ensemble du portefeuille.':`${s.n} projet${s.n>1?'s':''}`+(act.length?` sur ${rows.length} · ${act.join(' · ')}`:`, ${new Set(R.map(r=>r.labo).filter(Boolean)).size} laboratoire(s)`)+'.';
 if(!rows.length){$('#ovBody').innerHTML=`<div class="panel">${empty()}</div>`;return}
 if(!R.length){$('#ovBody').innerHTML='<div class="panel"><div class="empty">Aucun projet pour ces filtres.</div></div>';return}
 const k=(v,l,c='',f='n',g=null)=>`<div class="kpi ${c}" ${g==null?'':go(g)}><b data-count="${v}" data-fmt="${f}">${fmtK(v,f)}</b><span>${l}</span></div>`,
  rate=s.taux==null?0:Math.round(s.taux*100),
  kRate=`<div class="kpi rate"><div><b ${s.taux==null?'':`data-count="${rate}" data-fmt="pct"`}>${s.taux==null?'—':rate+' %'}</b><span>Taux de succès</span></div><div class="ring" style="--v:${rate}"></div></div>`;
 const yrs=[...groupBy(R,year)].sort((a,b)=>a[0].localeCompare(b[0])),mx=Math.max(...yrs.map(y=>y[1].length));
 const years=yrs.map(([y,l])=>{const t=stats(l);return`<div class="ycol" ${go('',y)}><span class="n">${l.length}</span><div class="ybar" style="height:${l.length/mx*140}px">${ORDER.map(c=>t[c]?`<i class="s-${c}" style="height:${t[c]/l.length*100}%" title="${LAB[c]} : ${t[c]}"></i>`:'').join('')}</div><small>${y}</small></div>`}).join('');
 const today=new Date().toISOString().slice(0,10),due=[];
 R.forEach(r=>{const c=cat(r.statut);if(c==='prep'&&r.date_limite)due.push([r.date_limite,'Date limite de dépôt',r]);if(r.echeance&&!['accepte','refuse','retire'].includes(c))due.push([r.echeance,r.prochaine_action||'Échéance de suivi',r])});
 due.sort((a,b)=>a[0].localeCompare(b[0]));
 const upcoming=due.slice(0,6).map(([d,l,r])=>`<tr data-edit="${esc(r.id)}" tabindex="0"><td><b>${esc(r.acronyme||r.id)}</b><br><span class="sub">${esc(l)}</span></td><td class="mono${d<today?' late':''}">${fmtDate(d)}</td><td>${tag(r.statut)}</td></tr>`).join('')||'<tr><td class="sub">Aucune échéance renseignée.</td></tr>';
 const progs=[...groupBy(R,r=>r.programme)].sort((a,b)=>b[1].length-a[1].length).slice(0,6).map(([p,l])=>{const t=stats(l);return`<tr><td>${esc(p)}</td><td class="num mono">${l.length}</td><td>${strip(t,'mini')}</td><td class="num mono">${pct(t.taux)}</td></tr>`}).join('');
 $('#ovBody').innerHTML=`<div class="kpis">${k(s.n,'Projets','','n','')}${k(s.prep,'En préparation','s-prep','n','c:prep')}${k(s.depose,'En évaluation','s-depose','n','c:depose')}${k(s.accepte,'Acceptés','s-accepte','n','c:accepte')}${k(s.refuse,'Refusés','s-refuse','n','c:refuse')}${kRate}${k(s.obt,'Budget obtenu','','eur','c:accepte')}</div>
 <div class="panel"><h3>Répartition par statut</h3>${strip(s)}<div class="legend">${ORDER.filter(c=>s[c]).map(c=>`<em class="s-${c}" ${go('c:'+c)}>${LAB[c]} · ${s[c]} (${Math.round(s[c]/s.n*100)} %)</em>`).join('')}<em>Budget demandé : ${eur.format(s.dem)}</em></div></div>
 <div class="grid2"><div class="panel"><h3>Projets par année</h3><div class="years">${years}</div></div>
 <div class="panel wrap"><h3>Échéances à venir</h3><table><tbody>${upcoming}</tbody></table></div></div>
 <div class="panel wrap" style="margin-top:18px"><h3>Principaux programmes</h3><table><thead><tr><th>Programme</th><th class="num">Projets</th><th>Statuts</th><th class="num">Succès</th></tr></thead><tbody>${progs}</tbody></table></div>`;
}

/* ---------- Reports ---------- */
const AXES={programme:['Programme',r=>r.programme],dispositif:['Dispositif',r=>r.dispositif],call:['Call',r=>r.call],role:['Rôle',r=>r.role],labo:['Laboratoire',r=>r.labo],statut:['Statut',r=>r.statut],annee:['Année',year]};
let repRows=[];
function renderReports(){
 const by=$('#repBy').value||'programme',yr=$('#repYear').value;
 const yrs=[...new Set(rows.map(year))].sort();$('#repYear').innerHTML='<option value="">Toutes</option>'+yrs.map(y=>`<option ${y===yr?'selected':''}>${y}</option>`).join('');
 const list=yr?rows.filter(r=>year(r)===yr):rows;
 if(!list.length){$('#repBody').innerHTML=empty();repRows=[];return}
 const tot=stats(list),g=[...groupBy(list,AXES[by][1])].map(([k,l])=>[k,stats(l)]).sort((a,b)=>b[1].n-a[1].n);
 repRows=[...g,['Total',tot]];
 const line=(k,t,b)=>`<tr style="${b?'font-weight:600':''}"><td>${esc(k)}</td><td class="num mono">${t.n}</td><td class="num mono">${t.prep}</td><td class="num mono">${t.depose}</td><td class="num mono">${t.accepte}</td><td class="num mono">${t.refuse}</td><td class="num mono">${t.retire+t.autre}</td><td>${b?'':strip(t,'mini')}</td><td class="num mono">${pct(t.taux)}</td><td class="num mono">${eur.format(t.dem)}</td><td class="num mono">${eur.format(t.obt)}</td></tr>`;
 $('#repBody').innerHTML=`<table><thead><tr><th>${AXES[by][0]}</th><th class="num">Projets</th><th class="num">Prépa.</th><th class="num">Éval.</th><th class="num">Acceptés</th><th class="num">Refusés</th><th class="num">Retirés</th><th>Répartition</th><th class="num">Succès</th><th class="num">Budget demandé</th><th class="num">Budget obtenu</th></tr></thead><tbody>${g.map(([k,t])=>line(k,t)).join('')}${line('Total',tot,1)}</tbody></table>
 <p class="hint">Taux de succès = acceptés ÷ (acceptés + refusés). Budget demandé = projets déposés (en évaluation, acceptés, refusés). Budget obtenu = projets acceptés.</p>`;
}

/* ---------- Data ---------- */
const TCOLS=[['id','Projet'],['acronyme','Acronyme'],['titre','Titre'],['programme','Programme'],['labo','Laboratoire'],['statut','Statut'],['date_limite','Date limite'],['montant','Budget']];
const cell=(r,k)=>k==='id'?`<td class="mono"><b>${esc(r.id)}</b></td>`:k==='titre'?`<td class="cut" title="${esc(r.titre)}">${esc(r.titre)}</td>`:k==='statut'?`<td>${tag(r.statut)}</td>`:k==='date_limite'?`<td class="mono">${fmtDate(r.date_limite)}</td>`:k==='montant'?`<td class="num mono">${r.montant?eur.format(r.montant):'—'}</td>`:`<td>${esc(r[k])}</td>`;
function fillFilters(){
 const fs=$('#fStat'),vs=fs.value;
 fs.innerHTML='<option value="">Tous les statuts</option><optgroup label="Catégories">'+ORDER.map(c=>`<option value="c:${c}">${LAB[c]}</option>`).join('')+'</optgroup><optgroup label="Statuts">'+STATUTS.map(s=>`<option value="s:${s}">${s}</option>`).join('')+'</optgroup>';
 fs.value=vs;
 const U=f=>[...new Set(rows.map(f).filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),'fr',{numeric:true}));
 const S=(id,vals,all)=>{const e=$(id),v=e.value;e.innerHTML=`<option value="">${all}</option>`+vals.map(x=>`<option>${esc(x)}</option>`).join('');e.value=v};
 [['Year','Toutes les années',year],['Prog','Tous les programmes',r=>r.programme],['Labo','Tous les laboratoires',r=>r.labo],['Role','Tous les rôles',r=>r.role]].forEach(([n,all,f])=>{const v=U(f);S('#o'+n,v,all);S('#f'+n,v,all)})}
function renderData(){
 if(!rows.length){$('#dataBody').innerHTML=empty();return}
 const q=norm($('#q').value),fv=$('#fStat').value,fy=$('#fYear').value;
 const l=rows.filter(r=>(!fv||(fv[0]==='c'?cat(r.statut)===fv.slice(2):norm(r.statut)===norm(fv.slice(2))))&&(!fy||year(r)===fy)&&(!$('#fProg').value||r.programme===$('#fProg').value)&&(!$('#fLabo').value||r.labo===$('#fLabo').value)&&(!$('#fRole').value||r.role===$('#fRole').value)&&(!q||norm(Object.values(r).join(' ')).includes(q)));
 l.sort((a,b)=>{const x=a[sort.k]??'',y=b[sort.k]??'';return(typeof x==='number'?x-y:String(x).localeCompare(String(y),'fr',{numeric:true}))*sort.d});
 const ths=TCOLS.map(([k,h])=>`<th class="s ${k==='montant'?'num':''}" data-k="${k}">${h}${sort.k===k?(sort.d>0?' ▲':' ▼'):''}</th>`).join('');
 $('#dataBody').innerHTML=l.length?`<table><thead><tr>${ths}</tr></thead><tbody>${l.map(r=>`<tr data-edit="${esc(r.id)}" tabindex="0">${TCOLS.map(([k])=>cell(r,k)).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">Aucun projet ne correspond à ces filtres.</div>';
}

/* ---------- Formulaire par catégories ---------- */
function openForm(id){
 editing=id;const r=rows.find(x=>x.id===id)||{statut:'Brouillon'};
 $('#dlgT').textContent=id?`${id}${r.acronyme?' · '+r.acronyme:''}`:'Nouveau projet';$('#dlgDel').style.display=id?'':'none';
 const fld=([k,h])=>{const v=r[k]??'',full=['titre','mail','notes','labo','prochaine_action'].includes(k)?'full':'';let inp;
  if(k==='statut'){const o=!v||STATUTS.includes(v)?STATUTS:[...STATUTS,v];inp=`<select name="statut"><option value=""></option>${o.map(s=>`<option ${s===v?'selected':''}>${esc(s)}</option>`).join('')}</select>`}
  else if(k==='notes')inp=`<textarea name="notes" rows="3">${esc(v)}</textarea>`;
  else inp=`<input name="${k}" ${DATES.includes(k)?'type="date"':k==='montant'?'type="number" min="0" step="1"':k==='mail'?'type="email"':''} ${k==='role'?'list="dl-role"':''} value="${esc(k==='montant'?(v||''):v)}" ${k==='id'?(id?'readonly':'required'):''}>`;
  return`<label class="${full}">${h}${inp}</label>`};
 $('#fg').innerHTML=GROUPS.map(([g,f])=>`<fieldset><legend>${g}</legend><div class="fg">${f.map(fld).join('')}</div></fieldset>`).join('');
 $('#dlg').showModal();
}
async function saveForm(){
 const o={};$$('#fg [name]').forEach(i=>o[i.name]=i.value.trim());
 if(!o.id){toast('L’identifiant du projet est obligatoire.');return}
 o.montant=parseNum(o.montant);
 const dup=rows.findIndex(x=>x.id===o.id),cur=rows.findIndex(x=>x.id===editing);
 if(dup>=0&&dup!==cur){toast('Cet identifiant existe déjà.');return}
 try{await dbUpsert([o])}catch(e){fail(e,'Enregistrement impossible');return}
 if(cur>=0)rows[cur]=o;else rows.push(o);
 render();$('#dlg').close();
}

/* ---------- Événements ---------- */
function render(){fillFilters();renderOverview();renderReports();renderData()}
$$('nav button').forEach(b=>b.onclick=()=>{location.hash='#/'+b.dataset.tab});
$('#repBy').innerHTML=Object.entries(AXES).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
$('#repBy').onchange=$('#repYear').onchange=renderReports;
$('#q').oninput=renderData;['#fStat','#fYear','#fProg','#fLabo','#fRole'].forEach(i=>$(i).onchange=renderData);
OVF.forEach(i=>$(i).onchange=()=>{renderOverview();playFx()});
$('#oReset').onclick=()=>{OVF.forEach(i=>$(i).value='');renderOverview();playFx()};
document.addEventListener('click',e=>{
 const g=e.target.closest('[data-go]');
 if(g){const[s,y]=g.dataset.go.split('|');$('#fStat').value=s;$('#fYear').value=y||$('#oYear').value;$('#fProg').value=$('#oProg').value;$('#fLabo').value=$('#oLabo').value;$('#fRole').value=$('#oRole').value;$('#q').value='';renderData();location.hash='#/data';return}
 const ed=e.target.closest('[data-edit]');if(ed){openForm(ed.dataset.edit);return}
 const a=e.target.closest('[data-act]');if(a){a.dataset.act==='import'?$('#file').click():openForm(null);return}
 const h=e.target.closest('th.s');if(h){const k=h.dataset.k;sort={k,d:sort.k===k?-sort.d:1};renderData()}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-go],[data-edit]'))e.target.click()});
$('#btnNew').onclick=()=>openForm(null);
$('#btnImport').onclick=$('#btnImport2').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const f=e.target.files[0];if(f)await importText(await f.text());e.target.value='';location.hash='#/data'};
$('#dlgSave').onclick=saveForm;$('#dlgCancel').onclick=()=>$('#dlg').close();
$('#dlgDel').onclick=async()=>{if(!confirm('Supprimer ce projet ?'))return;try{await dbDelete(editing)}catch(e){fail(e,'Suppression impossible');return}rows=rows.filter(r=>r.id!==editing);render();$('#dlg').close()};
$('#btnPrint').onclick=()=>print();
$('#btnLogout').onclick=logout;
$('#btnClear').onclick=async()=>{if(!confirm('Effacer définitivement tous les projets ?'))return;try{await dbDeleteAll()}catch(e){fail(e,'Suppression impossible');return}rows=[];render()};
$('#btnExp').onclick=()=>download('projets-recherche.csv',toCSV(COLS.map(([k])=>CSVH[k]||k),rows.map(r=>COLS.map(([k])=>r[k]))));
$('#btnTpl').onclick=()=>download('modele-projets.csv',toCSV(COLS.map(([k])=>CSVH[k]||k),[['PRJ-2026-001','ACRO','','Titre complet du projet','ANR','JCJC','AAPG 2026','Coordinateur','Mon laboratoire','Prénom Nom','prenom.nom@exemple.fr','2026-03-14','2026-03-10','Déposé','250000','Relancer le partenaire','2026-04-01','','']]));
$('#btnRepCsv').onclick=()=>repRows.length&&download('rapport.csv',toCSV([AXES[$('#repBy').value][0],'Projets','En préparation','En évaluation','Acceptés','Refusés','Retirés/autres','Taux de succès','Budget demandé (€)','Budget obtenu (€)'],repRows.map(([k,t])=>[k,t.n,t.prep,t.depose,t.accepte,t.refuse,t.retire+t.autre,pct(t.taux),t.dem,t.obt])));
['dragover','dragenter'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('#main').classList.add('drop')}));
['dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('#main').classList.remove('drop')}));
document.addEventListener('drop',async e=>{const f=e.dataTransfer.files[0];if(f){await importText(await f.text());location.hash='#/data'}});
boot();
