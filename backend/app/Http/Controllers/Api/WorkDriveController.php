<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkDriveItem;
use App\Models\ActivityLog;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WorkDriveController extends Controller
{
    public function index(Request $request)
    {
        $query = WorkDriveItem::with(['user', 'student']);

        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        } else {
            $query->where('parent_id', $request->get('parent_id'));
        }

        return response()->json($query->get());
    }

    public function search(Request $request)
    {
        $q = $request->get('q');
        if (empty($q)) return response()->json([]);

        $items = WorkDriveItem::with(['user', 'student'])
            ->where('name', 'like', "%{$q}%")
            ->get();

        $docs = \App\Models\Document::with('student')
            ->where('file_name', 'like', "%{$q}%")
            ->get();

        $merged = collect();
        
        foreach ($items as $item) {
            $merged->push([
                'id' => $item->id,
                'name' => $item->name,
                'type' => $item->type,
                'author' => $item->user->name ?? 'Unknown',
                'date' => $item->created_at->format('m/d/Y'),
                'size' => $item->file_size ?? '--',
                'is_virtual' => false,
                'is_student_doc' => false
            ]);
        }

        foreach ($docs as $doc) {
            $merged->push([
                'id' => 'doc_' . $doc->id,
                'name' => $doc->file_name,
                'type' => 'file',
                'author' => $doc->student->counselor->name ?? 'System',
                'date' => $doc->created_at->format('m/d/Y'),
                'size' => 'Unknown',
                'is_virtual' => false,
                'is_student_doc' => true,
                'file_path' => $doc->file_path
            ]);
        }

        // Search Students (to show their virtual folders)
        $students = Student::with('counselor')
            ->where('name', 'like', "%{$q}%")
            ->orWhere('student_id', 'like', "%{$q}%")
            ->get();

        foreach ($students as $s) {
            $merged->push([
                'id' => "student_{$s->id}",
                'name' => "{$s->name} ({$s->student_id})",
                'type' => 'folder',
                'author' => $s->counselor->name ?? 'System',
                'date' => $s->created_at->format('m/d/Y'),
                'size' => '--',
                'is_virtual' => true,
                'is_student_doc' => false
            ]);
        }

        return response()->json($merged);
    }

    public function createFolder(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:work_drive_items,id',
        ]);

        $folder = WorkDriveItem::create([
            'name' => $request->name,
            'type' => 'folder',
            'parent_id' => $request->parent_id,
            'user_id' => $request->user()->id,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'create_folder',
            'description' => "Created folder: {$folder->name}",
            'target_type' => 'folder',
            'target_id' => $folder->id,
        ]);

        return response()->json($folder, 201);
    }

    public function uploadFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:20480',
            'parent_id' => 'nullable|exists:work_drive_items,id',
            'student_id' => 'nullable|exists:students,id',
        ]);

        $file = $request->file('file');
        $path = $file->store('workdrive', 'public');

        $item = WorkDriveItem::create([
            'name' => $file->getClientOriginalName(),
            'type' => 'file',
            'parent_id' => $request->parent_id,
            'student_id' => $request->student_id,
            'user_id' => $request->user()->id,
            'file_path' => $path,
            'file_size' => $this->formatBytes($file->getSize()),
            'mime_type' => $file->getMimeType(),
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'upload',
            'description' => "Uploaded file: {$item->name}",
            'target_type' => 'file',
            'target_id' => $item->id,
        ]);

        return response()->json($item, 201);
    }

    public function destroy($id, Request $request)
    {
        $item = WorkDriveItem::findOrFail($id);
        $name = $item->name;

        if ($item->type === 'file') {
            Storage::disk('public')->delete($item->file_path);
        }

        $item->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'delete',
            'description' => "Deleted {$item->type}: {$name}",
            'target_type' => $item->type,
            'target_id' => $id,
        ]);

        return response()->noContent();
    }

    public function download($id)
    {
        $item = WorkDriveItem::findOrFail($id);
        if ($item->type !== 'file') {
            return response()->json(['message' => 'Not a file'], 400);
        }

        return Storage::disk('public')->download($item->file_path, $item->name);
    }

    public function getLogs()
    {
        return ActivityLog::with('user')->latest()->take(50)->get();
    }

    private function formatBytes($bytes, $precision = 2) { 
        $units = array('B', 'KB', 'MB', 'GB', 'TB'); 
        $bytes = max($bytes, 0); 
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024)); 
        $pow = min($pow, count($units) - 1); 
        $bytes /= pow(1024, $pow); 
        return round($bytes, $precision) . ' ' . $units[$pow]; 
    }
}
