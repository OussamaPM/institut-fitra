<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Models\ProgramLevelActivation;
use App\Models\User;
use App\Services\LibraryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Couvre l'API admin de la bibliothèque : CRUD dossiers et items, ciblage d'accès,
 * publication, réordonnancement, pagination et téléchargement.
 */
class LibraryApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private ClassModel $class;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('spaces');

        $this->admin = User::factory()->create(['role' => 'admin']);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $this->class = ClassModel::factory()->create(['program_id' => $program->id]);
    }

    private function mediaFolder(array $attributes = []): LibraryFolder
    {
        return LibraryFolder::factory()->create($attributes);
    }

    // — Autorisations ——————————————————————————————————————————

    public function test_un_eleve_ne_peut_pas_acceder_a_la_bibliotheque_admin(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student)
            ->getJson('/api/admin/library/folders?category=media')
            ->assertForbidden();
    }

    public function test_un_professeur_ne_peut_pas_gerer_la_bibliotheque(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher)
            ->postJson('/api/admin/library/folders', [
                'category' => 'media',
                'title' => 'Test',
                'is_public' => true,
            ])
            ->assertForbidden();
    }

    public function test_un_visiteur_non_authentifie_est_rejete(): void
    {
        $this->getJson('/api/admin/library/folders?category=media')->assertUnauthorized();
    }

    // — Dossiers ———————————————————————————————————————————————

    public function test_l_admin_cree_un_dossier_cible_sur_une_classe(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/admin/library/folders', [
                'category' => 'media',
                'title' => 'Cours de Tajwid',
                'is_public' => false,
                'accesses' => [
                    ['class_id' => $this->class->id, 'level_number' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('folder.title', 'Cours de Tajwid')
            // Un dossier naît toujours en brouillon
            ->assertJsonPath('folder.status', 'draft')
            ->assertJsonPath('folder.items_count', 0);

        $this->assertDatabaseHas('library_folder_access', [
            'library_folder_id' => $response->json('folder.id'),
            'class_id' => $this->class->id,
            'level_number' => 1,
        ]);
    }

    public function test_un_dossier_non_public_sans_classe_est_refuse(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/admin/library/folders', [
                'category' => 'media',
                'title' => 'Orphelin',
                'is_public' => false,
                'accesses' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('accesses');
    }

    /**
     * Cibler un niveau non activé produirait un dossier publié que personne ne voit.
     */
    public function test_cibler_un_niveau_non_active_est_refuse(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/admin/library/folders', [
                'category' => 'media',
                'title' => 'Niveau fantôme',
                'is_public' => false,
                'accesses' => [
                    ['class_id' => $this->class->id, 'level_number' => 4],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('accesses.0.level_number');
    }

    public function test_cibler_un_niveau_active_est_accepte(): void
    {
        $level2 = ProgramLevel::create([
            'program_id' => $this->class->program_id,
            'level_number' => 2,
            'name' => 'Approfondissement',
            'price' => 300,
            'max_installments' => 3,
        ]);

        ProgramLevelActivation::create([
            'program_level_id' => $level2->id,
            'class_id' => $this->class->id,
            'start_date' => now(),
            'end_date' => now()->addMonths(6),
            'activated_by' => $this->admin->id,
            'activated_at' => now(),
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/admin/library/folders', [
                'category' => 'media',
                'title' => 'Réservé niveau 2',
                'is_public' => false,
                'accesses' => [['class_id' => $this->class->id, 'level_number' => 2]],
            ])
            ->assertCreated();
    }

    public function test_l_admin_renomme_un_dossier_sans_changer_sa_categorie(): void
    {
        $folder = $this->mediaFolder(['title' => 'Ancien titre']);

        $this->actingAs($this->admin)
            ->putJson("/api/admin/library/folders/{$folder->id}", [
                'title' => 'Nouveau titre',
                'is_public' => true,
            ])
            ->assertOk()
            ->assertJsonPath('folder.title', 'Nouveau titre');

        // La catégorie d'un dossier est figée : la changer déplacerait son contenu
        $this->actingAs($this->admin)
            ->putJson("/api/admin/library/folders/{$folder->id}", [
                'category' => 'resource',
                'title' => 'Nouveau titre',
                'is_public' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('category');
    }

    public function test_l_admin_publie_puis_depublie_un_dossier(): void
    {
        $folder = $this->mediaFolder(['is_public' => true]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/folders/{$folder->id}/status", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('folder.status', 'published')
            ->assertJsonPath('folder.is_published', true);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/folders/{$folder->id}/status", ['status' => 'draft'])
            ->assertOk()
            ->assertJsonPath('folder.status', 'draft');
    }

    public function test_publier_un_dossier_sans_destinataire_est_refuse(): void
    {
        $folder = $this->mediaFolder(['is_public' => false]); // aucune ligne d'accès

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/folders/{$folder->id}/status", ['status' => 'published'])
            ->assertStatus(422);

        $this->assertSame('draft', $folder->fresh()->status);
    }

    public function test_l_index_filtre_par_categorie(): void
    {
        $media = $this->mediaFolder(['title' => 'Vidéos']);
        $resource = LibraryFolder::factory()->resource()->create(['title' => 'PDF']);

        $ids = $this->actingAs($this->admin)
            ->getJson('/api/admin/library/folders?category=media')
            ->assertOk()
            ->json('folders.*.id');

        $this->assertContains($media->id, $ids);
        $this->assertNotContains($resource->id, $ids);
    }

    public function test_les_options_d_acces_listent_classes_et_niveaux(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/admin/library/access-options')
            ->assertOk()
            ->assertJsonPath('options.0.class_id', $this->class->id)
            ->assertJsonPath('options.0.levels.0.level_number', 1);
    }

    // — Items ——————————————————————————————————————————————————

    public function test_l_admin_ajoute_une_video_en_collant_le_code_iframe(): void
    {
        $folder = $this->mediaFolder();

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Leçon 1',
                'embed_url' => '<iframe src="https://player.mediadelivery.net/embed/12/abc" loading="lazy"></iframe>',
            ])
            ->assertCreated()
            // Seule l'URL est conservée, jamais le HTML collé
            ->assertJsonPath('item.embed_url', 'https://player.mediadelivery.net/embed/12/abc')
            ->assertJsonPath('item.type', 'video')
            ->assertJsonPath('item.position', 1);
    }

    /**
     * @dataProvider liensRefuses
     */
    public function test_un_lien_dangereux_est_refuse(string $lien): void
    {
        $folder = $this->mediaFolder();

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Douteux',
                'embed_url' => $lien,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('embed_url');
    }

    public static function liensRefuses(): array
    {
        return [
            'javascript' => ['javascript:alert(1)'],
            // http simple : isole la règle starts_with de la règle url
            'http non chiffré' => ['http://player.mediadelivery.net/embed/12/abc'],
            'identifiants trompeurs' => ['https://player.mediadelivery.net@evil.example/x'],
            'adresse IP' => ['https://127.0.0.1/admin'],
            'hôte local' => ['https://localhost/embed'],
        ];
    }

    /**
     * Plusieurs iframes collés : on ne devine pas lequel est le bon, on refuse.
     */
    public function test_plusieurs_iframes_colles_sont_refuses(): void
    {
        $folder = $this->mediaFolder();

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Deux',
                'embed_url' => '<iframe src="https://a.example/1"></iframe><iframe src="https://b.example/2"></iframe>',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('embed_url');
    }

    /**
     * Un attribut leurre placé avant le src ne doit pas être retenu à sa place.
     */
    public function test_un_attribut_data_src_ne_leurre_pas_l_extraction(): void
    {
        $folder = $this->mediaFolder();

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Leçon',
                'embed_url' => '<iframe data-src="https://evil.example/x" src="https://player.mediadelivery.net/embed/12/ok"></iframe>',
            ])
            ->assertCreated()
            ->assertJsonPath('item.embed_url', 'https://player.mediadelivery.net/embed/12/ok');
    }

    public function test_l_admin_ajoute_un_document_pdf(): void
    {
        $folder = LibraryFolder::factory()->resource()->create();

        $response = $this->actingAs($this->admin)
            ->post("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Fiche de révision',
                'file' => UploadedFile::fake()->create('fiche.pdf', 200, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('item.type', 'document')
            ->assertJsonPath('item.original_name', 'fiche.pdf')
            // Le chemin de stockage n'est jamais sérialisé, même pour un admin
            ->assertJsonMissingPath('item.file_path');

        $stored = LibraryItem::findOrFail($response->json('item.id'));

        $this->assertNotNull($stored->file_path);
        Storage::disk('spaces')->assertExists($stored->file_path);
    }

    public function test_un_fichier_non_pdf_est_refuse(): void
    {
        $folder = LibraryFolder::factory()->resource()->create();

        $this->actingAs($this->admin)
            ->post("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Image',
                'file' => UploadedFile::fake()->image('photo.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    /**
     * L'URL CDN est permanente : elle ne doit jamais partir dans une sérialisation.
     */
    public function test_l_url_du_fichier_n_est_jamais_serialisee(): void
    {
        $folder = LibraryFolder::factory()->resource()->create();
        LibraryItem::factory()->document()->create(['library_folder_id' => $folder->id]);

        $this->actingAs($this->admin)
            ->getJson("/api/admin/library/folders/{$folder->id}/items")
            ->assertOk()
            ->assertJsonMissingPath('items.data.0.file_url')
            ->assertJsonMissingPath('items.data.0.file_path')
            // L'item doit bien être présent : sans quoi les assertions ci-dessus
            // seraient vraies pour la mauvaise raison.
            ->assertJsonCount(1, 'items.data');
    }

    public function test_l_admin_modifie_le_titre_d_un_item(): void
    {
        $folder = $this->mediaFolder();
        $item = LibraryItem::factory()->create(['library_folder_id' => $folder->id]);

        $this->actingAs($this->admin)
            ->putJson("/api/admin/library/items/{$item->id}", [
                'title' => 'Titre corrigé',
            ])
            ->assertOk()
            ->assertJsonPath('item.title', 'Titre corrigé')
            // Le lien existant est conservé quand il n'est pas renvoyé
            ->assertJsonPath('item.embed_url', $item->embed_url);
    }

    public function test_les_items_sont_pagines_par_dix(): void
    {
        $folder = $this->mediaFolder();
        $service = app(LibraryService::class);

        for ($i = 1; $i <= 12; $i++) {
            $service->createItem($folder, [
                'title' => 'Vidéo '.$i,
                'embed_url' => 'https://player.mediadelivery.net/embed/1/v'.$i,
            ]);
        }

        $this->actingAs($this->admin)
            ->getJson("/api/admin/library/folders/{$folder->id}/items")
            ->assertOk()
            ->assertJsonCount(10, 'items.data')
            ->assertJsonPath('items.total', 12)
            ->assertJsonPath('items.data.0.title', 'Vidéo 1');

        $this->actingAs($this->admin)
            ->getJson("/api/admin/library/folders/{$folder->id}/items?page=2")
            ->assertOk()
            ->assertJsonCount(2, 'items.data')
            ->assertJsonPath('items.data.0.title', 'Vidéo 11');
    }

    public function test_l_admin_reordonne_les_items(): void
    {
        $folder = $this->mediaFolder();
        $service = app(LibraryService::class);

        $items = [];
        foreach (['A', 'B', 'C'] as $title) {
            $items[$title] = $service->createItem($folder, [
                'title' => $title,
                'embed_url' => 'https://player.mediadelivery.net/embed/1/'.$title,
            ]);
        }

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/items/{$items['C']->id}/move", ['direction' => 'up'])
            ->assertOk()
            ->assertJsonPath('moved', true)
            ->assertJsonPath('items.data.1.title', 'C')
            ->assertJsonPath('items.data.2.title', 'B');

        // Monter le premier item ne fait rien, sans erreur
        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/items/{$items['A']->id}/move", ['direction' => 'up'])
            ->assertOk()
            ->assertJsonPath('moved', false);
    }

    public function test_une_direction_invalide_est_refusee(): void
    {
        $folder = $this->mediaFolder();
        $item = LibraryItem::factory()->create(['library_folder_id' => $folder->id]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/items/{$item->id}/move", ['direction' => 'top'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('direction');
    }

    public function test_la_suppression_d_un_dossier_emporte_ses_items(): void
    {
        $folder = $this->mediaFolder();
        $item = LibraryItem::factory()->create(['library_folder_id' => $folder->id]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/admin/library/folders/{$folder->id}")
            ->assertOk();

        $this->assertDatabaseMissing('library_folders', ['id' => $folder->id]);
        $this->assertDatabaseMissing('library_items', ['id' => $item->id]);
    }

    /**
     * Un PDF renommé en .html partirait sur le CDN avec un Content-Type HTML :
     * une page active hébergée sur le domaine de l'institut.
     */
    public function test_un_pdf_deguise_en_html_est_refuse(): void
    {
        $folder = LibraryFolder::factory()->resource()->create();

        // Contenu réellement PDF (finfo le reconnaît) mais nommé .html : seule la
        // règle sur l'extension peut l'arrêter.
        $path = tempnam(sys_get_temp_dir(), 'lib').'.html';
        file_put_contents($path, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

        $this->assertSame('application/pdf', mime_content_type($path));

        $this->actingAs($this->admin)
            ->post("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Piège',
                'file' => new UploadedFile($path, 'rapport.html', 'application/pdf', null, true),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');

        @unlink($path);
    }

    public function test_un_fichier_envoye_dans_un_dossier_media_est_refuse(): void
    {
        $folder = $this->mediaFolder();

        $this->actingAs($this->admin)
            ->post("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Média avec fichier',
                'embed_url' => 'https://player.mediadelivery.net/embed/12/abc',
                'file' => UploadedFile::fake()->create('fiche.pdf', 50, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    public function test_le_nom_d_origine_est_assaini(): void
    {
        $folder = LibraryFolder::factory()->resource()->create();

        $this->actingAs($this->admin)
            ->post("/api/admin/library/folders/{$folder->id}/items", [
                'title' => 'Fiche',
                'file' => UploadedFile::fake()->create('<img src=x onerror=alert(1)>.pdf', 50, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('item.original_name', '<img src=x onerror=alert(1)>.pdf');
    }

    public function test_l_admin_corrige_le_type_d_un_media(): void
    {
        $folder = $this->mediaFolder();
        $item = LibraryItem::factory()->create(['library_folder_id' => $folder->id]);

        $this->actingAs($this->admin)
            ->putJson("/api/admin/library/items/{$item->id}", [
                'title' => $item->title,
                'type' => 'audio',
            ])
            ->assertOk()
            ->assertJsonPath('item.type', 'audio');

        $this->assertSame('audio', $item->fresh()->type);
    }

    /**
     * Le statut ne se change que par la route dédiée : l'accepter ici donnerait
     * un 200 pour une publication qui n'a pas eu lieu.
     */
    public function test_le_statut_ne_peut_pas_etre_change_par_l_update(): void
    {
        $folder = $this->mediaFolder(['is_public' => true]);

        $this->actingAs($this->admin)
            ->putJson("/api/admin/library/folders/{$folder->id}", [
                'title' => 'Renommé',
                'is_public' => true,
                'status' => 'published',
            ])
            ->assertOk();

        $this->assertSame('draft', $folder->fresh()->status);
    }

    /**
     * Cocher « Tout » alors que des classes restent sélectionnées côté front ne
     * doit pas produire une erreur de validation incompréhensible.
     */
    public function test_les_classes_sont_ignorees_quand_le_dossier_est_public(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/admin/library/folders', [
                'category' => 'media',
                'title' => 'Pour tous',
                'is_public' => true,
                'accesses' => [['class_id' => 999999, 'level_number' => 9]],
            ])
            ->assertCreated();

        $this->assertSame(0, LibraryFolder::find($response->json('folder.id'))->accesses()->count());
    }

    public function test_un_per_page_invalide_est_refuse(): void
    {
        $folder = $this->mediaFolder();

        $this->actingAs($this->admin)
            ->getJson("/api/admin/library/folders/{$folder->id}/items?per_page=-1")
            ->assertStatus(422)
            ->assertJsonValidationErrors('per_page');
    }

    public function test_la_recherche_n_interprete_pas_les_jokers(): void
    {
        $this->mediaFolder(['title' => 'Tajwid']);
        $this->mediaFolder(['title' => 'Fiqh']);

        $ids = $this->actingAs($this->admin)
            ->getJson('/api/admin/library/folders?category=media&search=%')
            ->assertOk()
            ->json('folders.*.id');

        $this->assertSame([], $ids);
    }

    /**
     * Un numéro de page hors bornes ramène la dernière page réelle plutôt qu'une
     * liste vide, qui donnerait un écran blanc au front.
     */
    public function test_le_numero_de_page_est_ramene_dans_les_bornes(): void
    {
        $folder = $this->mediaFolder();
        $service = app(LibraryService::class);

        $items = [];
        for ($i = 1; $i <= 11; $i++) {
            $items[] = $service->createItem($folder, [
                'title' => 'Vidéo '.$i,
                'embed_url' => 'https://player.mediadelivery.net/embed/1/v'.$i,
            ]);
        }

        $this->actingAs($this->admin)
            ->postJson("/api/admin/library/items/{$items[10]->id}/move", [
                'direction' => 'up',
                'page' => 99,
            ])
            ->assertOk()
            ->assertJsonPath('items.current_page', 2)
            ->assertJsonCount(1, 'items.data');
    }

    // — Téléchargement ————————————————————————————————————————

    public function test_un_eleve_ne_peut_pas_telecharger_un_document_d_un_niveau_non_paye(): void
    {
        $level2 = ProgramLevel::create([
            'program_id' => $this->class->program_id,
            'level_number' => 2,
            'name' => 'Approfondissement',
            'price' => 300,
            'max_installments' => 3,
        ]);

        $folder = LibraryFolder::factory()->resource()->published()->create();
        $folder->accesses()->create(['class_id' => $this->class->id, 'level_number' => $level2->level_number]);

        $item = LibraryItem::factory()->document()->create(['library_folder_id' => $folder->id]);
        Storage::disk('spaces')->put($item->file_path, 'pdf');

        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $this->class->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student)
            ->get("/api/library/items/{$item->id}/download")
            ->assertNotFound();
    }

    public function test_un_eleve_telecharge_un_document_de_son_niveau(): void
    {
        $folder = LibraryFolder::factory()->resource()->published()->create();
        $folder->accesses()->create(['class_id' => $this->class->id, 'level_number' => 1]);

        $item = LibraryItem::factory()->document()->create(['library_folder_id' => $folder->id]);
        Storage::disk('spaces')->put($item->file_path, 'pdf');

        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $this->class->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student)
            ->get("/api/library/items/{$item->id}/download")
            ->assertRedirect();
    }

    /**
     * Un dossier en brouillon reste invisible des élèves, même ciblé sur leur classe.
     */
    public function test_un_eleve_ne_telecharge_pas_un_document_en_brouillon(): void
    {
        $folder = LibraryFolder::factory()->resource()->create(); // draft
        $folder->accesses()->create(['class_id' => $this->class->id, 'level_number' => 1]);

        $item = LibraryItem::factory()->document()->create(['library_folder_id' => $folder->id]);
        Storage::disk('spaces')->put($item->file_path, 'pdf');

        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $this->class->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student)
            ->get("/api/library/items/{$item->id}/download")
            ->assertNotFound();
    }

    /**
     * Le contrôle d'accès passe avant tout autre test : répondre « ce n'est pas un
     * document » sur un item interdit révélerait son existence et sa nature, et
     * permettrait d'énumérer la bibliothèque, brouillons compris.
     */
    public function test_un_eleve_non_autorise_ne_distingue_pas_un_media_d_un_item_inexistant(): void
    {
        $folder = $this->mediaFolder(); // brouillon, aucun accès
        $item = LibraryItem::factory()->create(['library_folder_id' => $folder->id]);

        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $this->class->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student)
            ->getJson("/api/library/items/{$item->id}/download")
            ->assertNotFound()
            ->assertJsonPath('message', 'Document introuvable.');
    }

    /**
     * Un <a href> ne peut pas porter le jeton Sanctum : le client demande l'URL en
     * XHR puis navigue. La réponse JSON est donc le chemin réellement emprunté.
     */
    public function test_le_telechargement_renvoie_l_url_signee_en_json(): void
    {
        $folder = LibraryFolder::factory()->resource()->create();
        $item = LibraryItem::factory()->document()->create(['library_folder_id' => $folder->id]);
        Storage::disk('spaces')->put($item->file_path, 'pdf');

        $this->actingAs($this->admin)
            ->getJson("/api/library/items/{$item->id}/download")
            ->assertOk()
            ->assertJsonStructure(['url', 'original_name'])
            ->assertJsonPath('original_name', $item->original_name);
    }

    /**
     * Une iframe servie depuis notre propre origine partagerait le localStorage de
     * l'application : elle pourrait lire le jeton de qui affiche l'aperçu.
     */
    public function test_un_lien_vers_le_site_de_l_institut_est_refuse(): void
    {
        $folder = $this->mediaFolder();

        foreach (['https://app.institut-fitra.com/embed', 'https://institut-fitra.com/x'] as $lien) {
            $this->actingAs($this->admin)
                ->postJson("/api/admin/library/folders/{$folder->id}/items", [
                    'title' => 'Interne',
                    'embed_url' => $lien,
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('embed_url');
        }
    }

    public function test_l_admin_telecharge_n_importe_quel_document(): void
    {
        $folder = LibraryFolder::factory()->resource()->create(); // brouillon
        $item = LibraryItem::factory()->document()->create(['library_folder_id' => $folder->id]);
        Storage::disk('spaces')->put($item->file_path, 'pdf');

        $this->actingAs($this->admin)
            ->get("/api/library/items/{$item->id}/download")
            ->assertRedirect();
    }
}
