<?php

namespace App\Modules\Billing\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Billing\Models\PaymentApplicationItem */
class PaymentApplicationItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payment_application_id' => $this->payment_application_id,
            'boq_item_id' => $this->boq_item_id,
            'description' => $this->description,
            'previous_amount' => $this->previous_amount,
            'this_period_amount' => $this->this_period_amount,
            'cumulative_amount' => $this->cumulative_amount,
        ];
    }
}
