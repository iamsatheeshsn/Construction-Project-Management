<?php

namespace App\Modules\Planning\Services;

use App\Modules\Planning\Models\Task;
use App\Modules\Planning\Models\TaskDependency;
use App\Modules\Projects\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TaskService
{
    public function create(Project $project, array $data, ?int $createdBy = null): Task
    {
        return DB::transaction(function () use ($project, $data, $createdBy) {
            $predecessorId = $data['predecessor_task_id'] ?? null;
            $dependencyType = $data['dependency_type'] ?? 'FS';
            $lagDays = $data['lag_days'] ?? 0;
            unset($data['predecessor_task_id'], $data['dependency_type'], $data['lag_days']);

            $data['project_id'] = $project->id;
            $data['created_by'] = $createdBy;
            $data['status'] = $data['status'] ?? 'not_started';
            $data['priority'] = $data['priority'] ?? 'medium';
            $data['progress_percent'] = $data['progress_percent'] ?? 0;

            if (! isset($data['sort_order'])) {
                $data['sort_order'] = ((int) Task::query()->where('project_id', $project->id)->max('sort_order')) + 1;
            }

            // Copy planned dates into baseline on create if baseline empty
            if (! empty($data['planned_start_date']) && empty($data['baseline_start_date'])) {
                $data['baseline_start_date'] = $data['planned_start_date'];
            }
            if (! empty($data['planned_end_date']) && empty($data['baseline_end_date'])) {
                $data['baseline_end_date'] = $data['planned_end_date'];
            }

            $task = Task::query()->create($data);

            if ($predecessorId) {
                $this->addDependency($project, [
                    'predecessor_task_id' => $predecessorId,
                    'successor_task_id' => $task->id,
                    'dependency_type' => $dependencyType,
                    'lag_days' => $lagDays,
                ]);
            }

            return $task->load(['wbs', 'assignee', 'predecessorLinks.predecessor']);
        });
    }

    public function update(Project $project, Task $task, array $data): Task
    {
        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $task->update($data);

        return $task->fresh()->load(['wbs', 'assignee', 'predecessorLinks.predecessor']);
    }

    public function delete(Project $project, Task $task): void
    {
        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $task->delete();
    }

    public function addDependency(Project $project, array $data): TaskDependency
    {
        $predId = (int) $data['predecessor_task_id'];
        $succId = (int) $data['successor_task_id'];

        if ($predId === $succId) {
            throw ValidationException::withMessages([
                'successor_task_id' => ['A task cannot depend on itself.'],
            ]);
        }

        $this->assertSameProject($project, $predId, $succId);

        if ($this->wouldCreateCycle($predId, $succId)) {
            throw ValidationException::withMessages([
                'successor_task_id' => ['This dependency would create a cycle.'],
            ]);
        }

        return TaskDependency::query()->firstOrCreate(
            [
                'project_id' => $project->id,
                'predecessor_task_id' => $predId,
                'successor_task_id' => $succId,
                'dependency_type' => $data['dependency_type'] ?? 'FS',
            ],
            [
                'lag_days' => $data['lag_days'] ?? 0,
            ]
        )->load(['predecessor', 'successor']);
    }

    public function removeDependency(Project $project, TaskDependency $dependency): void
    {
        if ($dependency->project_id !== $project->id) {
            abort(404);
        }

        $dependency->delete();
    }

    /**
     * @return array{tasks: \Illuminate\Support\Collection, dependencies: \Illuminate\Support\Collection, range: array{start: ?string, end: ?string}}
     */
    public function gantt(Project $project): array
    {
        $tasks = Task::query()
            ->where('project_id', $project->id)
            ->with(['wbs:id,code,name'])
            ->orderBy('planned_start_date')
            ->orderBy('sort_order')
            ->get();

        $dependencies = TaskDependency::query()
            ->where('project_id', $project->id)
            ->get(['id', 'predecessor_task_id', 'successor_task_id', 'dependency_type', 'lag_days']);

        $starts = $tasks->pluck('planned_start_date')->filter();
        $ends = $tasks->pluck('planned_end_date')->filter();

        return [
            'tasks' => $tasks,
            'dependencies' => $dependencies,
            'range' => [
                'start' => optional($starts->min())?->toDateString(),
                'end' => optional($ends->max())?->toDateString(),
            ],
        ];
    }

    private function assertSameProject(Project $project, int $predId, int $succId): void
    {
        $count = Task::query()
            ->where('project_id', $project->id)
            ->whereIn('id', [$predId, $succId])
            ->count();

        if ($count !== 2) {
            throw ValidationException::withMessages([
                'predecessor_task_id' => ['Both tasks must belong to this project.'],
            ]);
        }
    }

    private function wouldCreateCycle(int $fromPred, int $toSucc): bool
    {
        // Adding pred -> succ creates a cycle if succ can already reach pred.
        $visited = [];
        $queue = [$toSucc];

        while ($queue !== []) {
            $current = array_shift($queue);
            if ($current === $fromPred) {
                return true;
            }
            if (isset($visited[$current])) {
                continue;
            }
            $visited[$current] = true;

            $nextIds = TaskDependency::query()
                ->where('predecessor_task_id', $current)
                ->pluck('successor_task_id')
                ->all();

            foreach ($nextIds as $nextId) {
                $queue[] = (int) $nextId;
            }
        }

        return false;
    }
}
