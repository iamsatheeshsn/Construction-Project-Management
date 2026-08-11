<?php

namespace App\Core\SaaS\Models;

use App\Core\Tenant\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantFeature extends Model
{
    protected $fillable = [
        'tenant_id',
        'feature_key',
        'is_enabled',
        'limits_json',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'limits_json' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
