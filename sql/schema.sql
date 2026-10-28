-- À exécuter dans Supabase > SQL Editor. Remplacez VOTRE_EMAIL@exemple.fr (2 occurrences) par l'adresse de votre compte.

create table if not exists public.projets (
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id_projet      text not null check (char_length(id_projet) between 1 and 100),
  date_depot     date,
  programme      text check (char_length(programme)   <= 300),
  dispositif     text check (char_length(dispositif)  <= 300),
  appel          text check (char_length(appel)       <= 300),
  role_projet    text check (char_length(role_projet) <= 100),
  laboratoire    text check (char_length(laboratoire) <= 300),
  contact        text check (char_length(contact)     <= 300),
  mail           text check (char_length(mail)        <= 300),
  statut_projet  text check (char_length(statut_projet) <= 100),
  montant        numeric(14,2) not null default 0 check (montant >= 0),
  created_at     timestamptz not null default now(),
  primary key (user_id, id_projet)
);

-- 1) RLS obligatoire, y compris pour le propriétaire de la table
alter table public.projets enable row level security;
alter table public.projets force  row level security;

-- 2) Aucun accès pour les visiteurs non connectés
revoke all on public.projets from anon, public;
grant select, insert, update, delete on public.projets to authenticated;

-- 3) Une seule règle : ses propres lignes ET uniquement pour votre adresse e-mail
drop policy if exists "proprietaire_uniquement" on public.projets;
create policy "proprietaire_uniquement" on public.projets
  for all to authenticated
  using      (user_id = (select auth.uid()) and lower((select auth.jwt() ->> 'email')) = lower('VOTRE_EMAIL@exemple.fr'))
  with check (user_id = (select auth.uid()) and lower((select auth.jwt() ->> 'email')) = lower('VOTRE_EMAIL@exemple.fr'));

-- 4) Option renforcée, à activer SEULEMENT après avoir ajouté la double authentification (MFA) :
-- create policy "mfa_obligatoire" on public.projets as restrictive
--   for all to authenticated using ((select auth.jwt() ->> 'aal') = 'aal2');

-- Vérification : la colonne rowsecurity doit valoir true
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
