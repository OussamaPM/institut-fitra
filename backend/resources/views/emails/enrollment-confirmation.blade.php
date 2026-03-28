<x-mail::message>
# Bonjour {{ $student->first_name }},

Votre inscription est confirmée ! Nous sommes ravis de vous accueillir à l'Institut Fitra.

---

## Détails de votre inscription

@if($program)
- **Programme** : {{ $program->name }}
@endif
@if($class)
- **Classe** : {{ $class->name }}
@if($class->academic_year)
- **Année académique** : {{ $class->academic_year }}
@endif
@if($class->start_date)
- **Début** : {{ \Carbon\Carbon::parse($class->start_date)->format('d/m/Y') }}
@endif
@if($class->end_date)
- **Fin** : {{ \Carbon\Carbon::parse($class->end_date)->format('d/m/Y') }}
@endif
@endif

@if($program && $program->schedule && count($program->schedule) > 0)
### Horaires

@foreach($program->schedule as $slot)
- **{{ ucfirst($slot['day']) }}** : {{ $slot['start_time'] }} - {{ $slot['end_time'] }}
@endforeach
@endif

---

Accédez à votre espace personnel pour retrouver votre planning, vos supports de cours et vos sessions en ligne.

<x-mail::button :url="$dashboardUrl" color="primary">
Accéder à mon espace
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
