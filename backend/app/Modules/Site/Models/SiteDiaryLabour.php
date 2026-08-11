<?php

namespace App\Modules\Site\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteDiaryLabour extends Model
{
    use BelongsToTenant;

    protected $table = 'site_diary_labours';

    protected $fillable = [
        'tenant_id',
        'site_diary_id',
        'trade',
        'company_name',
        'headcount',
        'hours',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'headcount' => 'integer',
            'hours' => 'decimal:2',
        ];
    }

    public function diary(): BelongsTo
    {
        return $this->belongsTo(SiteDiary::class, 'site_diary_id');
    }
}
