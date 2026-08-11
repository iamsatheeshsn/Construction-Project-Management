<?php

namespace App\Modules\Workflow\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewSubmittalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['approved', 'approved_with_comments', 'rejected', 'consultant_review'])],
            'review_comments' => ['nullable', 'string'],
        ];
    }
}
