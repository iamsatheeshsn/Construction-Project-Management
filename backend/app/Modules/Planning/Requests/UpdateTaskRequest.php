<?php

namespace App\Modules\Planning\Requests;

use App\Shared\Support\RouteId;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');
        $taskId = (int) $this->route('task');

        return [
            'wbs_id' => [
                'nullable',
                'integer',
                Rule::exists('wbs', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'parent_task_id' => [
                'nullable',
                'integer',
                'different:'.$taskId,
                Rule::exists('tasks', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'task_code' => ['nullable', 'string', 'max:50'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'])],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high', 'critical'])],
            'planned_start_date' => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date', 'after_or_equal:planned_start_date'],
            'baseline_start_date' => ['nullable', 'date'],
            'baseline_end_date' => ['nullable', 'date', 'after_or_equal:baseline_start_date'],
            'actual_start_date' => ['nullable', 'date'],
            'actual_end_date' => ['nullable', 'date', 'after_or_equal:actual_start_date'],
            'duration_days' => ['nullable', 'numeric', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('planned_start_date') && $this->filled('planned_end_date') && ! $this->filled('duration_days')) {
            $start = Carbon::parse($this->input('planned_start_date'));
            $end = Carbon::parse($this->input('planned_end_date'));
            $this->merge([
                'duration_days' => $start->diffInDays($end) + 1,
            ]);
        }
    }
}
