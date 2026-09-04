# Projet Institut Fitra - Documentation Technique

## 1. Architecture & Stack

```
Visiteurs → Site Vitrine (Next.js)  ─┐
Élèves   → App Mobile (Flutter)     ─┼→ Laravel API → MySQL + Stripe
Admin    → Web App (Next.js)        ─┘
```

- **Backend** : Laravel 12, PHP 8.4, MySQL, Sanctum — port **8001** (local) / `api.institut-fitra.com` (prod)
- **Frontend** : Next.js 14 (App Router), TypeScript, Tailwind CSS — port **3020** (local) / Vercel (prod)
- **Document Editor** : Next.js 14 — port **3021** (local)
- **Stockage** : DigitalOcean Spaces (fichiers + CDN) — bucket `institut-fitra-media`, région `fra1`
- **Vidéos** : Bunny Stream — l'admin colle l'URL embed ou le code HTML complet, le `src` est extrait automatiquement
- **Paiements** : Stripe Checkout (unique, multi-versements, régularisation)
- **Emails** : Resend — domaine `institut-fitra.com`, envoi depuis `noreply@institut-fitra.com`
- **Sous-domaines prod** : `institut-fitra.com` → vitrine | `app.institut-fitra.com` → backoffice | `api.institut-fitra.com` → API Laravel
- **Sous-domaines local** : `localhost:3020` → vitrine | `app.localhost:3020` → backoffice

---

## 2. Structure des Dossiers

```
institut-fitra/
├── backend/
│   ├── app/Models/            # User, Program, ClassModel, Session, Enrollment, Order...
│   ├── app/Http/Controllers/  # Auth, Program, Class, Session, Enrollment, Attendance, Order...
│   ├── app/Services/          # SessionGeneratorService, StripeService, ProgramLevelService, ImageOptimizerService
│   └── routes/api.php
│
└── frontend-web/
    ├── app/(public)/          # Site vitrine (accueil, à propos, programmes, contact)
    ├── app/app/auth/          # Login, mot de passe oublié, reset
    ├── app/app/admin/         # Dashboard, users, programs, classes, sessions, orders, messages, tracking, contact-messages
    ├── app/app/student/       # Dashboard, planning, supports, replays, messages, profil
    ├── components/layout/     # AdminSidebar, StudentSidebar
    ├── components/ui/         # UserAvatar (gère URLs Spaces + legacy)
    ├── lib/api/               # Clients Axios par ressource
    ├── lib/types/index.ts     # Toutes les interfaces TypeScript
    └── middleware.ts          # Routing sous-domaines
```

---

## 3. Rôles et Permissions

| Rôle | Permissions | Profil |
|------|-------------|--------|
| **student** | Ses classes, sessions, supports, replays, Zoom, messagerie | `student_profiles` |
| **teacher** | + Créer/gérer SES programmes, classes, sessions, présences | `teacher_profiles` |
| **admin** | + Vision globale, tous utilisateurs/programmes/inscriptions | `teacher_profiles` |

**Middleware** : `role:student` (tous auth) | `role:teacher` (teacher+admin) | `role:admin` (admin seul)

---

## 4. Base de Données

### Hiérarchie des données

```
Program (template)
  ├── ProgramLevels (niveaux 2, 3, 4... — niveau 1 = programme lui-même)
  │    └── ProgramLevelActivations (liaison niveau ↔ classe)
  └── ClassModel (instance annuelle, ex: "Promotion 2025/2026")
       ├── parent_class_id → ClassModel (hiérarchie promotions)
       ├── zoom_link (lien Zoom permanent — pas d'API Zoom)
       ├── Enrollments
       └── Sessions
            ├── SessionMaterials (PDF/images → Spaces)
            ├── replay_url (Bunny Stream ou Vimeo) + replay_validity_days + replay_added_at
            └── Attendances
```

### Tables principales

| Table | Champs clés |
|-------|-------------|
| `users` | id, email, password, role, first_name, last_name |
| `student_profiles` | user_id, phone, date_of_birth, address, city, country, gender, profile_photo |
| `teacher_profiles` | user_id, phone, specialization, bio, gender, profile_photo |
| `programs` | name, description, teacher_id, price, max_installments, default_class_id _(plus de `schedule` : l'emploi du temps est porté par la classe)_ |
| `classes` | program_id, name, academic_year, start_date, end_date, max_students, status, zoom_link, parent_class_id, **schedule (JSON)** |
| `class_sessions` | class_id, **program_level_id** (nullable — null = niveau 1/base), teacher_id, title, scheduled_at, duration_minutes, status, replay_url, replay_validity_days, replay_added_at, color |
| `enrollments` | student_id, class_id, status, enrolled_at |
| `attendances` | session_id, student_id, attended, duration_minutes |
| `session_materials` | session_id, title, file_path, file_type |
| `messages` | sender_id, receiver_id, group_id, content, attachment_path, attachment_type, attachment_original_name, attachment_size, read_at, sent_at |
| `message_groups` | name, type (program/class/custom), program_id, class_id, created_by |
| `group_members` | group_id, user_id, joined_at |
| `notifications` | user_id, type (session/message/enrollment/material/payment/level/tracking/other), title, message, action_url, read_at |
| `orders` | student_id, program_id, class_id, customer_email, total_amount, installments_count, payment_method, status, stripe_checkout_session_id, level_number, program_level_id |
| `order_payments` | order_id, amount, installment_number, status, scheduled_at, paid_at, stripe_payment_intent_id, recovery_for_payment_id, is_recovery_payment |
| `program_levels` | program_id, level_number (≥2), name, description, price, max_installments, schedule (JSON), teacher_id |
| `program_level_activations` | program_level_id, class_id, **start_date, end_date**, activated_by, activated_at |
| `settings` | key, value (dont stripe_secret_key, stripe_webhook_secret) |
| `dashboard_alert_dismissals` | user_id, alert_type, dismissed_at — unique(user_id, alert_type) |

**Format schedule** : `[{"day": "lundi", "start_time": "10:00", "end_time": "12:00"}]` — porté par `classes.schedule` (niveau 1) et `program_levels.schedule` / `program_level_activations.schedule` (niveaux 2+). Le programme **n'a plus** d'emploi du temps.

---

## 5. API Endpoints

### Auth
```
POST /api/auth/register | login | logout | forgot-password | reset-password
GET  /api/auth/me
```

### Programs & Levels
```
GET/POST         /api/programs
GET/PUT/DELETE   /api/programs/{id}
GET              /api/programs/teachers

GET/POST         /api/programs/{program}/levels
GET/PUT/DELETE   /api/programs/{program}/levels/{level}
POST             /api/programs/{program}/levels/{level}/activate    # body: class_id, start_date, end_date (génère les sessions)
POST             /api/programs/{program}/levels/{level}/deactivate  # body: class_id (optionnel)
```

### Classes
```
GET/POST        /api/classes
GET/PUT/DELETE  /api/classes/{id}
GET             /api/classes/{id}/students
POST            /api/classes/{id}/generate-sessions
POST            /api/classes/{id}/regenerate-sessions
```

### Sessions & Matériaux
```
GET/POST/PUT/DELETE  /api/sessions | /api/sessions/{id}
POST                 /api/sessions/{session}/materials
GET/DELETE           /api/materials/{material}
GET                  /api/materials/{material}/download
```

### Enrollments
```
GET/POST        /api/enrollments
PUT/DELETE      /api/enrollments/{id}
```

### Messages
```
GET    /api/messages/conversations | /api/messages/users/{user}
POST   /api/messages                        # multipart si pièce jointe
GET    /api/messages/unread-count | available-users
POST   /api/messages/users/{user}/mark-read
GET    /api/messages/{message}/attachment

GET/POST        /api/messages/groups
GET/POST        /api/messages/groups/{group} | /groups/{group}/messages
POST/DELETE     /api/messages/groups/{group}/members | /members/{user}
DELETE          /api/messages/groups/{group}
```

### Orders & Checkout
```
GET/POST/PUT/DELETE  /api/admin/orders | /orders/{id}
GET                  /api/admin/orders/stats
POST                 /api/admin/orders/manual          # class_id obligatoire

POST  /api/checkout/create-session | /checkout/reinscription
POST  /api/stripe/webhook
GET   /api/checkout/status
POST  /api/student/stripe-portal
POST  /api/checkout/recovery
```

### Admin Dashboard & Users
```
GET  /api/admin/dashboard/stats | recent-users | upcoming-sessions | recent-classes | recent-enrollments
POST /api/admin/dashboard/alerts/dismiss | alerts/restore   # body: alert_type
GET/POST/PUT/DELETE  /api/admin/users | /users/{id}
GET  /api/admin/students/{student}/levels-history
POST /api/contact
GET/PUT  /api/admin/contact-messages | /{id}
```

### Student
```
GET  /api/student/materials | reinscriptions | levels-history
GET  /api/student/failed-payments | payment-history
PUT  /api/student/profile
```

### Tracking Forms
```
GET/POST/PUT/DELETE  /api/admin/tracking-forms | /{id}
POST  /api/admin/tracking-forms/{id}/toggle-active | /assign
GET   /api/admin/tracking-forms/{id}/assignments | /students
GET   /api/student/tracking | /tracking/pending-count | /tracking/history | /tracking/{id}
POST  /api/student/tracking/{id}/submit
```

---

## 6. Comportements Importants

### Sessions — génération automatique
- **Niveau 1 (base)** : création/modification d'une classe → `generateSessionsForClass` génère les sessions selon le `schedule` de la **classe** (`classes.schedule`) entre les dates de la classe (`program_level_id = null`). L'emploi du temps est saisi dans le formulaire de classe.
- **Niveaux 2+** : à l'activation d'un niveau pour une classe (avec dates) → `generateSessionsForLevelActivation` génère les sessions selon le `schedule` **du niveau** entre les dates de l'activation (`program_level_id = level->id`)
- Régénération du niveau de base (`deleteAllSessions`/`regenerate`) est **scopée à `program_level_id = null`** → éditer une classe **n'efface pas** les sessions des niveaux supérieurs. La régénération se déclenche si les dates, le programme **ou l'emploi du temps** de la classe changent.
- `SessionController::index()` accepte `per_page` (défaut 15 ; frontend planning utilise `per_page: 500`)

### Emploi du temps — porté par la classe
- Le **programme n'a plus d'emploi du temps**. Les jours/heures de cours sont saisis dans le **formulaire de classe** (création + édition) et stockés dans `classes.schedule`.
- Les **pages de description du programme** (admin `/admin/programs/[id]`, vitrine `/programs/[id]`, `ProgramCard`, liste admin) affichent l'emploi du temps de la **classe d'affectation par défaut** (`program.default_class.schedule`). Changer `default_class_id` change les horaires affichés. `ProgramController::index/show` chargent `defaultClass`.
- `ClassModel::current_period` (accessor) renvoie au niveau 1 le `schedule` de la classe ; la page admin élèves de la classe et la liste des classes l'utilisent inchangées.

### Accès élève par niveau (sessions, supports, replays)
- **Source de vérité** : `ProgramLevelService::accessibleLevelIds($studentId, $classId)` → `[null, ...ids des niveaux payés]`. Le niveau de base (`program_level_id = null`) est accessible dès l'inscription ; un niveau supérieur l'est seulement si l'élève a une commande **`paid`/`partial`** pour ce niveau dans cette classe.
- **Scope** `Session::scopeVisibleToStudent($studentId)` : inscrit à la classe **ET** (niveau de base **OU** commande payée pour ce niveau) — sous-requête corrélée sur `orders` (class_id + program_level_id), gère le multi-classes.
- Appliqué aux **5 points d'accès élève** : `SessionController::index` + `show`, `SessionMaterialController::studentIndex` + `sessionMaterials` + `download`. Un élève niveau 1 ne voit **ni ne télécharge** les sessions/supports/replays d'un niveau non payé.

### Replays vidéo
- Backend calcule et retourne `replay_expires_at` et `replay_valid` (bool)
- `replay_url` = URL embed du player (Bunny Stream ou Vimeo)
- **Bunny Stream** : format `https://player.mediadelivery.net/embed/{library_id}/{video_id}`
- L'admin peut coller l'URL directe **ou** le code HTML embed complet — le frontend extrait automatiquement le `src`

### Niveaux multi-classes (`program_level_activations`)
- `is_active` et `default_class_id` supprimés de `program_levels`
- Un niveau peut être actif sur plusieurs classes simultanément
- **Activation = une classe à la fois + `start_date`/`end_date`** : crée l'activation (updateOrCreate, re-activation = met à jour les dates) et **génère les sessions du niveau** sur la période ; refus si le niveau n'a pas d'emploi du temps
- Désactivation d'un niveau → supprime aussi les sessions générées de ce niveau pour les classes concernées
- Activation (première fois) → emails aux élèves N-1 de la classe ciblée

### Niveau actuel & réinscription (`ProgramLevelService`)
- `getStudentCurrentLevel` / `getAvailableReinscriptions` / `getStudentLevelsHistory` comptent les commandes **`paid` ET `partial`** : l'élève est considéré inscrit dès le 1er versement (paiement en plusieurs fois inclus) → le bouton "S'inscrire" du niveau disparaît et le niveau apparaît dans l'historique (avec badge Payé / En cours de paiement)
- `GET /student/reinscription/levels/{level}` : endpoint élève (lecture seule) pour charger un niveau lors de la réinscription, limité aux niveaux activés (la route admin `GET /programs/{program}/levels/{level}` reste réservée `role:teacher`)

### Hiérarchie des classes
- `parent_class_id` sur `classes` pour relier les promotions entre elles
- Page admin : classes groupées par programme, arborescence parent→enfants

### Tableau de bord admin — « Actions requises »
- Chaque carte d'alerte (`failed_payments`, `sessions_without_replay`, `unread_messages`) porte un ✕ qui la masque **définitivement pour l'admin connecté** (`dashboard_alert_dismissals`, unique par user + type). Le masquage persiste même si de nouveaux éléments arrivent.
- `GET /admin/dashboard/alerts` neutralise les types masqués (liste vidée + compteur à 0) et renvoie `dismissed: string[]`. Le filtrage est appliqué **hors du cache** `dashboard_alerts` (2 min), qui reste global.
- Ligne discrète sous la grille : « N alerte(s) masquée(s) » avec un bouton par type pour réafficher (`POST .../alerts/restore`).

### Commandes manuelles (admin)
- `POST /api/admin/orders/manual` : `class_id` **obligatoire** — le `default_class_id` du programme n'est pas utilisé
- **Niveau de base** (sans `program_level_id`) : crée l'utilisateur élève si l'email n'existe pas, sinon vérifie qu'il n'est pas déjà inscrit à cette classe ; crée l'inscription. `customer_gender` requis (`required_without:program_level_id`)
- **Montée de niveau** (avec `program_level_id`) : l'élève doit déjà exister **et** être inscrit à la classe (niveau de base). Pas de nouvelle inscription, crée juste une commande avec `level_number` + `program_level_id` (statut `paid`). Refus si déjà une commande `paid`/`partial` pour ce niveau. Paiement `free` (gratuit) ou `cash` (espèces). Le frontend propose une **liste déroulante des élèves inscrits** à la classe au lieu de la saisie manuelle.
- **Emails envoyés** (identiques au flux Stripe, préparés dans la transaction et envoyés **après le commit** — un email en échec n'annule pas l'inscription) :
  - nouveau compte créé → `NewAccountCredentialsMail` (mot de passe temporaire `Str::random(12)`) **+** `EnrollmentConfirmationMail`
  - compte existant inscrit à une nouvelle classe → `EnrollmentConfirmationMail` seul
  - montée de niveau (`program_level_id`) → `ReinscriptionConfirmationMail`
  - refus 422 (déjà inscrit, élève introuvable…) → aucun email
- Conséquence côté élève : commande comptée par `ProgramLevelService` → le bloc de réinscription disparaît, ligne "Gratuit" affichée dans le suivi de paiement (`payment-history` renvoie `payment_method`)

### Liste des élèves par niveau (admin)
- `GET /api/classes/{id}/students?level=N` : **niveau 1** → tous les inscrits actifs (inclut ceux montés de niveau, historique conservé) ; **niveau 2+** → uniquement les élèves réinscrits (commande `paid`/`partial` pour ce niveau), avec `payment_status`. Page admin élèves : pills de sélection de niveau + stats adaptées (réinscrits / payé / en cours)

### Messagerie — règles élèves
- Les élèves **ne peuvent pas initier** de conversation, seulement répondre si un admin leur a écrit
- Pièces jointes : images/PDF/audio, max 10 Mo → stockées sur Spaces
- **Ajout de membres à un groupe** : la liste affiche **tous les utilisateurs** non-membres (élèves, profs **et admins**), avec badge « Admin »/« Prof ». L'avatar lit le bon profil selon le rôle (`student_profile` ou `teacher_profile`). Backend `MessageGroupController::addMembers` ne filtre pas par rôle (`exists:users,id`)

### Formulaires de suivi
- `TrackingFormController::assign()` crée une `Notification` (type `tracking`) pour chaque élève assigné
- `GET /student/tracking/pending-count` → nombre de formulaires non complétés (badge rouge sidebar)
- **Brouillon / mise en pause** : `POST /student/tracking/{form}/save-draft` enregistre les réponses partielles (`updateOrCreate`) + pose `draft_saved_at` sur l'assignation, **sans** valider les questions obligatoires ni marquer `completed_at`. À la reprise, le `show` renvoie les réponses sauvegardées (pré-remplissage). UI élève : bouton "Mettre en pause", badge "Brouillon enregistré" + bouton "Reprendre". Le formulaire reste comptabilisé comme à compléter (`pending-count` se base sur `completed_at`).

### Stripe
- Clés lues depuis la table `settings` (pas `.env`) : `stripe_secret_key`, `stripe_webhook_secret`
- Webhook `invoice.paid` : skip si `billing_reason === 'subscription_create'`
- Régularisation paiements échoués : crée un NOUVEAU paiement (`is_recovery_payment=true`)

### Stockage fichiers — DigitalOcean Spaces
- **Disk Laravel** : `spaces` (driver S3, `FILESYSTEM_DISK=spaces`)
- **Service** : `ImageOptimizerService` via GD natif PHP (pas intervention/image)
  - Photos de profil → crop 400×400, WebP 80%
  - Images messages → scale max 1200px, WebP 80%
  - PDF/audio → upload direct sans traitement
- **Accesseur `profile_photo_url`** sur `StudentProfile` et `TeacherProfile` : `.webp` → URL Spaces CDN, autres extensions → URL disk `public` (anciens fichiers pré-migration)
- **`UserAvatar`** : détecte automatiquement si l'URL est complète (Spaces) ou un chemin local (legacy)
- **Variables `.env`** : `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION=fra1`, `DO_SPACES_BUCKET=institut-fitra-media`, `DO_SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com`, `DO_SPACES_CDN_ENDPOINT=https://institut-fitra-media.fra1.cdn.digitaloceanspaces.com`

### Format réponses API
```php
response()->json(['class' => $class])      // ClassController
response()->json(['sessions' => $data])    // SessionController (paginé)
response()->json(['students' => $data])    // ClassController::students()
```

---

## 7. Charte Graphique

```js
primary: '#7B5A4B'    // Brun Cannelle
secondary: '#374151'  // Gris Ardoise
background: '#FAF9F6' // Papier Crème
```
Polices : **Playfair Display** (titres) | **Inter** (corps) | **Amiri** (arabe)

---

## 8. Types TypeScript Clés (`lib/types/index.ts`)

```typescript
User       { id, email, role: 'student'|'teacher'|'admin', first_name, last_name, student_profile?, teacher_profile? }
Program    { id, name, teacher_id, price, max_installments, default_class_id?, default_class?, levels?, levels_count? }  // plus de schedule
ProgramLevel { id, program_id, level_number (≥2), name, price, max_installments, schedule?, teacher_id?, is_active (calculé), activations? }
ProgramLevelActivation { id, program_level_id, class_id, activated_by, activated_at }
ClassModel { id, program_id, name, academic_year, start_date, end_date, status, zoom_link?, schedule: ProgramSchedule[], parent_class_id?, parent_class?, child_classes?, current_period? }
Session    { id, class_id, teacher_id, title, scheduled_at, duration_minutes, status, replay_url?, replay_validity_days?, replay_valid?, replay_expires_at?, class?, materials? }
Order      { id, student_id, program_id, class_id, total_amount, installments_count, payment_method, status, level_number?, program_level_id? }
OrderPayment { id, order_id, amount, installment_number, status, scheduled_at, paid_at, recovery_for_payment_id?, is_recovery_payment?, is_recovered? }
Message    { id, sender_id, receiver_id?, group_id?, content, attachment_path?, attachment_type?, attachment_url?, read_at?, sent_at }
```

---

## 9. Commandes Utiles

```bash
# Backend
cd backend && php artisan serve --port=8001   # Port 8001
php artisan migrate && php artisan db:seed
php artisan test                               # 104 tests
./vendor/bin/pint                              # Formatage

# Frontend (vitrine + backoffice)
cd frontend-web && npm run dev                 # Port 3020
npm run build

# Éditeur de documents
cd document-editor && npm run dev              # Port 3021
```

---

## 10. Infrastructure Production

### Serveur
- **DigitalOcean Droplet** : 2 Go RAM, Frankfurt, IP `164.92.231.175`
- **Panel** : Ploi.io Basic (8 €/mois) — déploiement, SSL, Nginx
- **Stack** : Ubuntu 24.04, Nginx, PHP 8.4, MySQL 8.4, Redis

### Déploiement
- **Backend** : Ploi déploie depuis GitHub `main` → `/home/ploi/api.institut-fitra.com/backend/`
- **Frontend** : Vercel déploie depuis GitHub `main` → `frontend-web/`
- **Auto-deploy** : chaque push sur `main` déclenche un déploiement automatique

### DNS (Hostinger)
| Enregistrement | Pointe vers |
|---|---|
| `@` A | `216.198.79.1` (Vercel) |
| `www` CNAME | `67e31593668c687c.vercel-dns-017.com.` (Vercel) |
| `app` CNAME | `67e31593668c687c.vercel-dns-017.com.` (Vercel) |
| `api` A | `164.92.231.175` (DigitalOcean) |

### Variables d'environnement clés
- `.env` Laravel : géré via Ploi → Edit environment
- Vercel : `NEXT_PUBLIC_API_URL=https://api.institut-fitra.com/api`
- Emails : `MAIL_MAILER=resend`, `RESEND_API_KEY=re_...`, `MAIL_FROM_ADDRESS=noreply@institut-fitra.com`, `FRONTEND_URL=https://app.institut-fitra.com`
- Spaces : `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION=fra1`, `DO_SPACES_BUCKET=institut-fitra-media`, `DO_SPACES_ENDPOINT`, `DO_SPACES_CDN_ENDPOINT`, `FILESYSTEM_DISK=spaces`

### Config Nginx (prod)
- CORS géré au niveau Nginx (`location /` → OPTIONS 204)
- Fichier : `/etc/nginx/sites-available/api.institut-fitra.com`
- `backend/config/cors.php` : allowed_origins = app, www, institut-fitra.com
- `bootstrap/app.php` : `HandleCors` middleware prepend explicite

---

## 11. État du Projet (01/06/2026)

### ✅ Complété
- Auth (login, register, forgot/reset password)
- BDD complète + modèles Laravel + relations
- Gestion programmes, niveaux multi-classes, classes (hiérarchie parent/enfant)
- Génération automatique de sessions
- Espace Admin : dashboard, users, programmes, classes, sessions, commandes, messages, tracking, contact-messages
- Espace Élève : dashboard, planning, supports, replays, messagerie, profil éditable
- Messagerie interne (directs + groupes + pièces jointes)
- Stripe Checkout (paiement unique, multi-versements, régularisation échecs)
- Formulaires de suivi (tracking forms)
- Emails transactionnels : confirmation inscription, identifiants nouveau compte, reset password
- Déploiement production (DigitalOcean + Ploi + Vercel), DNS + SSL tous verts
- Auto-deploy GitHub → Ploi + Vercel
- Stockage DigitalOcean Spaces (photos, supports, pièces jointes) + conversion WebP automatique
- Replays Bunny Stream : l'admin colle l'URL ou le code embed complet
- Commandes manuelles : `class_id` sélectionnable directement sans `default_class_id`
- **Refonte site vitrine** (30/03/2026) :
  - Nouveau menu : Accueil / Cursus / Séminaire / Contact (suppression `/about`)
  - `/about` redirige vers `/`
  - Page `/cursus` : StudyPathSection + ProgramYearSection + FAQSection + bouton inscription
  - Page `/seminaire` : entièrement statique (pourquoi, thématiques, prochain séminaire, placeholders)
  - Page accueil restructurée : Hero → Mission → Valeurs → Piliers (+ bouton Explorer) → Équipe → Teaser Séminaire
  - Bouton "Explorer en détail le cursus" intégré dans PillarsSection (marron, icônes animées)
  - Bouton "Je m'inscris au cursus" intégré dans ProgramYearSection
- **Refonte contenu vitrine** (17/05/2026) :
  - Menu : onglet "Séminaire" masqué (page conservée, non accessible via nav)
  - Page accueil : nouveaux textes hero, mission, valeurs, piliers, direction Cheikh Abdelbasset, teaser séminaire
  - Page cursus : matières tronc commun refaites (Quran, Hadith & Sīra, Fiqh, Tazkiyah, Fikr avec descriptions détaillées)
  - Étape 2 renommée "Les Clés des Sciences : Vision Globale" (2 ans, texte descriptif)
  - Étape 3 "Programme de Spécialisation" simplifiée (style sobre, "À venir")
  - Section "Programme de la 1ère Année" (`ProgramYearSection`) retirée de la page cursus (composant conservé)
  - FAQ : 3 réponses mises à jour, question "suivi personnalisé" supprimée
  - Page contact : Telegram remplace téléphone, adresse et horaires supprimés, Instagram seul dans "Suivez-nous"
- **Page admin messages de contact** (17/05/2026) :
  - Route : `/admin/contact-messages`
  - Liste + détail côte à côte, filtres statut/recherche
  - Marquage lu automatique, changement de statut (nouveau/en cours/résolu), suppression, bouton répondre par email
  - Lien ajouté dans `AdminSidebar` (groupe principal, avant Messagerie)
  - Les messages sont stockés en BDD (`contact_messages`), aucun email de notification n'est envoyé
- **Gestion par niveau** (01/06/2026) :
  - Page admin élèves de la classe : carte info en grille 3 colonnes (programme / niveau actuel / horaires de la classe), pills de **sélecteur de niveau** (niveau 1 = tous les inscrits, niveau 2+ = réinscrits uniquement avec stats payé/en cours)
  - **Montée de niveau via l'ajout manuel** : sélecteur de niveau + liste déroulante des élèves inscrits, activation gratuite ou en espèces ; badge niveau sur la ligne de commande ; ligne "Gratuit" dans le suivi de paiement élève ; bloc de réinscription qui disparaît automatiquement
  - **Accès élève cloisonné par niveau** : sessions, supports et replays d'un niveau supérieur invisibles/non téléchargeables tant que l'élève n'a pas payé ce niveau (`Session::scopeVisibleToStudent`, `ProgramLevelService::accessibleLevelIds`) — couvert par 3 tests dédiés
- **Stripe live** (✅ configuré en prod) : clés + webhook actifs ; favicon validé sur Google Search Console

### ⏳ À développer
- **Phase 6** : Espace Professeur (API ready, frontend absent)
- **Phase 7** : App Mobile Flutter
