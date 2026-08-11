<?php

namespace App\Modules\Billing\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'application_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('payment_applications', 'application_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'contract_id' => [
                'nullable',
                'integer',
                Rule::exists('contracts', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'advance_recovery' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
