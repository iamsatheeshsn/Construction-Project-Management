<?php

namespace App\Core\Audit\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Core\Audit\Models\AppNotification */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'entity_type' => $this->entity_type,
            'entity_id' => $this->entity_id,
            'channel' => $this->channel,
            'data' => $this->data_json,
            'read_at' => optional($this->read_at)?->toIso8601String(),
            'sent_at' => optional($this->sent_at)?->toIso8601String(),
            'created_at' => optional($this->created_at)?->toIso8601String(),
            'is_read' => $this->read_at !== null,
        ];
    }
}
