<?php

namespace App\Shared\Support;

use Illuminate\Support\Facades\DB;

class DocumentNumber
{
    public static function forProject(string $prefix, string $table, int $projectId): string
    {
        $count = DB::table($table)
            ->where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->count();

        return $prefix.'-'.str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }

    public static function forTenant(string $prefix, string $table, int $tenantId): string
    {
        $count = DB::table($table)
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->count();

        return $prefix.'-'.str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }
}
