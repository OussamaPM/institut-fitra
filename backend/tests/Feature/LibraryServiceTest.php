<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
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
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Couvre LibraryService : création d'items, réordonnancement par échange,
 * renumérotation, synchronisation des accès et purge des fichiers sur Spaces.
 */
class LibraryServiceTest extends TestCase
{
    use RefreshDatabase;

    private LibraryService $service;

    private LibraryFolder $folder;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('spaces');

        $this->service = app(LibraryService::class);
        $this->folder = LibraryFolder::factory()->create();
    }

    /**
     * @return array<int, LibraryItem>
     */
    private function seedItems(int $count): array
    {
        $items = [];

        for ($i = 1; $i <= $count; $i++) {
            $items[] = LibraryItem::factory()->atPosition($i)->create([
                'library_folder_id' => $this->folder->id,
                'title' => 'Vidéo '.$i,
            ]);
        }

        return $items;
    }

    private function titlesInOrder(): array
    {
        return $this->folder->items()->pluck('title')->all();
    }

    // — Création ————————————————————————————————————————————————

    public function test_create_item_place_le_nouvel_item_a_la_fin(): void
    {
        $this->seedItems(3);

        $item = $this->service->createItem($this->folder, [
            'title' => 'Vidéo 4',
            'embed_url' => 'https://player.mediadelivery.net/embed/1/abc',
        ]);

        $this->assertSame(4, $item->position);
        $this->assertSame(['Vidéo 1', 'Vidéo 2', 'Vidéo 3', 'Vidéo 4'], $this->titlesInOrder());
    }

    public function test_create_item_derive_le_type_de_la_categorie_du_dossier(): void
    {
        $resourceFolder = LibraryFolder::factory()->resource()->create();

        $media = $this->service->createItem($this->folder, [
            'title' => 'Cours 1',
            'embed_url' => 'https://player.mediadelivery.net/embed/1/abc',
            'type' => LibraryItem::TYPE_AUDIO,
        ]);

        $document = $this->service->createItem($resourceFolder, ['title' => 'Fiche'], UploadedFile::fake()->create('fiche.pdf', 120));

        $this->assertSame(LibraryItem::TYPE_AUDIO, $media->type);
        $this->assertNull($media->file_path);

        // Le type est imposé par la catégorie, pas par le payload
        $this->assertSame(LibraryItem::TYPE_DOCUMENT, $document->type);
        $this->assertNull($document->embed_url);
        $this->assertSame('fiche.pdf', $document->original_name);
        Storage::disk('spaces')->assertExists($document->file_path);
    }

    public function test_create_item_refuse_un_media_sans_lien(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->createItem($this->folder, ['title' => 'Sans lien']);
    }

    public function test_create_item_refuse_une_ressource_sans_fichier(): void
    {
        $resourceFolder = LibraryFolder::factory()->resource()->create();

        $this->expectException(InvalidArgumentException::class);

        $this->service->createItem($resourceFolder, ['title' => 'Sans fichier']);
    }

    /**
     * La position n'est pas assignable en masse : un payload qui tente de l'imposer
     * ne doit pas pouvoir bousculer l'ordre du dossier.
     */
    public function test_la_position_n_est_pas_assignable_par_un_payload(): void
    {
        $this->seedItems(2);

        $item = $this->service->createItem($this->folder, [
            'title' => 'Intrus',
            'embed_url' => 'https://player.mediadelivery.net/embed/1/abc',
            'position' => 1,
        ]);

        $this->assertSame(3, $item->position);
        $this->assertSame(['Vidéo 1', 'Vidéo 2', 'Intrus'], $this->titlesInOrder());
    }

    // — Réordonnancement ————————————————————————————————————————

    public function test_move_up_echange_avec_l_item_precedent(): void
    {
        $items = $this->seedItems(3);

        $this->assertTrue($this->service->move($items[2], 'up'));
        $this->assertSame(['Vidéo 1', 'Vidéo 3', 'Vidéo 2'], $this->titlesInOrder());
        // L'instance passée reflète la nouvelle position, sans refresh côté appelant
        $this->assertSame(2, $items[2]->position);
    }

    public function test_move_down_echange_avec_l_item_suivant(): void
    {
        [$first] = $this->seedItems(3);

        $this->assertTrue($this->service->move($first, 'down'));
        $this->assertSame(['Vidéo 2', 'Vidéo 1', 'Vidéo 3'], $this->titlesInOrder());
    }

    public function test_move_up_sur_le_premier_item_ne_change_rien(): void
    {
        [$first] = $this->seedItems(3);

        $this->assertFalse($this->service->move($first, 'up'));
        $this->assertSame(['Vidéo 1', 'Vidéo 2', 'Vidéo 3'], $this->titlesInOrder());
    }

    public function test_move_down_sur_le_dernier_item_ne_change_rien(): void
    {
        $items = $this->seedItems(3);

        $this->assertFalse($this->service->move($items[2], 'down'));
        $this->assertSame(['Vidéo 1', 'Vidéo 2', 'Vidéo 3'], $this->titlesInOrder());
    }

    public function test_move_refuse_une_direction_invalide(): void
    {
        [$first] = $this->seedItems(2);

        $this->expectException(InvalidArgumentException::class);

        $this->service->move($first, 'top');
    }

    /**
     * Le réordonnancement porte sur la position globale, pas sur la page affichée :
     * remonter le 11e item (1er de la page 2) le fait basculer sur la page 1.
     */
    public function test_move_up_fait_changer_de_page_avec_une_pagination_de_10(): void
    {
        $items = $this->seedItems(12);

        $this->service->move($items[10], 'up'); // « Vidéo 11 »

        $firstPage = $this->folder->items()->limit(10)->pluck('title')->all();

        $this->assertContains('Vidéo 11', $firstPage);
        $this->assertNotContains('Vidéo 10', $firstPage);
    }

    /**
     * Même si deux items partagent une position (état dégradé), le départage par id
     * garantit un ordre stable et un déplacement d'un seul cran.
     */
    public function test_move_reste_coherent_avec_des_positions_egales(): void
    {
        $a = LibraryItem::factory()->atPosition(5)->create(['library_folder_id' => $this->folder->id, 'title' => 'A']);
        $b = LibraryItem::factory()->atPosition(6)->create(['library_folder_id' => $this->folder->id, 'title' => 'B']);
        $c = LibraryItem::factory()->atPosition(6)->create(['library_folder_id' => $this->folder->id, 'title' => 'C']);

        $this->assertSame(['A', 'B', 'C'], $this->titlesInOrder());

        // C monte d'UN cran : il passe devant B, pas devant A
        $this->assertTrue($this->service->move($c, 'up'));
        $this->assertSame(['A', 'C', 'B'], $this->titlesInOrder());
    }

    /**
     * La pagination ne doit ni dupliquer ni escamoter un item, y compris lorsque
     * plusieurs positions sont identiques.
     */
    public function test_la_pagination_est_stable_avec_des_positions_dupliquees(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            LibraryItem::factory()->atPosition(1)->create([
                'library_folder_id' => $this->folder->id,
                'title' => 'Item '.$i,
            ]);
        }

        $page1 = $this->folder->items()->limit(10)->offset(0)->pluck('id')->all();
        $page2 = $this->folder->items()->limit(10)->offset(10)->pluck('id')->all();
        $all = array_merge($page1, $page2);

        $this->assertCount(12, $all);
        $this->assertCount(12, array_unique($all));
    }

    /**
     * Test structurel assumé : SQLite renvoie les lignes par rowid, donc aucun test
     * comportemental ne peut démontrer le départage ici. En MySQL, l'ordre entre deux
     * positions égales n'est en revanche pas garanti d'une requête à l'autre, ce qui
     * ferait apparaître un item sur deux pages et en escamoterait un autre.
     */
    public function test_l_ordre_des_items_est_departage_par_id(): void
    {
        $sql = strtolower($this->folder->items()->toSql());
        $orderBy = substr($sql, (int) strripos($sql, 'order by'));

        $this->assertStringContainsString('position', $orderBy);
        $this->assertStringContainsString('id', $orderBy);
    }

    // — Suppression ————————————————————————————————————————————

    public function test_la_suppression_d_un_item_renumerote_les_positions(): void
    {
        $items = $this->seedItems(4);

        $this->service->deleteItem($items[1]);

        $this->assertSame([1, 2, 3], $this->folder->items()->pluck('position')->all());
        $this->assertSame(['Vidéo 1', 'Vidéo 3', 'Vidéo 4'], $this->titlesInOrder());
    }

    public function test_la_suppression_d_un_item_efface_son_fichier_sur_spaces(): void
    {
        $resourceFolder = LibraryFolder::factory()->resource()->create();

        $item = $this->service->createItem(
            $resourceFolder,
            ['title' => 'Fiche'],
            UploadedFile::fake()->create('fiche.pdf', 120),
        );
        $path = $item->file_path;

        Storage::disk('spaces')->assertExists($path);

        $this->service->deleteItem($item);

        Storage::disk('spaces')->assertMissing($path);
        $this->assertDatabaseMissing('library_items', ['id' => $item->id]);
    }

    public function test_resequence_repare_un_ordre_degrade(): void
    {
        LibraryItem::factory()->atPosition(0)->create(['library_folder_id' => $this->folder->id, 'title' => 'A']);
        LibraryItem::factory()->atPosition(7)->create(['library_folder_id' => $this->folder->id, 'title' => 'B']);
        LibraryItem::factory()->atPosition(7)->create(['library_folder_id' => $this->folder->id, 'title' => 'C']);

        $this->service->resequence($this->folder->id);

        $this->assertSame([1, 2, 3], $this->folder->items()->pluck('position')->all());
        $this->assertSame(['A', 'B', 'C'], $this->titlesInOrder());
    }

    public function test_la_suppression_d_un_dossier_efface_les_fichiers_sur_spaces(): void
    {
        $folder = LibraryFolder::factory()->resource()->create();

        $a = $this->service->createItem($folder, ['title' => 'A'], UploadedFile::fake()->create('a.pdf', 50));
        $b = $this->service->createItem($folder, ['title' => 'B'], UploadedFile::fake()->create('b.pdf', 50));

        $this->service->deleteFolder($folder);

        Storage::disk('spaces')->assertMissing($a->file_path);
        Storage::disk('spaces')->assertMissing($b->file_path);
        $this->assertDatabaseMissing('library_folders', ['id' => $folder->id]);
        $this->assertDatabaseMissing('library_items', ['library_folder_id' => $folder->id]);
    }

    // — Accès ——————————————————————————————————————————————————

    private function makeClass(): ClassModel
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);

        return ClassModel::factory()->create(['program_id' => $program->id]);
    }

    public function test_sync_access_remplace_les_regles_et_ignore_les_classes_si_public(): void
    {
        $class = $this->makeClass();

        $this->service->syncAccess($this->folder, false, [
            ['class_id' => $class->id, 'level_number' => 1],
        ]);

        $this->assertSame(1, $this->folder->accesses()->count());

        // Repasser en public purge les règles par classe : pas de ligne fantôme
        $this->service->syncAccess($this->folder, true, [
            ['class_id' => $class->id, 'level_number' => 2],
        ]);

        $this->assertSame(0, $this->folder->accesses()->count());
        $this->assertTrue($this->folder->fresh()->is_public);
    }

    public function test_sync_access_deduplique_les_entrees_identiques(): void
    {
        $class = $this->makeClass();

        $this->service->syncAccess($this->folder, false, [
            ['class_id' => $class->id, 'level_number' => 2],
            ['class_id' => $class->id, 'level_number' => 2],
            ['class_id' => $class->id, 'level_number' => 1],
        ]);

        $this->assertSame(2, $this->folder->accesses()->count());
    }

    /**
     * Un dossier non public sans destinataire ne serait visible de personne :
     * il est refusé plutôt que publié dans le vide.
     */
    public function test_sync_access_refuse_un_dossier_non_public_sans_classe(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->syncAccess($this->folder, false, []);
    }

    public function test_access_options_liste_le_niveau_1_et_les_niveaux_actives(): void
    {
        $class = $this->makeClass();
        $admin = User::factory()->create(['role' => 'admin']);

        $level2 = ProgramLevel::create([
            'program_id' => $class->program_id,
            'level_number' => 2,
            'name' => 'Approfondissement',
            'price' => 300,
            'max_installments' => 3,
        ]);

        // Niveau 3 créé mais JAMAIS activé sur cette classe : il ne doit pas être proposé
        ProgramLevel::create([
            'program_id' => $class->program_id,
            'level_number' => 3,
            'name' => 'Spécialisation',
            'price' => 400,
            'max_installments' => 3,
        ]);

        ProgramLevelActivation::create([
            'program_level_id' => $level2->id,
            'class_id' => $class->id,
            'start_date' => now(),
            'end_date' => now()->addMonths(6),
            'activated_by' => $admin->id,
            'activated_at' => now(),
        ]);

        $options = collect($this->service->accessOptions())->firstWhere('class_id', $class->id);

        $this->assertNotNull($options);
        $this->assertSame([1, 2], array_column($options['levels'], 'level_number'));
        $this->assertNotNull($options['program_id']);
    }

    public function test_access_options_ecarte_les_classes_annulees(): void
    {
        $class = $this->makeClass();
        $class->update(['status' => 'cancelled']);

        $ids = array_column($this->service->accessOptions(), 'class_id');

        $this->assertNotContains($class->id, $ids);
    }
}
