<?php

namespace App\Modules\Workflow\Controllers;

use App\Modules\Projects\Models\Project;
use App\Modules\Workflow\Models\Submittal;
use App\Modules\Workflow\Requests\AttachSubmittalDocumentRequest;
use App\Modules\Workflow\Requests\ReviewSubmittalRequest;
use App\Modules\Workflow\Requests\StoreSubmittalRequest;
use App\Modules\Workflow\Requests\UpdateSubmittalRequest;
use App\Modules\Workflow\Resources\SubmittalAttachmentResource;
use App\Modules\Workflow\Resources\SubmittalResource;
use App\Modules\Workflow\Services\SubmittalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubmittalController
{
    public function __construct(private SubmittalService $submittals) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = Submittal::query()
            ->where('project_id', $project->id)
            ->withCount('attachments')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return SubmittalResource::collection($rows);
    }

    public function store(StoreSubmittalRequest $request, Project $project): JsonResponse
    {
        $row = $this->submittals->create($project, $request->validated(), $request->user()?->id);

        return (new SubmittalResource($row->loadCount('attachments')))->response()->setStatusCode(201);
    }

    public function show(Project $project, int $submittal): SubmittalResource
    {
        $model = Submittal::query()
            ->where('project_id', $project->id)
            ->with('attachments.document:id,title,document_no,document_type')
            ->withCount('attachments')
            ->findOrFail($submittal);

        return new SubmittalResource($model);
    }

    public function update(UpdateSubmittalRequest $request, Project $project, int $submittal): SubmittalResource
    {
        $model = Submittal::query()->where('project_id', $project->id)->findOrFail($submittal);

        return new SubmittalResource($this->submittals->update($project, $model, $request->validated())->loadCount('attachments'));
    }

    public function destroy(Project $project, int $submittal): JsonResponse
    {
        Submittal::query()->where('project_id', $project->id)->findOrFail($submittal)->delete();

        return response()->json(['message' => 'Submittal deleted.']);
    }

    public function submit(Request $request, Project $project, int $submittal): SubmittalResource
    {
        $model = Submittal::query()->where('project_id', $project->id)->findOrFail($submittal);

        return new SubmittalResource($this->submittals->submit($project, $model, $request->user()?->id)->loadCount('attachments'));
    }

    public function review(ReviewSubmittalRequest $request, Project $project, int $submittal): SubmittalResource
    {
        $model = Submittal::query()->where('project_id', $project->id)->findOrFail($submittal);

        return new SubmittalResource(
            $this->submittals->review($project, $model, $request->validated(), (int) $request->user()->id)->loadCount('attachments')
        );
    }

    public function attach(AttachSubmittalDocumentRequest $request, Project $project, int $submittal): JsonResponse
    {
        $model = Submittal::query()->where('project_id', $project->id)->findOrFail($submittal);
        $attachment = $this->submittals->attachDocument($project, $model, (int) $request->validated('document_id'));
        $attachment->load('document:id,title,document_no,document_type');

        return (new SubmittalAttachmentResource($attachment))->response()->setStatusCode(201);
    }
}
