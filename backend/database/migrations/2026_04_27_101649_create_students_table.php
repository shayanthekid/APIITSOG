<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('student_id')->unique();
            $table->string('name');
            $table->date('dob')->nullable();
            $table->enum('gender', ['Male', 'Female', 'Other'])->nullable();
            $table->string('nationality')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->string('passport_number')->nullable();
            $table->enum('type', ['APIIT', 'External'])->default('External');
            
            // Academic
            $table->string('highest_qualification')->nullable();
            $table->string('institution')->nullable();
            $table->string('gpa')->nullable();
            $table->string('english_proficiency')->nullable(); // IELTS, TOEFL, etc
            $table->string('english_score')->nullable();
            $table->string('target_degree')->nullable();
            $table->json('target_countries')->nullable();
            $table->json('target_universities')->nullable();

            // Lead Source
            $table->string('source')->default('Manual');
            $table->string('campaign_name')->nullable();
            $table->timestamp('import_date')->nullable();

            // System Fields
            $table->string('destination')->nullable(); // Primary destination
            $table->string('current_stage')->default('Inquiry');
            $table->boolean('drop_out_flag')->default(false);
            $table->text('drop_out_reason')->nullable();
            $table->foreignId('counselor_id')->nullable()->constrained('users');
            $table->boolean('is_whatsapp_enabled')->default(false);
            $table->timestamp('follow_up_due_date')->nullable();
            $table->string('visa_status')->nullable();
            $table->timestamp('last_contact_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
