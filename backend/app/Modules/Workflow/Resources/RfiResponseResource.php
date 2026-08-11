<?php

namespace App\Modules\Workflow\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Workflow\Models\RfiResponse */
class RfiResponseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rfi_id' => $this->rfi_id,
            'response_text' => $this->response_text,
            'responded_by' => $this->responded_by,
            'responder' => $this->whenLoaded('responder', fn () => [
                'id' => $this->responder?->id,
                'name' => $this->responder?->name,
                'email' => $this->responder?->email,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
