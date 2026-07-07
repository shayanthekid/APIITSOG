<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Using string concatenation to prevent global search & replace modifications
        DB::table('users')->where('role', 'Coun' . 'selor')->update(['role' => 'Consultant']);
        DB::table('users')->where('role', 'Coun' . 'selor Head')->update(['role' => 'Consultant Head']);
        
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('Consultant')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('Coun' . 'selor')->change();
        });
        
        DB::table('users')->where('role', 'Consultant')->update(['role' => 'Coun' . 'selor']);
        DB::table('users')->where('role', 'Consultant Head')->update(['role' => 'Coun' . 'selor Head']);
    }
};
