<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('purchase_orders')) {
            return;
        }

        $path = database_path('schema/r2_ops_schema.sql');
        $sql = File::get($path);

        $sql = preg_replace('/^USE\s+`?cpm`?\s*;\s*/mi', '', $sql) ?? $sql;

        $statements = $this->splitStatements($sql);

        foreach ($statements as $statement) {
            DB::unprepared($statement);
        }
    }

    public function down(): void
    {
        $tables = [
            'material_issue_items',
            'material_issues',
            'goods_receipt_items',
            'goods_receipts',
            'purchase_order_items',
            'purchase_orders',
            'purchase_request_items',
            'purchase_requests',
            'material_request_items',
            'material_requests',
            'stock_transactions',
            'stock_balances',
            'warehouses',
            'inventory_items',
            'suppliers',
        ];

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            DB::statement("DROP TABLE IF EXISTS `{$table}`");
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /**
     * @return list<string>
     */
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
