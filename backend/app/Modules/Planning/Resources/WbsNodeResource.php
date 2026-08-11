<?php

namespace App\Modules\Planning\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Planning\Models\WbsNode */
class WbsNodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'parent_id' => $this->parent_id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'level' => $this->level,
            'sort_order' => $this->sort_order,
            'progress_percent' => $this->progress_percent,
            'children' => WbsNodeResource::collection($this->whenLoaded('children')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
