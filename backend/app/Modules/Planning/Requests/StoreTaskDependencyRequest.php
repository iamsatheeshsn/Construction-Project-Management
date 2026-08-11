<?php

namespace App\Modules\Planning\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskDependencyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'predecessor_task_id' => [
                'required',
                'integer',
                'different:successor_task_id',
                Rule::exists('tasks', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'successor_task_id' => [
                'required',
                'integer',
                Rule::exists('tasks', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'dependency_type' => ['nullable', Rule::in(['FS', 'SS', 'FF', 'SF'])],
            'lag_days' => ['nullable', 'numeric'],
        ];
    }
}
