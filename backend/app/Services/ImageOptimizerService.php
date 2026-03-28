<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageOptimizerService
{
    /**
     * Upload a profile photo: crop to 400×400, convert to WebP, store on Spaces.
     */
    public function uploadProfilePhoto(UploadedFile $file, string $folder): string
    {
        $webp = $this->resizeAndConvertToWebp($file->getRealPath(), 400, 400, crop: true);
        $filename = $folder.'/'.Str::uuid().'.webp';
        Storage::disk('spaces')->put($filename, $webp, 'public');

        return $filename;
    }

    /**
     * Upload a message image: scale down to max 1200px wide, convert to WebP, store on Spaces.
     */
    public function uploadMessageImage(UploadedFile $file, string $folder): string
    {
        $webp = $this->resizeAndConvertToWebp($file->getRealPath(), 1200, null, crop: false);
        $filename = $folder.'/'.Str::uuid().'.webp';
        Storage::disk('spaces')->put($filename, $webp, 'public');

        return $filename;
    }

    /**
     * Upload a non-image file (PDF, audio) directly to Spaces without processing.
     */
    public function uploadFile(UploadedFile $file, string $folder): string
    {
        $extension = $file->getClientOriginalExtension();
        $filename = $folder.'/'.Str::uuid().'.'.$extension;
        Storage::disk('spaces')->putFileAs('', $file, $filename, 'public');

        return $filename;
    }

    /**
     * Delete a file from Spaces (falls back to public disk for legacy files).
     */
    public function delete(?string $path): void
    {
        if (! $path) {
            return;
        }

        try {
            if (Storage::disk('spaces')->exists($path)) {
                Storage::disk('spaces')->delete($path);

                return;
            }
        } catch (\Exception $e) {
            Log::warning("ImageOptimizerService: could not delete {$path} from Spaces: ".$e->getMessage());
        }

        try {
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        } catch (\Exception $e) {
            Log::warning("ImageOptimizerService: could not delete {$path} from public disk: ".$e->getMessage());
        }
    }

    /**
     * Get the public CDN URL of a file.
     */
    public function url(string $path): string
    {
        return Storage::disk('spaces')->url($path);
    }

    /**
     * Resize and convert an image to WebP using native PHP GD.
     *
     * @param  string  $sourcePath  Absolute path to the source image
     * @param  int  $maxWidth  Target width (or max width if not cropping)
     * @param  int|null  $maxHeight  Target height (null = proportional)
     * @param  bool  $crop  true = cover crop, false = scale down preserving ratio
     */
    private function resizeAndConvertToWebp(string $sourcePath, int $maxWidth, ?int $maxHeight, bool $crop): string
    {
        [$origWidth, $origHeight] = getimagesize($sourcePath);
        $source = imagecreatefromstring(file_get_contents($sourcePath));

        if ($crop && $maxHeight !== null) {
            $ratio = max($maxWidth / $origWidth, $maxHeight / $origHeight);
            $scaledW = (int) round($origWidth * $ratio);
            $scaledH = (int) round($origHeight * $ratio);
            $scaled = imagescale($source, $scaledW, $scaledH, IMG_BICUBIC);
            $offsetX = (int) (($scaledW - $maxWidth) / 2);
            $offsetY = (int) (($scaledH - $maxHeight) / 2);
            $canvas = imagecreatetruecolor($maxWidth, $maxHeight);
            imagecopy($canvas, $scaled, 0, 0, $offsetX, $offsetY, $maxWidth, $maxHeight);
            imagedestroy($scaled);
        } else {
            if ($origWidth <= $maxWidth) {
                $canvas = $source;
                $source = null;
            } else {
                $ratio = $maxWidth / $origWidth;
                $newW = $maxWidth;
                $newH = (int) round($origHeight * $ratio);
                $canvas = imagescale($source, $newW, $newH, IMG_BICUBIC);
            }
        }

        ob_start();
        imagewebp($canvas, null, 80);
        $webpData = ob_get_clean();

        imagedestroy($canvas);
        if ($source !== null) {
            imagedestroy($source);
        }

        return $webpData;
    }
}
