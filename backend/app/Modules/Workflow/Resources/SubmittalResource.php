<?php

namespace App\Modules\Workflow\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Workflow\Models\Submittal */
class SubmittalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'submittal_no' => $this->submittal_no,
            'title' => $this->title,
            'description' => $this->description,
            'submittal_type' => $this->submittal_type,
            'status' => $this->status,
            'due_date' => optional($this->due_date)?->toDateString(),
            'submitted_at' => optional($this->submitted_at)?->toIso8601String(),
            'reviewed_at' => optional($this->reviewed_at)?->toIso8601String(),
            'review_comments' => $this->review_comments,
            'submitted_by' => $this->submitted_by,
            'reviewed_by' => $this->reviewed_by,
            'attachments_count' => $this->whenCounted('attachments'),
            'attachments' => SubmittalAttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
