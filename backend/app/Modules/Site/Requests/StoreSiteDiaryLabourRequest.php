<?php

namespace App\Modules\Site\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSiteDiaryLabourRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'trade' => ['required', 'string', 'max:120'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'headcount' => ['nullable', 'integer', 'min:0'],
            'hours' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ];
    }
}
