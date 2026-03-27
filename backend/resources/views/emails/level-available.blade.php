<x-mail::message>
# Bonjour {{ $student->first_name }},

Les réinscriptions pour le programme **{{ $program->name }}** sont maintenant ouvertes !

## {{ $level->name }}

@if($level->description)
{{ $level->description }}
@endif

---

### Informations

- **Programme** : {{ $program->name }}
- **Niveau** : {{ $level->name }}
- **Prix** : {{ number_format($level->price, 2, ',', ' ') }} €

@if($level->max_installments > 1)
- **Paiement** : Possible en {{ $level->max_installments }} fois
@endif

@if($activatedClass)
### Session {{ $activatedClass->academic_year }}

- **Début** : {{ \Carbon\Carbon::parse($activatedClass->start_date)->format('d/m/Y') }}
- **Fin** : {{ \Carbon\Carbon::parse($activatedClass->end_date)->format('d/m/Y') }}
@endif

@if($level->schedule && count($level->schedule) > 0)
### Horaires

@foreach($level->schedule as $slot)
- **{{ ucfirst($slot['day']) }}** : {{ $slot['start_time'] }} - {{ $slot['end_time'] }}
@endforeach
@endif

---

<x-mail::button :url="$reinscriptionUrl" color="primary">
S'inscrire au {{ $level->name }}
</x-mail::button>

Pour vous inscrire, connectez-vous à votre espace personnel et rendez-vous dans la section "Réinscription".

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
