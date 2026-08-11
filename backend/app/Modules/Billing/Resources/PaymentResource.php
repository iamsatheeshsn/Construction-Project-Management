<?php

namespace App\Modules\Billing\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Billing\Models\Payment */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'invoice_id' => $this->invoice_id,
            'payment_no' => $this->payment_no,
            'payment_date' => optional($this->payment_date)?->toDateString(),
            'amount' => $this->amount,
            'method' => $this->method,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
