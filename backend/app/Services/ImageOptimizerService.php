<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image;

class ImageOptimizerService
{
    /**
     * Upload a profile photo: resize to 400×400, convert to WebP, store on Spaces.
     */
    public function uploadProfilePhoto(UploadedFile $file, string $folder): string
    {
        $image = Image::read($file->getRealPath())
            ->cover(400, 400)
            ->toWebp(80);

        $filename = $folder . '/' . Str::uuid() . '.webp';
        Storage::disk('spaces')->put($filename, (string) $image, 'public');

        return $filename;
    }

    /**
     * Upload a message image attachment: resize max 1200px wide, convert to WebP.
     */
    public function uploadMessageImage(UploadedFile $file, string $folder): string
    {
        $image = Image::read($file->getRealPath())
            ->scaleDown(width: 1200)
            ->toWebp(80);

        $filename = $folder . '/' . Str::uuid() . '.webp';
        Storage::disk('spaces')->put($filename, (string) $image, 'public');

        return $filename;
    }

    /**
     * Upload a non-image file (PDF, audio) directly to Spaces without processing.
     */
    public function uploadFile(UploadedFile $file, string $folder): string
    {
        $extension = $file->getClientOriginalExtension();
        $filename = $folder . '/' . Str::uuid() . '.' . $extension;
        Storage::disk('spaces')->putFileAs('', $file, $filename, 'public');

        return $filename;
    }

    /**
     * Delete a file from Spaces.
     */
    public function delete(string $path): void
    {
        if ($path && Storage::disk('spaces')->exists($path)) {
            Storage::disk('spaces')->delete($path);
        }
    }

    /**
     * Get the public URL of a file via CDN.
     */
    public function url(string $path): string
    {
        return Storage::disk('spaces')->url($path);
    }
}
