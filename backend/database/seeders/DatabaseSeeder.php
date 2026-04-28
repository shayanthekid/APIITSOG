<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Counselor Head User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'Counselor Head',
        ]);

        User::factory()->create([
            'name' => 'Standard Counselor',
            'email' => 'counselor@example.com',
            'password' => bcrypt('password'),
            'role' => 'Counselor',
        ]);

        \App\Models\Student::factory(150)->create();
    }
}
