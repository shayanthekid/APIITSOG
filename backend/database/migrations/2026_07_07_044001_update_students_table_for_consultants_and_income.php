<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Rename counselor_id to consultant_id
            $table->dropForeign(['counselor_id']);
            $table->renameColumn('counselor_id', 'consultant_id');
            $table->foreign('consultant_id')->references('id')->on('users');

            // Add expected income columns
            $table->decimal('expected_income_usd', 10, 2)->nullable();
            $table->decimal('expected_income_lkr', 15, 2)->default(0);

            // Make some previously required fields nullable.
            // NOTE: Only 'name' and 'phone' are mandatory.
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['consultant_id']);
            $table->renameColumn('consultant_id', 'counselor_id');
            $table->foreign('counselor_id')->references('id')->on('users');
            
            $table->dropColumn(['expected_income_usd', 'expected_income_lkr']);
            $table->string('email')->nullable(false)->change();
        });
    }
};
