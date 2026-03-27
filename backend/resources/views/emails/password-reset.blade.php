<x-mail::message>
# Bonjour {{ $user->first_name }},

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte **Institut Fitra**.

Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable **60 minutes**.

<x-mail::button :url="$resetUrl" color="primary">
Réinitialiser mon mot de passe
</x-mail::button>

Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe ne sera pas modifié.

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
