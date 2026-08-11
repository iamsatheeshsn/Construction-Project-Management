<?php

namespace App\Modules\Billing\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentApplicationItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'description' => ['required', 'string'],
            'previous_amount' => ['nullable', 'numeric', 'min:0'],
            'this_period_amount' => ['required', 'numeric'],
            'boq_item_id' => ['nullable', 'integer'],
        ];
    }
}
