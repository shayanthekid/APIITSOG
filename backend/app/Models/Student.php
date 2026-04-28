<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    /** @use HasFactory<\Database\Factories\StudentFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id', 'name', 'dob', 'gender', 'nationality', 'email', 'phone', 'address', 'passport_number', 
        'type', 'highest_qualification', 'institution', 'gpa', 'english_proficiency', 'english_score',
        'target_degree', 'target_countries', 'target_universities', 'source', 'campaign_name', 'import_date',
        'destination', 'current_stage', 'drop_out_flag', 'drop_out_reason', 'counselor_id', 'last_contact_date',
        'is_whatsapp_enabled', 'follow_up_due_date', 'visa_status'
    ];

    protected $casts = [
        'target_countries' => 'array',
        'target_universities' => 'array',
        'dob' => 'date',
        'import_date' => 'datetime',
        'last_contact_date' => 'datetime',
        'follow_up_due_date' => 'datetime',
        'drop_out_flag' => 'boolean',
        'is_whatsapp_enabled' => 'boolean',
    ];

    public function counselor()
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }
}
