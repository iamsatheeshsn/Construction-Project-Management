<?php

namespace App\Modules\Site\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSiteDiaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'report_date' => [
                'required',
                'date',
                Rule::unique('site_diaries', 'report_date')
                    ->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'weather' => ['nullable', 'string', 'max:120'],
            'temperature_c' => ['nullable', 'numeric'],
            'work_completed' => ['nullable', 'string'],
            'work_planned' => ['nullable', 'string'],
            'issues' => ['nullable', 'string'],
            'delays' => ['nullable', 'string'],
            'visitors' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['draft'])],
        ];
    }
}
