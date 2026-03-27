<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, boolean, json
            $table->string('group')->default('general'); // general, stripe, zoom, maintenance
            $table->string('label')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_secret')->default(false); // Pour les clés API
            $table->timestamps();
        });

        // Insérer les paramètres par défaut
        DB::table('settings')->insert([
            // Maintenance
            [
                'key' => 'coming_soon_enabled',
                'value' => 'false',
                'type' => 'boolean',
                'group' => 'maintenance',
                'label' => 'Mode Coming Soon',
                'description' => 'Activer la page "Bientôt disponible" pour les visiteurs',
                'is_secret' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Stripe
            [
                'key' => 'stripe_public_key',
                'value' => null,
                'type' => 'string',
                'group' => 'stripe',
                'label' => 'Clé publique Stripe',
                'description' => 'Clé publique pour l\'intégration Stripe (pk_...)',
                'is_secret' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'stripe_secret_key',
                'value' => null,
                'type' => 'string',
                'group' => 'stripe',
                'label' => 'Clé secrète Stripe',
                'description' => 'Clé secrète pour l\'intégration Stripe (sk_...)',
                'is_secret' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'stripe_webhook_secret',
                'value' => null,
                'type' => 'string',
                'group' => 'stripe',
                'label' => 'Secret Webhook Stripe',
                'description' => 'Clé secrète pour valider les webhooks Stripe (whsec_...)',
                'is_secret' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Zoom
            [
                'key' => 'zoom_client_id',
                'value' => null,
                'type' => 'string',
                'group' => 'zoom',
                'label' => 'Client ID Zoom',
                'description' => 'Client ID de l\'application Zoom OAuth',
                'is_secret' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'zoom_client_secret',
                'value' => null,
                'type' => 'string',
                'group' => 'zoom',
                'label' => 'Client Secret Zoom',
                'description' => 'Client Secret de l\'application Zoom OAuth',
                'is_secret' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'zoom_account_id',
                'value' => null,
                'type' => 'string',
                'group' => 'zoom',
                'label' => 'Account ID Zoom',
                'description' => 'Account ID pour l\'API Server-to-Server',
                'is_secret' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
