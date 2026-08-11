<?php

namespace App\Core\Tenant\Traits;

use App\Core\Tenant\Scopes\TenantScope;
use App\Core\Tenant\TenantManager;
use Illuminate\Database\Eloquent\Model;

/**
 * @mixin Model
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Model $model): void {
            if (empty($model->getAttribute('tenant_id'))) {
                $tenantId = app(TenantManager::class)->id();
                if ($tenantId !== null) {
                    $model->setAttribute('tenant_id', $tenantId);
                }
            }
        });
    }
}
