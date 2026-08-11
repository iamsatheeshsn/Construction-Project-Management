<?php

namespace App\Core\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'tenant_slug' => ['nullable', 'string', 'max:100'],
            'tenant_id' => ['nullable', 'integer'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ];
    }
}
