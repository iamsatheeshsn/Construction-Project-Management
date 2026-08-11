<?php

namespace App\Modules\Documents\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'document_no' => ['nullable', 'string', 'max:80'],
            'document_type' => ['nullable', Rule::in([
                'contract', 'drawing', 'rfi', 'submittal', 'certificate', 'report', 'photo', 'variation', 'other',
            ])],
            'status' => ['nullable', Rule::in(['draft', 'submitted', 'under_review'])],
            'change_notes' => ['nullable', 'string'],
            'file' => ['nullable', 'file', 'max:20480'],
        ];
    }
}
