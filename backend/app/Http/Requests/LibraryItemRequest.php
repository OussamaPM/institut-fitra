<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use App\Services\LibraryService;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LibraryItemRequest extends FormRequest
{
    /** Taille maximale d'un document, en kilo-octets (20 Mo). */
    public const MAX_FILE_KB = 20480;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * L'admin peut coller l'URL du player ou le code <iframe> complet : on n'en
     * conserve que le src, jamais de HTML, ce qui ferme la porte à toute injection
     * au moment du rendu.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('embed_url')) {
            $this->merge([
                'embed_url' => LibraryService::extractEmbedUrl((string) $this->input('embed_url')),
            ]);
        }
    }

    public function rules(): array
    {
        $isCreation = $this->isMethod('POST');
        $folder = $this->resolveFolder();
        $isMedia = $folder?->category === LibraryFolder::CATEGORY_MEDIA;

        return [
            'title' => 'required|string|max:255',
            'type' => ['nullable', Rule::in([LibraryItem::TYPE_VIDEO, LibraryItem::TYPE_AUDIO])],
            'embed_url' => [
                // En édition, ne renvoyer que le titre est légitime : le lien est
                // alors conservé tel quel.
                ...($isMedia ? ($isCreation ? ['required'] : ['sometimes', 'required']) : ['prohibited']),
                'string',
                'url',
                'starts_with:https://',
                'max:2048',
                $this->safeHostRule(),
            ],
            'file' => [
                // Un fichier envoyé dans un dossier média serait uploadé puis jeté.
                ...($isMedia ? ['prohibited'] : ($isCreation ? ['required'] : ['nullable'])),
                'file',
                // mimetypes contrôle le CONTENU, extensions contrôle le NOM : sans la
                // seconde, un PDF nommé .html devient une page active sur le CDN.
                'mimetypes:application/pdf',
                'extensions:pdf',
                'max:'.self::MAX_FILE_KB,
            ],
        ];
    }

    /**
     * Rejette les hôtes qui ne peuvent pas être une plateforme d'hébergement légitime.
     *
     * On n'impose volontairement pas de liste blanche de fournisseurs — le besoin est
     * de pouvoir coller un embed de n'importe quelle plateforme — mais on ferme les
     * formes trompeuses ou internes : identifiants dans l'URL (https://bunny@evil.tld
     * pointe sur evil.tld), adresses IP, et hôtes locaux.
     */
    private function safeHostRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $parts = parse_url((string) $value);

            if ($parts === false || empty($parts['host'])) {
                $fail('Le lien fourni n\'est pas une URL valide.');

                return;
            }

            if (isset($parts['user']) || isset($parts['pass'])) {
                $fail('Le lien ne doit pas contenir d\'identifiants avant le nom de domaine.');

                return;
            }

            $host = strtolower($parts['host']);

            if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
                $fail('Le lien doit pointer vers un nom de domaine, pas une adresse IP.');

                return;
            }

            if ($host === 'localhost' || str_ends_with($host, '.local') || ! str_contains($host, '.')) {
                $fail('Le lien doit pointer vers une plateforme accessible publiquement.');

                return;
            }

            // Une iframe servie depuis notre propre origine partagerait le localStorage
            // de l'application : elle pourrait lire le jeton de qui affiche l'aperçu.
            if (in_array($host, self::forbiddenHosts(), true)) {
                $fail('Le lien ne peut pas pointer vers le site de l\'institut.');
            }
        };
    }

    /**
     * Hôtes de l'application, interdits comme source d'iframe.
     *
     * @return array<int, string>
     */
    private static function forbiddenHosts(): array
    {
        $hosts = ['institut-fitra.com', 'www.institut-fitra.com', 'app.institut-fitra.com', 'api.institut-fitra.com'];

        foreach ([config('app.url'), config('app.frontend_url'), env('FRONTEND_URL')] as $configured) {
            $host = $configured ? parse_url((string) $configured, PHP_URL_HOST) : null;

            if ($host) {
                $hosts[] = strtolower($host);
            }
        }

        return array_values(array_unique($hosts));
    }

    /**
     * Le dossier vient de la route à la création, de l'item édité sinon.
     */
    private function resolveFolder(): ?LibraryFolder
    {
        if ($this->route('folder') instanceof LibraryFolder) {
            return $this->route('folder');
        }

        if ($this->route('item') instanceof LibraryItem) {
            return $this->route('item')->folder;
        }

        return null;
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Le titre est obligatoire.',
            'title.string' => 'Le titre doit être un texte.',
            'title.max' => 'Le titre ne peut pas dépasser 255 caractères.',
            'type.in' => 'Le type doit être « video » ou « audio ».',
            'embed_url.required' => 'Le lien iframe est obligatoire pour un contenu vidéo ou audio.',
            'embed_url.prohibited' => 'Un document ne peut pas avoir de lien iframe.',
            'embed_url.string' => 'Le lien doit être un texte. Si vous avez collé plusieurs iframes, n\'en gardez qu\'un.',
            'embed_url.url' => 'Le lien fourni n\'est pas une URL valide.',
            'embed_url.starts_with' => 'Le lien doit être sécurisé (https).',
            'embed_url.max' => 'Le lien est trop long (2048 caractères maximum).',
            'file.required' => 'Le document PDF est obligatoire.',
            'file.prohibited' => 'Un contenu vidéo ou audio s\'ajoute avec un lien, pas un fichier.',
            'file.file' => 'Le document envoyé est invalide.',
            'file.mimetypes' => 'Seuls les fichiers PDF sont acceptés.',
            'file.extensions' => 'Le fichier doit porter l\'extension .pdf.',
            'file.max' => 'Le fichier ne doit pas dépasser 20 Mo.',
        ];
    }
}
