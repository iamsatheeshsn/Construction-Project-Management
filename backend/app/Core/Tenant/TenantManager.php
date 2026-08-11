<?php

namespace App\Core\Tenant;

use App\Core\Tenant\Models\Tenant;
use RuntimeException;

class TenantManager
{
    protected ?Tenant $tenant = null;

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function id(): ?int
    {
        return $this->tenant?->id;
    }

    public function check(): bool
    {
        return $this->tenant !== null;
    }

    public function tenant(): Tenant
    {
        if ($this->tenant === null) {
            throw new RuntimeException('No tenant is set for the current request.');
        }

        return $this->tenant;
    }

    public function forget(): void
    {
        $this->tenant = null;
    }
}
