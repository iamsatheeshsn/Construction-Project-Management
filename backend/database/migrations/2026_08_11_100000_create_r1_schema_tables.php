<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tenants')) {
            return;
        }

        $path = database_path('schema/r1_schema.sql');
        $sql = File::get($path);

        $sql = preg_replace('/^CREATE DATABASE[\s\S]*?;\s*/mi', '', $sql) ?? $sql;
        $sql = preg_replace('/^USE\s+`?cpm`?\s*;\s*/mi', '', $sql) ?? $sql;

        $statements = $this->splitStatements($sql);

        foreach ($statements as $statement) {
            DB::unprepared($statement);
        }
    }

    public function down(): void
    {
        $tables = DB::select('SHOW TABLES');
        $key = 'Tables_in_'.DB::getDatabaseName();

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            $name = $table->{$key};
            if (in_array($name, ['migrations', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'], true)) {
                continue;
            }
            DB::statement("DROP TABLE IF EXISTS `{$name}`");
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
