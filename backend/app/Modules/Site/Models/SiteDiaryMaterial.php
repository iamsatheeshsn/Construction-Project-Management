<?php

namespace App\Modules\Site\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteDiaryMaterial extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'site_diary_id',
        'material_name',
        'unit',
        'quantity',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
        ];
    }

    public function diary(): BelongsTo
    {
        return $this->belongsTo(SiteDiary::class, 'site_diary_id');
    }
}
