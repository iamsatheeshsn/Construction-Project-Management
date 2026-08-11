<?php

namespace App\Modules\Billing\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Modules\Commercial\Models\BoqItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentApplicationItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'payment_application_id',
        'boq_item_id',
        'description',
        'previous_amount',
        'this_period_amount',
        'cumulative_amount',
    ];

    protected function casts(): array
    {
        return [
            'previous_amount' => 'decimal:2',
            'this_period_amount' => 'decimal:2',
            'cumulative_amount' => 'decimal:2',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(PaymentApplication::class, 'payment_application_id');
    }

    public function boqItem(): BelongsTo
    {
        return $this->belongsTo(BoqItem::class, 'boq_item_id');
    }
}
