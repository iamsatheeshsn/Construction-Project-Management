<?php

namespace App\Modules\Workflow\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRfiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'discipline' => ['sometimes', 'nullable', 'string', 'max:80'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'status' => ['sometimes', Rule::in([
                'draft', 'submitted', 'under_review', 'responded', 'approved', 'rejected', 'closed',
            ])],
            'assigned_to' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')],
            'due_date' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
