# Projet Institut Fitra - Documentation Technique

## 1. Architecture & Stack

```
Visiteurs → Site Vitrine (Next.js)  ─┐
Élèves   → App Mobile (Flutter)     ─┼→ Laravel API → MySQL + Stripe
Admin    → Web App (Next.js)        ─┘
```

- **Backend** : Laravel 12, PHP 8.4, MySQL, Sanctum — port 8000 (local) / `api.institut-fitra.com` (prod)
- **Frontend** : Next.js 14 (App Router), TypeScript, Tailwind CSS — port 3000 (local) / Vercel (prod)
- **Intégrations** : Stripe (paiements), Vimeo (replays), DigitalOcean Spaces (stockage fichiers + CDN)
- **Sous-domaines local** : `localhost:3000` → vitrine public | `app.localhost:3000` → backoffice
- **Sous-domaines prod** : `institut-fitra.com` → vitrine | `app.institut-fitra.com` → backoffice | `api.institut-fitra.com` → API Laravel

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
    ├── app/(public)/          # Site vitrine (page, about, programs, contact)
    ├── app/app/auth/          # Login
    ├── app/app/admin/         # Dashboard, users, programs, classes, sessions, orders, messages...
    ├── app/app/student/       # Dashboard, planning, supports, replays, messages, profile...
    ├── components/layout/     # AdminSidebar, StudentSidebar
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
  │    └── ProgramLevelActivations (liaison niveau ↔ classe, remplace is_active)
  └── ClassModel (instance annuelle, ex: "Promotion 2025/2026")
       ├── parent_class_id → ClassModel (hiérarchie promotions)
       ├── zoom_link (lien Zoom permanent — pas d'API Zoom)
       ├── Enrollments
       └── Sessions
            ├── SessionMaterials (PDF/images)
            ├── replay_url + replay_validity_days + replay_added_at
            └── Attendances
```

### Tables principales

| Table | Champs clés |
|-------|-------------|
| `users` | id, email, password, role, first_name, last_name |
| `student_profiles` | user_id, phone, date_of_birth, address, city, country, gender |
| `teacher_profiles` | user_id, phone, specialization, bio, gender |
| `programs` | name, description, teacher_id, schedule (JSON), price, max_installments, default_class_id |
| `classes` | program_id, name, academic_year, start_date, end_date, max_students, status, zoom_link, **parent_class_id** |
| `class_sessions` | class_id, teacher_id, title, scheduled_at, duration_minutes, status, replay_url, replay_validity_days, replay_added_at, color |
| `enrollments` | student_id, class_id, status, enrolled_at |
| `attendances` | session_id, student_id, attended, duration_minutes |
| `session_materials` | session_id, title, file_path, file_type |
| `messages` | sender_id, receiver_id, group_id, content, attachment_path, attachment_type, attachment_original_name, attachment_size, read_at, sent_at |
| `message_groups` | name, type (program/class/custom), program_id, class_id, created_by |
| `group_members` | group_id, user_id, joined_at |
| `notifications` | user_id, type (enum: session/message/enrollment/material/payment/level/**tracking**/other), category, title, message, action_url, read_at |
| `orders` | student_id, program_id, class_id, customer_email, total_amount, installments_count, payment_method, status, stripe_checkout_session_id, level_number, program_level_id |
| `order_payments` | order_id, amount, installment_number, status, scheduled_at, paid_at, stripe_payment_intent_id, recovery_for_payment_id, is_recovery_payment |
| `program_levels` | program_id, level_number (2,3,4...), name, description, price, max_installments, schedule (JSON), teacher_id |
| `program_level_activations` | program_level_id, class_id, activated_by, activated_at |
| `settings` | key, value (dont stripe_secret_key, stripe_webhook_secret) |

**Format schedule** : `[{"day": "lundi", "start_time": "10:00", "end_time": "12:00"}]`

---

## 5. API Endpoints

### Auth
```
POST /api/auth/register | login | logout
GET  /api/auth/me
```

### Programs & Levels
```
GET/POST         /api/programs
GET/PUT/DELETE   /api/programs/{id}
GET              /api/programs/teachers

GET/POST         /api/programs/{program}/levels
GET/PUT/DELETE   /api/programs/{program}/levels/{level}
POST             /api/programs/{program}/levels/{level}/activate    # multi-classes
POST             /api/programs/{program}/levels/{level}/deactivate  # ?class_id optionnel
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
POST                 /api/admin/orders/manual

POST  /api/checkout/create-session | /checkout/reinscription
POST  /api/stripe/webhook
GET   /api/checkout/status
POST  /api/student/stripe-portal
```

### Admin Dashboard & Users
```
GET  /api/admin/dashboard/stats | recent-users | upcoming-sessions | recent-classes | recent-enrollments
GET/POST/PUT/DELETE  /api/admin/users | /users/{id}
GET  /api/admin/students/{student}/levels-history
POST /api/contact
GET/PUT  /api/admin/contact-messages | /{id}
```

### Student
```
GET   /api/student/materials | reinscriptions | levels-history
GET   /api/student/failed-payments | payment-history
POST  /api/checkout/recovery
PUT   /api/student/profile
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
- Création ou modification des dates d'une classe → `SessionGeneratorService` génère les sessions récurrentes selon le `schedule` du programme
- Modification dates → **supprime TOUTES les sessions existantes** puis régénère
- `SessionController::index()` accepte `per_page` (défaut 15 ; frontend planning utilise `per_page: 500`)

### Replay Vimeo
- Backend calcule et retourne `replay_expires_at` et `replay_valid` (bool)
- Lien = iframe Vimeo (`https://player.vimeo.com/video/...`)

### Niveaux multi-classes (`program_level_activations`)
- `is_active` et `default_class_id` supprimés de `program_levels`
- Un niveau peut être actif sur plusieurs classes simultanément via la table de liaison
- Activation → emails aux élèves N-1 de chaque classe ciblée
- Routes : `activate` (body: `class_ids[]`) et `deactivate` (body: `class_id` optionnel)

### Hiérarchie des classes
- `parent_class_id` sur `classes` pour relier les promotions entre elles
- Page admin liste les classes groupées par programme, arborescence parent→enfants

### Messagerie — règles élèves
- Les élèves **ne peuvent pas initier** de conversation, seulement répondre si un admin leur a écrit
- Pièces jointes : images/PDF/audio, max 10 Mo, stockées dans `public/message-attachments/`

### Formulaires de suivi — notifications
- `TrackingFormController::assign()` crée une `Notification` (type `tracking`) pour chaque élève nouvellement assigné
- `GET /student/tracking/pending-count` retourne le nombre de formulaires actifs non complétés — utilisé par la sidebar pour afficher un point rouge sur "Mon suivi"

### Stripe
- Clés lues depuis la table `settings` (pas `.env`) : `stripe_secret_key`, `stripe_webhook_secret`
- Webhook `invoice.paid` : skip si `billing_reason === 'subscription_create'` (première facture déjà traitée)
- Régularisation paiements échoués : crée un NOUVEAU paiement (`is_recovery_payment=true`), le paiement échoué reste intact

### Stockage fichiers — DigitalOcean Spaces
- **Disk** : `spaces` (driver S3, bucket `institut-fitra-media`, région `fra1`)
- **CDN** : `https://institut-fitra-media.fra1.cdn.digitaloceanspaces.com`
- **Service** : `ImageOptimizerService` — conversion WebP via GD natif PHP (pas intervention/image)
  - Photos de profil → crop 400×400, WebP 80%
  - Images messages → scale max 1200px, WebP 80%
  - PDF/audio → upload direct sans traitement
- **Accesseur** `profile_photo_url` sur `StudentProfile` et `TeacherProfile` : détecte `.webp` → URL Spaces CDN, autres extensions → URL disk `public` (anciens fichiers)
- **Variables `.env`** : `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION=fra1`, `DO_SPACES_BUCKET`, `DO_SPACES_ENDPOINT`, `DO_SPACES_CDN_ENDPOINT`, `FILESYSTEM_DISK=spaces`
- Anciens fichiers (`.jpg`/`.png`) restent sur le disk `public` local — pas de migration nécessaire

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
Program    { id, name, teacher_id, schedule: ProgramSchedule[], price, max_installments, default_class_id?, levels?, levels_count? }
ProgramLevel { id, program_id, level_number (≥2), name, price, max_installments, schedule?, teacher_id?, is_active (calculé), activations? }
ProgramLevelActivation { id, program_level_id, class_id, activated_by, activated_at }
ClassModel { id, program_id, name, academic_year, start_date, end_date, status, zoom_link?, parent_class_id?, parent_class?, child_classes? }
Session    { id, class_id, teacher_id, title, scheduled_at, duration_minutes, status, replay_url?, replay_validity_days?, replay_valid?, replay_expires_at?, class?, materials? }
Order      { id, student_id, program_id, class_id, total_amount, installments_count, payment_method, status, level_number?, program_level_id? }
OrderPayment { id, order_id, amount, installment_number, status, scheduled_at, paid_at, recovery_for_payment_id?, is_recovery_payment?, is_recovered? }
Message    { id, sender_id, receiver_id?, group_id?, content, attachment_path?, attachment_type?, attachment_url?, read_at?, sent_at }
```

---

## 9. Commandes Utiles

```bash
# Backend
cd backend && php artisan serve          # Port 8000
php artisan migrate && php artisan db:seed
php artisan test                          # 104 tests
./vendor/bin/pint                         # Formatage

# Frontend
cd frontend-web && npm run dev            # Port 3000
npm run build
```

---

## 10. Infrastructure Production

### Serveur
- **DigitalOcean Droplet** : 2 Go RAM, Frankfurt, IP `164.92.231.175`
- **Panel** : Ploi.io (gestion serveur, déploiement, SSL)
- **Stack serveur** : Ubuntu 24.04, Nginx, PHP 8.4, MySQL 8.4, Redis

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

### Variables d'environnement clés (prod)
- `.env` Laravel : géré via Ploi → Edit environment (fichier créé le 27/03/2026)
- Vercel : `NEXT_PUBLIC_API_URL=https://api.institut-fitra.com/api`

### Config Nginx personnalisée (prod)
- CORS géré au niveau Nginx dans `location /` (OPTIONS → 204)
- Fichier principal : `/etc/nginx/sites-available/api.institut-fitra.com`
- `backend/config/cors.php` présent (allowed_origins: app, www, institut-fitra.com)
- `bootstrap/app.php` : `HandleCors` middleware explicitement prepend

---

## 11. État du Projet (28/03/2026 — mis à jour)

### ✅ Complété
- Auth + BDD + modèles Laravel
- Gestion classes (multi-instances, hiérarchie parent_class_id)
- Génération auto sessions (Zoom lien manuel sur classe)
- Espace Admin complet (dashboard, users, programs, classes, sessions, orders, messages, tracking)
- Site vitrine (accueil, à propos, programmes, contact)
- Espace Élève complet (dashboard, planning, supports, replays, messagerie, profil éditable)
- Messagerie interne (directs + groupes + pièces jointes)
- Stripe Checkout (paiement unique, en plusieurs fois, régularisation échecs)
- Niveaux de programmes multi-classes avec système d'activation
- Formulaires de suivi (tracking forms)
- Responsive mobile espace élève
- **Déploiement production** (DigitalOcean + Ploi + Vercel)
- DNS tous verts (Hostinger + Vercel)
- SSL tous domaines ✓ (api via Let's Encrypt/Ploi, app/www/@ via Vercel)
- Migrations BDD exécutées en prod
- Compte admin créé : `lekfif.oussama@gmail.com`
- CORS résolu (Nginx + Laravel HandleCors)
- Auto-deploy GitHub → Ploi (webhook configuré)
- **Harmonisation site vitrine** : containers uniformisés (`max-w-7xl`), espacement vertical responsive, polices titres standardisées (`font-playfair`) sur toutes les sections
- Page À propos : "Oustadh" → "Cheikh Abdelbasset"
- **Emails transactionnels** : Resend configuré, domaine `institut-fitra.com` vérifié, envoi depuis `noreply@institut-fitra.com`
- **Mot de passe oublié / reset** : `POST /api/auth/forgot-password` + `POST /api/auth/reset-password`, token 60 min, pages frontend `/auth/forgot-password` et `/auth/reset-password`
- **Confirmation d'inscription** : `EnrollmentConfirmationMail` — déclenché à la création manuelle, au passage en `active`, et après paiement Stripe
- **Identifiants nouveau compte** : `NewAccountCredentialsMail` — envoyé par `StripeService` lors de la création d'un nouveau compte élève après paiement
- **Logo emails** : PNG fond blanc (`backend/public/logo-email.png`) servi depuis `api.institut-fitra.com/logo-email.png`
- **Page maintenance** : verset Sourate Ar-Rum [30] — s'affiche sur toutes les routes publiques (géré dans `(public)/layout.tsx`)
- **Bouton Connexion header** : redirige vers `app.[domaine]/auth/login` (corrigé pour `www.` et sous-domaine `app`)
- **Tronc Commun** : bloc Fikr ajouté (pleine largeur, 5ème matière)
- **Stockage Spaces** : photos de profil, supports de cours, pièces jointes messages → DigitalOcean Spaces CDN (WebP automatique)

### ⏳ À finaliser (prod)
- **Stripe live keys** : mettre `stripe_secret_key` et `stripe_webhook_secret` dans table `settings`, configurer webhook `https://api.institut-fitra.com/api/stripe/webhook` sur dashboard.stripe.com

### ⏳ À développer
- **Phase 6** : Espace Professeur (API ready, frontend absent)
- **Phase 7** : App Mobile Flutter

### Variables d'environnement prod (complètes)
```
MAIL_MAILER=resend
RESEND_API_KEY=re_...
MAIL_FROM_ADDRESS=noreply@institut-fitra.com
MAIL_FROM_NAME="Institut Fitra"
FRONTEND_URL=https://app.institut-fitra.com
```
