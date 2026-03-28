<x-mail::message>
# Bonjour {{ $student->first_name }},

Votre paiement a bien été reçu et votre compte Institut Fitra a été créé.

Voici vos identifiants pour accéder à votre espace élève :

<x-mail::panel>
**Email :** {{ $student->email }}

**Mot de passe :** {{ $temporaryPassword }}
</x-mail::panel>

> Pour votre sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion depuis votre profil.

<x-mail::button :url="$loginUrl" color="primary">
Accéder à mon espace
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
