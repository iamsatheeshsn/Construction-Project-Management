<?php

namespace App\Core\RBAC\Models;

use App\Core\Tenant\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccessPolicy extends Model
{
    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'description',
        'effect',
        'scope',
        'permission_codes',
        'conditions_json',
        'is_active',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'permission_codes' => 'array',
            'conditions_json' => 'array',
            'is_active' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
