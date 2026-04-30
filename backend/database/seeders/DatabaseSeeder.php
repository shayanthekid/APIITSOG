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

        // Admin account
        User::factory()->create([
            'name'     => 'Admin',
            'email'    => 'admin@example.com',
            'password' => bcrypt('password'),
            'role'     => 'Counselor Head',
        ]);

        // Education consultants
        $consultants = ['Diluki', 'Tharuka', 'Nimni', 'Ashwini'];
        foreach ($consultants as $consultant) {
            User::factory()->create([
                'name' => $consultant,
                'email' => strtolower($consultant) . '@apiit.lk',
                'password' => bcrypt('password'),
                'role' => 'Counselor',
            ]);
        }

        \App\Models\Student::factory(150)->create();
    }
}
