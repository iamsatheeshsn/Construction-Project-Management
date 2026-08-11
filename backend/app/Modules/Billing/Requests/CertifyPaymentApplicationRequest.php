<?php

namespace App\Modules\Billing\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CertifyPaymentApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'certificate_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('payment_certificates', 'certificate_no')->where(fn ($q) => $q->where('project_id', $projectId)),
            ],
            'certified_amount' => ['nullable', 'numeric', 'min:0'],
            'retention_held' => ['nullable', 'numeric', 'min:0'],
            'certified_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
