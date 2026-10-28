# Suivi des projets de recherche (privé)

Page statique (HTML/CSS/JS) + Supabase (connexion et base de données). Hébergement possible sur GitHub Pages.

## Principe de sécurité
Le site GitHub Pages est **public** (même avec un dépôt privé, sauf offre Enterprise). Seules vos **données** sont protégées, par Supabase :
1. **RLS** activée et forcée : sans session valide, la table est inaccessible.
2. Une règle limite l'accès à **votre user_id ET à votre e-mail** (`sql/schema.sql`).
3. **Aucune inscription** possible depuis la page ; vous désactivez aussi les inscriptions dans Supabase.
4. Seule la clé **publique** (anon / publishable) est dans le code. Jamais la clé `service_role` ou `secret`.
5. supabase-js est **embarqué** (`js/vendor`, v2.117.3), pas de CDN. Une CSP limite les connexions à `*.supabase.co`. Déconnexion automatique après 30 min d'inactivité.

## Mise en place
1. **Supabase** : créez un projet (région UE). Mot de passe de base long et unique.
2. **SQL Editor** : collez `sql/schema.sql`, remplacez `VOTRE_EMAIL@exemple.fr` (2 fois), puis exécutez. Vérifiez : `select tablename, rowsecurity from pg_tables where schemaname='public';` doit afficher `true`.
3. **Authentication > Providers > Email** : gardez Email, **désactivez « Allow new users to sign up »**. Puis **Authentication > Users > Add user** avec votre e-mail, un mot de passe fort (16+ caractères, gestionnaire de mots de passe) et « Auto Confirm User ».
4. **Project Settings > API** : copiez l'URL et la clé publique dans `js/config.js`.
5. **Test local** : `python3 -m http.server 8000` puis http://localhost:8000 (évitez d'ouvrir le fichier en `file://`, la CSP y est peu fiable). Dans Authentication > URL Configuration, ajoutez `http://localhost:8000` aux Redirect URLs.
6. **GitHub** : créez le dépôt, poussez ces fichiers (le `.gitignore` exclut les `.csv`, ne versionnez jamais vos données), puis Settings > Pages > « Deploy from a branch » > `main` / root. Mettez l'URL obtenue dans Authentication > URL Configuration > Site URL.
7. **Contrôle final** : en navigation privée, sans vous connecter, la page ne montre que le formulaire de connexion. Un appel direct à l'API REST avec la clé publique doit renvoyer une erreur de permission ou une liste vide.

## À savoir
- Les projets gratuits Supabase sont mis en pause après environ 7 jours sans activité (reprise manuelle depuis le tableau de bord).
- Faites des exports CSV réguliers (onglet Data) : c'est votre sauvegarde simple.
- Les contacts et e-mails sont des données personnelles : gardez-les à un usage interne.
- Prochaine amélioration recommandée : double authentification (MFA TOTP), puis activation de la règle `mfa_obligatoire` commentée dans le SQL.

## Structure
`index.html` · `css/style.css` · `js/config.js` (clés publiques) · `js/db.js` · `js/auth.js` · `js/csv.js` · `js/app.js` · `sql/schema.sql`
