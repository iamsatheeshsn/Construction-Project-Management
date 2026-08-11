<?php

namespace App\Modules\Commercial\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVariationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'variation_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('variations', 'variation_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'reason' => ['nullable', 'string'],
            'contract_id' => [
                'nullable',
                'integer',
                Rule::exists('contracts', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'time_impact_days' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['draft'])],
        ];
    }
}
