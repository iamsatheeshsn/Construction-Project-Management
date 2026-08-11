<?php

namespace App\Core\Audit\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Core\Audit\Models\ActivityLog */
class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'event' => $this->event,
            'description' => $this->description,
            'properties' => $this->properties,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
            ]),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project?->id,
                'code' => $this->project?->project_code,
                'name' => $this->project?->name,
            ]),
            'created_at' => optional($this->created_at)?->toIso8601String(),
        ];
    }
}
