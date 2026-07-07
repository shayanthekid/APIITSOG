<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Communication extends Model
{
    /** @use HasFactory<\Database\Factories\CommunicationFactory> */
    use HasFactory;

    protected $fillable = ['student_id', 'consultant_id', 'channel', 'message', 'sent_at'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function consultant()
    {
        return $this->belongsTo(User::class, 'consultant_id');
    }
}
