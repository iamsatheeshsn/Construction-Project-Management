<?php

namespace App\Modules\Planning\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Planning\Models\Task */
class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'wbs_id' => $this->wbs_id,
            'parent_task_id' => $this->parent_task_id,
            'task_code' => $this->task_code,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'planned_start_date' => optional($this->planned_start_date)?->toDateString(),
            'planned_end_date' => optional($this->planned_end_date)?->toDateString(),
            'baseline_start_date' => optional($this->baseline_start_date)?->toDateString(),
            'baseline_end_date' => optional($this->baseline_end_date)?->toDateString(),
            'actual_start_date' => optional($this->actual_start_date)?->toDateString(),
            'actual_end_date' => optional($this->actual_end_date)?->toDateString(),
            'duration_days' => $this->duration_days,
            'progress_percent' => $this->progress_percent,
            'assigned_to' => $this->assigned_to,
            'sort_order' => $this->sort_order,
            'wbs' => $this->whenLoaded('wbs', fn () => $this->wbs ? [
                'id' => $this->wbs->id,
                'code' => $this->wbs->code,
                'name' => $this->wbs->name,
            ] : null),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
                'email' => $this->assignee->email,
            ] : null),
            'predecessors' => TaskDependencyResource::collection($this->whenLoaded('predecessorLinks')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
