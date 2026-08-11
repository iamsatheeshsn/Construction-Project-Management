<?php

namespace App\Modules\Planning\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Planning\Models\TaskDependency */
class TaskDependencyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'predecessor_task_id' => $this->predecessor_task_id,
            'successor_task_id' => $this->successor_task_id,
            'dependency_type' => $this->dependency_type,
            'lag_days' => $this->lag_days,
            'predecessor' => $this->whenLoaded('predecessor', fn () => $this->predecessor ? [
                'id' => $this->predecessor->id,
                'name' => $this->predecessor->name,
                'task_code' => $this->predecessor->task_code,
            ] : null),
            'successor' => $this->whenLoaded('successor', fn () => $this->successor ? [
                'id' => $this->successor->id,
                'name' => $this->successor->name,
                'task_code' => $this->successor->task_code,
            ] : null),
        ];
    }
}
