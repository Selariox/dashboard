/* Accès aux données Supabase. La sécurité réelle est assurée par la RLS (sql/schema.sql). */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth: {persistSession: true, autoRefreshToken: true}});
const T = 'projets';
const toDb = r => ({id_projet: r.id, acronyme: r.acronyme, eotp: r.eotp, titre: r.titre, programme: r.programme, dispositif: r.dispositif, appel: r.call, role_projet: r.role, laboratoire: r.labo, contact: r.contact, mail: r.mail, date_limite: r.date_limite || null, date_depot: r.date || null, statut_projet: r.statut, montant: r.montant || 0, prochaine_action: r.prochaine_action, echeance_action: r.echeance || null, date_decision: r.date_decision || null, notes: r.notes});
const fromDb = d => ({id: d.id_projet, acronyme: d.acronyme || '', eotp: d.eotp || '', titre: d.titre || '', programme: d.programme || '', dispositif: d.dispositif || '', call: d.appel || '', role: d.role_projet || '', labo: d.laboratoire || '', contact: d.contact || '', mail: d.mail || '', date_limite: d.date_limite || '', date: d.date_depot || '', statut: d.statut_projet || '', montant: Number(d.montant) || 0, prochaine_action: d.prochaine_action || '', echeance: d.echeance_action || '', date_decision: d.date_decision || '', notes: d.notes || ''});
async function dbLoad() {
  let all = [], from = 0;
  for (;;) {
    const {data, error} = await sb.from(T).select('*').order('id_projet').range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all.map(fromDb);
}
async function dbUpsert(list) {
  for (let i = 0; i < list.length; i += 500) {
    const {error} = await sb.from(T).upsert(list.slice(i, i + 500).map(toDb), {onConflict: 'user_id,id_projet'});
    if (error) throw error;
  }
}
async function dbDelete(id) { const {error} = await sb.from(T).delete().eq('id_projet', id); if (error) throw error; }
async function dbDeleteAll() { const {error} = await sb.from(T).delete().neq('id_projet', ''); if (error) throw error; }
