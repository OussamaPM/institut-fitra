<x-mail::message>
# Bonjour {{ $student->first_name }},

Vous avez été transféré(e) de la classe **{{ $fromClass->name }}** vers la classe **{{ $toClass->name }}**.

Vos paiements sont conservés et rattachés à votre nouvelle classe.

@if(count($missingLevels) > 0)
@foreach($missingLevels as $missing)
- Le **Niveau {{ $missing['level_number'] }}{{ $missing['name'] ? ' — '.$missing['name'] : '' }}** n'est pas encore ouvert dans votre nouvelle classe : son contenu sera de nouveau accessible dès son ouverture.
@endforeach
@endif

---

## Votre nouvelle classe

- **Classe** : {{ $toClass->name }}
@if($toClass->academic_year)
- **Année académique** : {{ $toClass->academic_year }}
@endif
@if($toClass->start_date)
- **Début** : {{ \Carbon\Carbon::parse($toClass->start_date)->format('d/m/Y') }}
@endif
@if($toClass->end_date)
- **Fin** : {{ \Carbon\Carbon::parse($toClass->end_date)->format('d/m/Y') }}
@endif

@if(count($schedule) > 0)
### Horaires

@foreach($schedule as $slot)
- **{{ ucfirst($slot['day']) }}** : {{ $slot['start_time'] }} - {{ $slot['end_time'] }}
@endforeach
@endif

---

Votre planning, vos supports de cours et le lien de vos sessions en ligne sont à jour dans votre espace personnel.

<x-mail::button :url="$dashboardUrl" color="primary">
Accéder à mon espace
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
