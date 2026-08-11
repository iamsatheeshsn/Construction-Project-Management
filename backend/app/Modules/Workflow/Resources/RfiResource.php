<?php

namespace App\Modules\Workflow\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Workflow\Models\Rfi */
class RfiResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'rfi_no' => $this->rfi_no,
            'subject' => $this->subject,
            'description' => $this->description,
            'discipline' => $this->discipline,
            'status' => $this->status,
            'priority' => $this->priority,
            'submitted_by' => $this->submitted_by,
            'assigned_to' => $this->assigned_to,
            'due_date' => optional($this->due_date)?->toDateString(),
            'responded_at' => optional($this->responded_at)?->toIso8601String(),
            'closed_at' => optional($this->closed_at)?->toIso8601String(),
            'submitter' => $this->whenLoaded('submitter', fn () => [
                'id' => $this->submitter?->id,
                'name' => $this->submitter?->name,
                'email' => $this->submitter?->email,
            ]),
            'assignee' => $this->whenLoaded('assignee', fn () => [
                'id' => $this->assignee?->id,
                'name' => $this->assignee?->name,
                'email' => $this->assignee?->email,
            ]),
            'responses_count' => $this->whenCounted('responses'),
            'attachments_count' => $this->whenCounted('attachments'),
            'responses' => RfiResponseResource::collection($this->whenLoaded('responses')),
            'attachments' => RfiAttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
