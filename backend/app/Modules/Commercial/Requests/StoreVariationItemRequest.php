<?php

namespace App\Modules\Commercial\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVariationItemRequest extends FormRequest
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
            'quantity' => ['nullable', 'numeric'],
            'rate' => ['nullable', 'numeric'],
            'boq_item_id' => ['nullable', 'integer'],
            'cost_code_id' => ['nullable', 'integer'],
        ];
    }
}
