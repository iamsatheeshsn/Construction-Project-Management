<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RbacSeeder::class,
            SuperAdminSeeder::class,
            // DemoDataSeeder::class, // run via: php artisan db:seed --class=DemoDataSeeder
        ]);
    }
}
