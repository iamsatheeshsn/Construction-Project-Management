<?php

namespace App\Providers;

use App\Core\Tenant\TenantManager;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantManager::class, fn () => new TenantManager);
    }

    public function boot(): void
    {
        //
    }
}
