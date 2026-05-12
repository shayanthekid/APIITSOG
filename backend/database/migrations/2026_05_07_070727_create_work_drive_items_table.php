<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_drive_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['folder', 'file']);
            $table->foreignId('parent_id')->nullable()->constrained('work_drive_items')->onDelete('cascade');
            $table->foreignId('student_id')->nullable()->constrained('students')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->string('file_path')->nullable();
            $table->string('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_drive_items');
    }
};
