<?php

namespace App\Modules\Workflow\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRfiResponseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'response_text' => ['required', 'string'],
        ];
    }
}
