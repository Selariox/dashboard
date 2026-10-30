/* Connexion / déconnexion. Aucune inscription possible depuis la page : le compte est créé dans Supabase. */
const IDLE_MS = 0;
let idleT;
const armIdle = () => { clearTimeout(idleT); idleT = setTimeout(logout, IDLE_MS); };
['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (!$('#app').hidden) armIdle(); }, {passive: true}));

function showLogin() { clearTimeout(idleT); $('#app').hidden = true; $('#login').hidden = false; $('#lPw').value = ''; }
async function enter() { $('#login').hidden = true; $('#app').hidden = false; armIdle(); await start(); }
async function logout() { await sb.auth.signOut(); rows = []; render(); showLogin(); }
async function boot() { const {data} = await sb.auth.getSession(); data.session ? await enter() : showLogin(); }

$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  const b = e.submitter; b.disabled = true; $('#lErr').textContent = '';
  const {error} = await sb.auth.signInWithPassword({email: $('#lEmail').value.trim(), password: $('#lPw').value});
  b.disabled = false;
  if (error) { $('#lErr').textContent = 'Identifiants incorrects ou accès non autorisé.'; return; }
  await enter();
};
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') setTimeout(() => { rows = []; showLogin(); }); });
