<?php

namespace App\Modules\Commercial\Controllers;

use App\Modules\Commercial\Models\CostCode;
use App\Modules\Commercial\Requests\StoreCostCodeRequest;
use App\Modules\Commercial\Resources\CostCodeResource;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CostCodeController
{
    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $codes = CostCode::query()
            ->where(function ($q) use ($project) {
                $q->where('project_id', $project->id)->orWhereNull('project_id');
            })
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('code')
            ->paginate(min((int) $request->integer('per_page', 10), 200));

        return CostCodeResource::collection($codes);
    }

    public function store(StoreCostCodeRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();
        $data['project_id'] = $project->id;
        $data['is_active'] = $data['is_active'] ?? true;

        $code = CostCode::query()->create($data);

        return (new CostCodeResource($code))
            ->response()
            ->setStatusCode(201);
    }
}
