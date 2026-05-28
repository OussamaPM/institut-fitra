<x-mail::message>
# Félicitations {{ $student->first_name }} !

Votre **réinscription est confirmée**. Vous poursuivez votre parcours à l'Institut Fitra — bravo pour votre engagement et votre progression !

---

## Détails de votre réinscription

@if($program)
- **Programme** : {{ $program->name }}
@endif
@if($level)
- **Niveau** : Niveau {{ $level->level_number }} — {{ $level->name }}
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

@php($schedule = $level && $level->schedule ? $level->schedule : ($program->schedule ?? null))
@if($schedule && count($schedule) > 0)
### Horaires

@foreach($schedule as $slot)
- **{{ ucfirst($slot['day']) }}** : {{ $slot['start_time'] }} - {{ $slot['end_time'] }}
@endforeach
@endif

---

Retrouvez votre nouveau planning, vos supports de cours et vos sessions en ligne dans votre espace personnel.

<x-mail::button :url="$dashboardUrl" color="primary">
Accéder à mon espace
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
