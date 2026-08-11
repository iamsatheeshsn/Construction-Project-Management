<?php

namespace App\Modules\Subcontractors\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubcontractPackageItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'description' => ['required', 'string'],
            'unit' => ['nullable', 'string', 'max:30'],
            'quantity' => ['required', 'numeric', 'min:0'],
            'rate' => ['required', 'numeric', 'min:0'],
        ];
    }
}
