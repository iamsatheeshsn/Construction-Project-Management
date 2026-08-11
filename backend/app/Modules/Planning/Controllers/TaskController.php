<?php

namespace App\Modules\Planning\Controllers;

use App\Modules\Planning\Models\Task;
use App\Modules\Planning\Models\TaskDependency;
use App\Modules\Planning\Requests\StoreTaskDependencyRequest;
use App\Modules\Planning\Requests\StoreTaskRequest;
use App\Modules\Planning\Requests\UpdateTaskRequest;
use App\Modules\Planning\Resources\TaskDependencyResource;
use App\Modules\Planning\Resources\TaskResource;
use App\Modules\Planning\Services\TaskService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TaskController
{
    public function __construct(private TaskService $tasks) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $tasks = Task::query()
            ->where('project_id', $project->id)
            ->with(['wbs:id,code,name', 'assignee:id,name,email', 'predecessorLinks.predecessor:id,name,task_code'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('wbs_id'), fn ($q) => $q->where('wbs_id', $request->integer('wbs_id')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)->orWhere('task_code', 'like', $term);
                });
            })
            ->orderBy('planned_start_date')
            ->orderBy('sort_order')
            ->paginate(min((int) $request->integer('per_page', 10), 200));

        return TaskResource::collection($tasks);
    }

    public function store(StoreTaskRequest $request, Project $project): JsonResponse
    {
        $task = $this->tasks->create($project, $request->validated(), $request->user()?->id);

        return (new TaskResource($task))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $task): TaskResource
    {
        $model = Task::query()
            ->where('project_id', $project->id)
            ->with(['wbs:id,code,name', 'assignee:id,name,email', 'predecessorLinks.predecessor:id,name,task_code'])
            ->findOrFail($task);

        return new TaskResource($model);
    }

    public function update(UpdateTaskRequest $request, Project $project, int $task): TaskResource
    {
        $model = Task::query()->where('project_id', $project->id)->findOrFail($task);
        $updated = $this->tasks->update($project, $model, $request->validated());

        return new TaskResource($updated);
    }

    public function destroy(Project $project, int $task): JsonResponse
    {
        $model = Task::query()->where('project_id', $project->id)->findOrFail($task);
        $this->tasks->delete($project, $model);

        return response()->json(['message' => 'Task deleted.']);
    }

    public function gantt(Project $project): JsonResponse
    {
        $payload = $this->tasks->gantt($project);

        return response()->json([
            'data' => [
                'range' => $payload['range'],
                'tasks' => TaskResource::collection($payload['tasks']),
                'dependencies' => TaskDependencyResource::collection($payload['dependencies']),
            ],
        ]);
    }

    public function storeDependency(StoreTaskDependencyRequest $request, Project $project): JsonResponse
    {
        $dependency = $this->tasks->addDependency($project, $request->validated());

        return (new TaskDependencyResource($dependency))
            ->response()
            ->setStatusCode(201);
    }

    public function destroyDependency(Project $project, int $dependency): JsonResponse
    {
        $model = TaskDependency::query()
            ->where('project_id', $project->id)
            ->findOrFail($dependency);

        $this->tasks->removeDependency($project, $model);

        return response()->json(['message' => 'Dependency removed.']);
    }
}
