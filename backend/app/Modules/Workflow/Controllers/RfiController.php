<?php

namespace App\Modules\Workflow\Controllers;

use App\Modules\Projects\Models\Project;
use App\Modules\Workflow\Models\Rfi;
use App\Modules\Workflow\Requests\AttachRfiDocumentRequest;
use App\Modules\Workflow\Requests\StoreRfiRequest;
use App\Modules\Workflow\Requests\StoreRfiResponseRequest;
use App\Modules\Workflow\Requests\UpdateRfiRequest;
use App\Modules\Workflow\Resources\RfiAttachmentResource;
use App\Modules\Workflow\Resources\RfiResource;
use App\Modules\Workflow\Resources\RfiResponseResource;
use App\Modules\Workflow\Services\RfiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RfiController
{
    public function __construct(private RfiService $rfis) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = Rfi::query()
            ->where('project_id', $project->id)
            ->with(['submitter:id,name,email', 'assignee:id,name,email'])
            ->withCount(['responses', 'attachments'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return RfiResource::collection($rows);
    }

    public function store(StoreRfiRequest $request, Project $project): JsonResponse
    {
        $rfi = $this->rfis->create($project, $request->validated(), $request->user()?->id);

        return (new RfiResource($rfi->loadCount(['responses', 'attachments'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $rfi): RfiResource
    {
        $model = Rfi::query()
            ->where('project_id', $project->id)
            ->with([
                'submitter:id,name,email',
                'assignee:id,name,email',
                'responses.responder:id,name,email',
                'attachments.document:id,title,document_no,document_type,status',
            ])
            ->withCount(['responses', 'attachments'])
            ->findOrFail($rfi);

        return new RfiResource($model);
    }

    public function update(UpdateRfiRequest $request, Project $project, int $rfi): RfiResource
    {
        $model = Rfi::query()->where('project_id', $project->id)->findOrFail($rfi);
        $updated = $this->rfis->update($project, $model, $request->validated());

        return new RfiResource($updated->loadCount(['responses', 'attachments']));
    }

    public function destroy(Project $project, int $rfi): JsonResponse
    {
        $model = Rfi::query()->where('project_id', $project->id)->findOrFail($rfi);
        $model->delete();

        return response()->json(['message' => 'RFI deleted.']);
    }

    public function submit(Request $request, Project $project, int $rfi): RfiResource
    {
        $model = Rfi::query()->where('project_id', $project->id)->findOrFail($rfi);

        return new RfiResource(
            $this->rfis->submit($project, $model, $request->user()?->id)->loadCount(['responses', 'attachments'])
        );
    }

    public function storeResponse(StoreRfiResponseRequest $request, Project $project, int $rfi): JsonResponse
    {
        $model = Rfi::query()->where('project_id', $project->id)->findOrFail($rfi);
        $response = $this->rfis->addResponse($project, $model, $request->validated(), $request->user()?->id);

        return (new RfiResponseResource($response))->response()->setStatusCode(201);
    }

    public function attach(AttachRfiDocumentRequest $request, Project $project, int $rfi): JsonResponse
    {
        $model = Rfi::query()->where('project_id', $project->id)->findOrFail($rfi);
        $attachment = $this->rfis->attachDocument($project, $model, (int) $request->validated('document_id'));
        $attachment->load('document:id,title,document_no,document_type,status');

        return (new RfiAttachmentResource($attachment))->response()->setStatusCode(201);
    }

    public function close(Project $project, int $rfi): RfiResource
    {
        $model = Rfi::query()->where('project_id', $project->id)->findOrFail($rfi);

        return new RfiResource($this->rfis->close($project, $model)->loadCount(['responses', 'attachments']));
    }
}
