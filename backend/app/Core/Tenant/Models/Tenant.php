<?php

namespace App\Core\Tenant\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'legal_name',
        'country_code',
        'default_currency',
        'timezone',
        'locale',
        'brand_name',
        'primary_color',
        'accent_color',
        'logo_url',
        'status',
        'trial_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant): void {
            if (empty($tenant->uuid)) {
                $tenant->uuid = (string) Str::uuid();
            }
            if (empty($tenant->slug)) {
                $tenant->slug = Str::slug($tenant->name).'-'.Str::lower(Str::random(4));
            }
        });
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tenant_users')
            ->withPivot(['id', 'status', 'is_owner', 'job_title', 'invited_at', 'joined_at'])
            ->withTimestamps();
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(\App\Core\RBAC\Models\TenantUser::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(\App\Core\SaaS\Models\Subscription::class);
    }

    public function features(): HasMany
    {
        return $this->hasMany(\App\Core\SaaS\Models\TenantFeature::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(\App\Core\SaaS\Models\SaasInvoice::class);
    }
}
