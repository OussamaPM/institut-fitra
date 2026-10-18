<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Refus métier d'un changement de classe (rendu en 422 par le contrôleur).
 */
class ClassTransferException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $context  données renvoyées avec le message (ex. missing_levels)
     */
    public function __construct(string $message, public readonly array $context = [])
    {
        parent::__construct($message);
    }
}
