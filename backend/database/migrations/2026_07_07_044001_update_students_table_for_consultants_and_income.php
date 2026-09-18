<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Add expected income columns
            $table->decimal('expected_income_usd', 10, 2)->nullable();
            $table->decimal('expected_income_lkr', 15, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['expected_income_usd', 'expected_income_lkr']);
        });
    }
};
