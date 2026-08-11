<?php

namespace App\Modules\Documents\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Documents\Models\Document */
class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'document_type' => $this->document_type,
            'title' => $this->title,
            'document_no' => $this->document_no,
            'status' => $this->status,
            'current_version' => $this->current_version,
            'uploaded_by' => $this->uploaded_by,
            'approved_by' => $this->approved_by,
            'approved_at' => optional($this->approved_at)?->toIso8601String(),
            'versions_count' => $this->whenCounted('versions'),
            'versions' => DocumentVersionResource::collection($this->whenLoaded('versions')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
