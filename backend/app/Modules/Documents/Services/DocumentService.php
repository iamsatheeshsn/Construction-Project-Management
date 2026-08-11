<?php

namespace App\Modules\Documents\Services;

use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Models\DocumentVersion;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DocumentService
{
    public function create(Project $project, array $data, ?UploadedFile $file = null, ?int $userId = null): Document
    {
        return DB::transaction(function () use ($project, $data, $file, $userId) {
            $data['project_id'] = $project->id;
            $data['uploaded_by'] = $userId;
            $data['document_type'] = $data['document_type'] ?? 'other';
            $data['status'] = $data['status'] ?? 'draft';
            $data['current_version'] = $file ? 1 : 0;

            $document = Document::query()->create($data);

            if ($file) {
                $this->storeVersion($project, $document, $file, $data['change_notes'] ?? null, $userId, 1);
            }

            return $document->fresh()->load('versions')->loadCount('versions');
        });
    }

    public function update(Project $project, Document $document, array $data): Document
    {
        $this->assertProject($project, $document);
        unset($data['current_version'], $data['uploaded_by']);
        $document->update($data);

        return $document->fresh()->load('versions')->loadCount('versions');
    }

    public function addVersion(
        Project $project,
        Document $document,
        UploadedFile $file,
        ?string $changeNotes = null,
        ?int $userId = null
    ): DocumentVersion {
        $this->assertProject($project, $document);

        return DB::transaction(function () use ($project, $document, $file, $changeNotes, $userId) {
            $next = ((int) $document->current_version) + 1;
            $version = $this->storeVersion($project, $document, $file, $changeNotes, $userId, $next);
            $document->update([
                'current_version' => $next,
                'uploaded_by' => $userId ?? $document->uploaded_by,
            ]);

            return $version;
        });
    }

    public function approve(Project $project, Document $document, int $userId): Document
    {
        $this->assertProject($project, $document);

        if ((int) $document->current_version < 1) {
            throw ValidationException::withMessages([
                'document' => ['Upload a file version before approving.'],
            ]);
        }

        $document->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        return $document->fresh()->load('versions')->loadCount('versions');
    }

    public function currentVersion(Document $document): ?DocumentVersion
    {
        return DocumentVersion::query()
            ->where('document_id', $document->id)
            ->where('version_no', $document->current_version)
            ->first();
    }

    private function storeVersion(
        Project $project,
        Document $document,
        UploadedFile $file,
        ?string $changeNotes,
        ?int $userId,
        int $versionNo
    ): DocumentVersion {
        $dir = sprintf('tenants/%d/projects/%d/documents/%d', $document->tenant_id, $project->id, $document->id);
        $path = $file->storeAs($dir, sprintf('v%d_%s', $versionNo, $file->hashName()), 'local');

        return DocumentVersion::query()->create([
            'document_id' => $document->id,
            'version_no' => $versionNo,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'checksum' => hash_file('sha256', $file->getRealPath()) ?: null,
            'change_notes' => $changeNotes,
            'uploaded_by' => $userId,
        ]);
    }

    private function assertProject(Project $project, Document $document): void
    {
        if ((int) $document->project_id !== (int) $project->id) {
            abort(404);
        }
    }
}
