<?php

namespace App\Modules\Commercial\Controllers;

use App\Modules\Commercial\Models\Contract;
use App\Modules\Commercial\Models\ContractItem;
use App\Modules\Commercial\Requests\StoreContractItemRequest;
use App\Modules\Commercial\Requests\StoreContractRequest;
use App\Modules\Commercial\Requests\UpdateContractRequest;
use App\Modules\Commercial\Resources\ContractItemResource;
use App\Modules\Commercial\Resources\ContractResource;
use App\Modules\Commercial\Services\ContractService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ContractController
{
    public function __construct(private ContractService $contracts) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $contracts = Contract::query()
            ->where('project_id', $project->id)
            ->with(['client:id,name,code'])
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return ContractResource::collection($contracts);
    }

    public function store(StoreContractRequest $request, Project $project): JsonResponse
    {
        $contract = $this->contracts->create($project, $request->validated(), $request->user()?->id);

        return (new ContractResource($contract))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $contract): ContractResource
    {
        $model = Contract::query()
            ->where('project_id', $project->id)
            ->with(['client:id,name,code', 'items.boqItem:id,item_no,description'])
            ->withCount('items')
            ->findOrFail($contract);

        return new ContractResource($model);
    }

    public function update(UpdateContractRequest $request, Project $project, int $contract): ContractResource
    {
        $model = Contract::query()->where('project_id', $project->id)->findOrFail($contract);
        $updated = $this->contracts->update($project, $model, $request->validated());

        return new ContractResource($updated);
    }

    public function destroy(Project $project, int $contract): JsonResponse
    {
        $model = Contract::query()->where('project_id', $project->id)->findOrFail($contract);
        $model->delete();

        return response()->json(['message' => 'Contract deleted.']);
    }

    public function storeItem(StoreContractItemRequest $request, Project $project, int $contract): JsonResponse
    {
        $model = Contract::query()->where('project_id', $project->id)->findOrFail($contract);
        $data = $request->validated();

        if (! empty($data['import_boq_id'])) {
            DB::transaction(function () use ($project, $model, $data) {
                $this->contracts->importFromBoq($project, $model, (int) $data['import_boq_id']);
            });

            return response()->json([
                'message' => 'BOQ items imported into contract.',
                'data' => new ContractResource(
                    $model->fresh()->load(['client:id,name,code', 'items'])->loadCount('items')
                ),
            ], 201);
        }

        $item = $this->contracts->addItem($project, $model, $data);

        return (new ContractItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function destroyItem(Project $project, int $contract, int $item): JsonResponse
    {
        $contractModel = Contract::query()->where('project_id', $project->id)->findOrFail($contract);
        $itemModel = ContractItem::query()->where('contract_id', $contractModel->id)->findOrFail($item);
        $this->contracts->deleteItem($project, $contractModel, $itemModel);

        return response()->json(['message' => 'Contract item deleted.']);
    }
}
