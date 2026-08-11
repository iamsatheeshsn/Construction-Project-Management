<?php

namespace App\Modules\Documents\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'document_no' => ['sometimes', 'nullable', 'string', 'max:80'],
            'document_type' => ['sometimes', Rule::in([
                'contract', 'drawing', 'rfi', 'submittal', 'certificate', 'report', 'photo', 'variation', 'other',
            ])],
            'status' => ['sometimes', Rule::in([
                'draft', 'submitted', 'under_review', 'approved', 'rejected', 'obsolete',
            ])],
        ];
    }
}
