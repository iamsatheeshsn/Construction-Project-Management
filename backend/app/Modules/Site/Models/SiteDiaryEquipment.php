<?php

namespace App\Modules\Site\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteDiaryEquipment extends Model
{
    use BelongsToTenant;

    protected $table = 'site_diary_equipment';

    protected $fillable = [
        'tenant_id',
        'site_diary_id',
        'equipment_name',
        'quantity',
        'hours',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'hours' => 'decimal:2',
        ];
    }

    public function diary(): BelongsTo
    {
        return $this->belongsTo(SiteDiary::class, 'site_diary_id');
    }
}
