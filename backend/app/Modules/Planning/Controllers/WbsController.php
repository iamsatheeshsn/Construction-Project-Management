<?php

namespace App\Modules\Planning\Controllers;

use App\Modules\Planning\Models\WbsNode;
use App\Modules\Planning\Requests\StoreWbsNodeRequest;
use App\Modules\Planning\Requests\UpdateWbsNodeRequest;
use App\Modules\Planning\Resources\WbsNodeResource;
use App\Modules\Planning\Services\WbsService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;

class WbsController
{
    public function __construct(private WbsService $wbs) {}

    public function index(Project $project): JsonResponse
    {
        $tree = $this->wbs->tree($project);

        return response()->json([
            'data' => WbsNodeResource::collection($tree),
        ]);
    }

    public function store(StoreWbsNodeRequest $request, Project $project): JsonResponse
    {
        $node = $this->wbs->create($project, $request->validated());

        return (new WbsNodeResource($node))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateWbsNodeRequest $request, Project $project, int $wbs): WbsNodeResource
    {
        $node = WbsNode::query()
            ->where('project_id', $project->id)
            ->findOrFail($wbs);

        $updated = $this->wbs->update($project, $node, $request->validated());

        return new WbsNodeResource($updated);
    }

    public function destroy(Project $project, int $wbs): JsonResponse
    {
        $node = WbsNode::query()
            ->where('project_id', $project->id)
            ->findOrFail($wbs);

        $this->wbs->delete($project, $node);

        return response()->json(['message' => 'WBS node deleted.']);
    }
}
