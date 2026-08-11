<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'saas.admin@cpm.test'],
            [
                'name' => 'SaaS Admin',
                'password' => 'Password123!',
                'preferred_locale' => 'en',
                'is_super_admin' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
