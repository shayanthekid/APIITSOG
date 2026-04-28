<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    /** @use HasFactory<\Database\Factories\DocumentFactory> */
    use HasFactory;

    protected $fillable = ['student_id', 'type', 'file_path', 'file_name'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
