<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // From Inquiries sheet - fields not yet in schema
            $table->string('intake')->nullable()->after('type');           // e.g. "Sep 2025"
            $table->string('preferred_program')->nullable()->after('intake'); // Preferred Program
            $table->string('level')->nullable()->after('preferred_program'); // UG - Direct, PG, etc.
            $table->string('lead_status')->nullable()->after('level');     // Lead Status from Data sheet
            $table->text('remarks')->nullable()->after('lead_status');     // Remarks column
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['intake', 'preferred_program', 'level', 'lead_status', 'remarks']);
        });
    }
};
