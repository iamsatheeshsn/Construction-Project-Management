<?php

namespace App\Modules\Subcontractors\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Subcontractors\Models\SubcontractPackageItem */
class SubcontractPackageItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subcontract_package_id' => $this->subcontract_package_id,
            'description' => $this->description,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'rate' => $this->rate,
            'amount' => $this->amount,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
