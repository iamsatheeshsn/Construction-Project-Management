<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rfqs')) {
            return;
        }

        $path = database_path('schema/r2_rfq_equipment_subcontractors.sql');
        $sql = File::get($path);
        $sql = preg_replace('/^USE\s+`?cpm`?\s*;\s*/mi', '', $sql) ?? $sql;

        foreach ($this->splitStatements($sql) as $statement) {
            DB::unprepared($statement);
        }
    }

    public function down(): void
    {
        $tables = [
            'subcontract_package_items',
            'subcontract_packages',
            'subcontractors',
            'equipment_usage_logs',
            'equipment_assignments',
            'equipment',
            'supplier_quotation_items',
            'supplier_quotations',
            'rfq_suppliers',
            'rfq_items',
            'rfqs',
        ];

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            DB::statement("DROP TABLE IF EXISTS `{$table}`");
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /** @return list<string> */
    private function splitStatements(string $sql): array
    {
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
        $parts = preg_split('/;\s*\n/', $sql) ?: [];
        $statements = [];
        foreach ($parts as $part) {
            $trimmed = trim($part);
            if ($trimmed !== '') {
                $statements[] = $trimmed;
            }
        }

        return $statements;
    }
};
