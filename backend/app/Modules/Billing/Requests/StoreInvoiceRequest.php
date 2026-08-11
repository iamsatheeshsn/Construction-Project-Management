<?php

namespace App\Modules\Billing\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(\App\Core\Tenant\TenantManager::class)->id();

        return [
            'payment_certificate_id' => ['required', 'integer', 'exists:payment_certificates,id'],
            'invoice_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('invoices', 'invoice_no')->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at')),
            ],
            'invoice_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'subtotal' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'client_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['draft', 'issued'])],
        ];
    }
}
