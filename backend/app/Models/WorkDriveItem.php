<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkDriveItem extends Model
{
    protected $fillable = ['name', 'type', 'parent_id', 'student_id', 'user_id', 'file_path', 'file_size', 'mime_type'];

    public function parent()
    {
        return $this->belongsTo(WorkDriveItem::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(WorkDriveItem::class, 'parent_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
