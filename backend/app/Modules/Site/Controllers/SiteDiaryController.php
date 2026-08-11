<?php

namespace App\Modules\Site\Controllers;

use App\Modules\Projects\Models\Project;
use App\Modules\Site\Models\SiteDiary;
use App\Modules\Site\Models\SiteDiaryEquipment;
use App\Modules\Site\Models\SiteDiaryLabour;
use App\Modules\Site\Models\SiteDiaryMaterial;
use App\Modules\Site\Requests\StoreSiteDiaryEquipmentRequest;
use App\Modules\Site\Requests\StoreSiteDiaryLabourRequest;
use App\Modules\Site\Requests\StoreSiteDiaryMaterialRequest;
use App\Modules\Site\Requests\StoreSiteDiaryRequest;
use App\Modules\Site\Requests\UpdateSiteDiaryRequest;
use App\Modules\Site\Resources\SiteDiaryEquipmentResource;
use App\Modules\Site\Resources\SiteDiaryLabourResource;
use App\Modules\Site\Resources\SiteDiaryMaterialResource;
use App\Modules\Site\Resources\SiteDiaryResource;
use App\Modules\Site\Services\SiteDiaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SiteDiaryController
{
    public function __construct(private SiteDiaryService $diaries) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = SiteDiary::query()
            ->where('project_id', $project->id)
            ->withCount(['labours', 'equipment', 'materials'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('report_date')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return SiteDiaryResource::collection($rows);
    }

    public function store(StoreSiteDiaryRequest $request, Project $project): JsonResponse
    {
        $diary = $this->diaries->create($project, $request->validated(), $request->user()?->id);

        return (new SiteDiaryResource($diary->loadCount(['labours', 'equipment', 'materials'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $diary): SiteDiaryResource
    {
        $model = SiteDiary::query()
            ->where('project_id', $project->id)
            ->with(['labours', 'equipment', 'materials'])
            ->withCount(['labours', 'equipment', 'materials'])
            ->findOrFail($diary);

        return new SiteDiaryResource($model);
    }

    public function update(UpdateSiteDiaryRequest $request, Project $project, int $diary): SiteDiaryResource
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $updated = $this->diaries->update($project, $model, $request->validated());

        return new SiteDiaryResource($updated->load(['labours', 'equipment', 'materials'])->loadCount(['labours', 'equipment', 'materials']));
    }

    public function destroy(Project $project, int $diary): JsonResponse
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $model->delete();

        return response()->json(['message' => 'Site diary deleted.']);
    }

    public function submit(Project $project, int $diary): SiteDiaryResource
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);

        return new SiteDiaryResource($this->diaries->submit($project, $model)->loadCount(['labours', 'equipment', 'materials']));
    }

    public function approve(Request $request, Project $project, int $diary): SiteDiaryResource
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);

        return new SiteDiaryResource(
            $this->diaries->approve($project, $model, (int) $request->user()->id)
                ->loadCount(['labours', 'equipment', 'materials'])
        );
    }

    public function storeLabour(StoreSiteDiaryLabourRequest $request, Project $project, int $diary): JsonResponse
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $row = $this->diaries->addLabour($project, $model, $request->validated());

        return (new SiteDiaryLabourResource($row))->response()->setStatusCode(201);
    }

    public function destroyLabour(Project $project, int $diary, int $labour): JsonResponse
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $row = SiteDiaryLabour::query()->where('site_diary_id', $model->id)->findOrFail($labour);
        $this->diaries->deleteLabour($project, $model, $row);

        return response()->json(['message' => 'Labour entry deleted.']);
    }

    public function storeEquipment(StoreSiteDiaryEquipmentRequest $request, Project $project, int $diary): JsonResponse
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $row = $this->diaries->addEquipment($project, $model, $request->validated());

        return (new SiteDiaryEquipmentResource($row))->response()->setStatusCode(201);
    }

    public function destroyEquipment(Project $project, int $diary, int $equipment): JsonResponse
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $row = SiteDiaryEquipment::query()->where('site_diary_id', $model->id)->findOrFail($equipment);
        $this->diaries->deleteEquipment($project, $model, $row);

        return response()->json(['message' => 'Equipment entry deleted.']);
    }

    public function storeMaterial(StoreSiteDiaryMaterialRequest $request, Project $project, int $diary): JsonResponse
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $row = $this->diaries->addMaterial($project, $model, $request->validated());

        return (new SiteDiaryMaterialResource($row))->response()->setStatusCode(201);
    }

    public function destroyMaterial(Project $project, int $diary, int $material): JsonResponse
    {
        $model = SiteDiary::query()->where('project_id', $project->id)->findOrFail($diary);
        $row = SiteDiaryMaterial::query()->where('site_diary_id', $model->id)->findOrFail($material);
        $this->diaries->deleteMaterial($project, $model, $row);

        return response()->json(['message' => 'Material entry deleted.']);
    }
}
