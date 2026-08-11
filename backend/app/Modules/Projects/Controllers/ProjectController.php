<?php

namespace App\Modules\Projects\Controllers;

use App\Core\RBAC\Models\Role;
use App\Core\SaaS\Services\UsageLimitService;
use App\Core\Tenant\TenantManager;
use App\Modules\Organization\Models\Company;
use App\Modules\Projects\Models\Project;
use App\Modules\Projects\Models\ProjectMember;
use App\Modules\Projects\Requests\StoreProjectRequest;
use App\Modules\Projects\Requests\UpdateProjectRequest;
use App\Modules\Projects\Resources\ProjectResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ProjectController
{
    public function __construct(
        private UsageLimitService $usage,
        private TenantManager $tenants,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $projects = Project::query()
            ->with(['company:id,name', 'client:id,name,code'])
            ->withCount(['members', 'wbsNodes'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)
                        ->orWhere('project_code', 'like', $term)
                        ->orWhere('location', 'like', $term);
                });
            })
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $this->usage->assertCanAddProject($this->tenants->tenant());

        $data = $request->validated();
        $user = $request->user();

        $project = DB::transaction(function () use ($data, $user) {
            if (empty($data['company_id'])) {
                $data['company_id'] = Company::query()->where('is_primary', true)->value('id')
                    ?? Company::query()->value('id');
            }

            $data['currency'] = strtoupper($data['currency'] ?? 'AED');
            $data['status'] = $data['status'] ?? 'setup';
            $data['created_by'] = $user->id;

            $project = Project::query()->create($data);

            $pmRoleId = Role::query()->whereNull('tenant_id')->where('code', 'project_manager')->value('id');

            ProjectMember::query()->create([
                'project_id' => $project->id,
                'user_id' => $user->id,
                'role_id' => $pmRoleId,
                'is_lead' => true,
                'joined_at' => now()->toDateString(),
            ]);

            return $project;
        });

        $project->load(['company:id,name', 'client:id,name,code'])->loadCount(['members', 'wbsNodes']);

        return (new ProjectResource($project))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project): ProjectResource
    {
        $project->load(['company:id,name', 'client:id,name,code', 'members.user:id,name,email'])
            ->loadCount(['members', 'wbsNodes']);

        return new ProjectResource($project);
    }

    public function update(UpdateProjectRequest $request, Project $project): ProjectResource
    {
        $data = $request->validated();
        if (isset($data['currency'])) {
            $data['currency'] = strtoupper($data['currency']);
        }

        $project->update($data);
        $project->load(['company:id,name', 'client:id,name,code'])->loadCount(['members', 'wbsNodes']);

        return new ProjectResource($project);
    }

    public function destroy(Project $project): JsonResponse
    {
        $project->delete();

        return response()->json(['message' => 'Project deleted.']);
    }
}
