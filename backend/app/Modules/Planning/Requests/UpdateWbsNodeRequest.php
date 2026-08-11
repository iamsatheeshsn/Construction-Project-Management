<?php

namespace App\Modules\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWbsNodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $project = $this->route('project');
        $projectId = $project instanceof \Illuminate\Database\Eloquent\Model
            ? (int) $project->getKey()
            : (int) $project;
        $wbsId = (int) $this->route('wbs');

        return [
            'parent_id' => [
                'nullable',
                'integer',
                'different:'.$wbsId,
                Rule::exists('wbs', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('wbs', 'code')
                    ->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at'))
                    ->ignore($wbsId),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
