<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WorkDriveItem;
use App\Models\User;

class WorkDriveSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        if (!$admin) return;

        // Create the "Internal Documents" root folder
        $internal = WorkDriveItem::firstOrCreate(
            ['name' => 'Internal Documents', 'parent_id' => null],
            ['type' => 'folder', 'user_id' => $admin->id]
        );

        // Add some mock subfolders to Internal Documents
        $folders = ['Marketing Materials', 'Application Forms', 'Visa Guidelines', 'Internal Policies'];
        foreach ($folders as $folder) {
            WorkDriveItem::firstOrCreate(
                ['name' => $folder, 'parent_id' => $internal->id],
                ['type' => 'folder', 'user_id' => $admin->id]
            );
        }
    }
}
