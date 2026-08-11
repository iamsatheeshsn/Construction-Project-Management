<?php

namespace App\Modules\Workflow\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Workflow\Models\RfiAttachment */
class RfiAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rfi_id' => $this->rfi_id,
            'document_id' => $this->document_id,
            'document' => $this->whenLoaded('document', fn () => [
                'id' => $this->document?->id,
                'title' => $this->document?->title,
                'document_no' => $this->document?->document_no,
                'document_type' => $this->document?->document_type,
                'status' => $this->document?->status,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
