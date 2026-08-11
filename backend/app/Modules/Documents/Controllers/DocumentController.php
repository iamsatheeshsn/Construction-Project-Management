<?php

namespace App\Modules\Documents\Controllers;

use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Models\DocumentVersion;
use App\Modules\Documents\Requests\StoreDocumentRequest;
use App\Modules\Documents\Requests\StoreDocumentVersionRequest;
use App\Modules\Documents\Requests\UpdateDocumentRequest;
use App\Modules\Documents\Resources\DocumentResource;
use App\Modules\Documents\Resources\DocumentVersionResource;
use App\Modules\Documents\Services\DocumentService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController
{
    public function __construct(private DocumentService $documents) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = Document::query()
            ->where('project_id', $project->id)
            ->withCount('versions')
            ->when($request->filled('document_type'), fn ($q) => $q->where('document_type', $request->string('document_type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return DocumentResource::collection($rows);
    }

    public function store(StoreDocumentRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();
        $file = $request->file('file');
        unset($data['file']);

        $document = $this->documents->create($project, $data, $file, $request->user()?->id);

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $document): DocumentResource
    {
        $model = Document::query()
            ->where('project_id', $project->id)
            ->with('versions')
            ->withCount('versions')
            ->findOrFail($document);

        return new DocumentResource($model);
    }

    public function update(UpdateDocumentRequest $request, Project $project, int $document): DocumentResource
    {
        $model = Document::query()->where('project_id', $project->id)->findOrFail($document);
        $updated = $this->documents->update($project, $model, $request->validated());

        return new DocumentResource($updated);
    }

    public function destroy(Project $project, int $document): JsonResponse
    {
        $model = Document::query()->where('project_id', $project->id)->findOrFail($document);
        $model->delete();

        return response()->json(['message' => 'Document deleted.']);
    }

    public function storeVersion(StoreDocumentVersionRequest $request, Project $project, int $document): JsonResponse
    {
        $model = Document::query()->where('project_id', $project->id)->findOrFail($document);
        $version = $this->documents->addVersion(
            $project,
            $model,
            $request->file('file'),
            $request->validated('change_notes'),
            $request->user()?->id
        );

        return (new DocumentVersionResource($version))->response()->setStatusCode(201);
    }

    public function approve(Request $request, Project $project, int $document): DocumentResource
    {
        $model = Document::query()->where('project_id', $project->id)->findOrFail($document);

        return new DocumentResource($this->documents->approve($project, $model, (int) $request->user()->id));
    }

    public function download(Project $project, int $document, ?int $version = null): StreamedResponse
    {
        $model = Document::query()->where('project_id', $project->id)->findOrFail($document);

        $file = $version
            ? DocumentVersion::query()->where('document_id', $model->id)->where('version_no', $version)->firstOrFail()
            : $this->documents->currentVersion($model);

        if (! $file || ! Storage::disk('local')->exists($file->file_path)) {
            abort(404, 'File not found.');
        }

        return Storage::disk('local')->download($file->file_path, $file->file_name);
    }
}
