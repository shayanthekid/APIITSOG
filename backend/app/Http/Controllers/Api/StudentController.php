<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::query()->with('counselor');

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('student_id', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%')
                  ->orWhere('phone', 'like', '%' . $request->search . '%')
                  ->orWhere('passport_number', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('stage') && $request->stage !== 'All') {
            $query->where('current_stage', $request->stage);
        }

        if ($request->has('counselor_id') && $request->counselor_id !== 'All') {
            $query->where('counselor_id', $request->counselor_id);
        }

        if ($request->has('type') && $request->type !== 'All') {
            $query->where('type', $request->type);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email',
            'phone'        => 'nullable|string',
            'counselor_id' => 'nullable|exists:users,id',
            'document'     => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB max
        ]);

        $data = $request->all();

        // Generate a unique student ID if not provided
        if (empty($data['student_id'])) {
            do {
                $candidate = 'CB' . str_pad(rand(10000, 99999), 5, '0', STR_PAD_LEFT);
            } while (Student::where('student_id', $candidate)->exists());
            $data['student_id'] = $candidate;
        }

        // Ensure sensible defaults
        $data['drop_out_flag']  = isset($data['drop_out_flag'])  ? (filter_var($data['drop_out_flag'], FILTER_VALIDATE_BOOLEAN))  : false;
        $data['current_stage']  = $data['current_stage']  ?? 'Inquiry';
        $data['type']           = $data['type']           ?? 'External';
        $data['source']         = $data['source']         ?? 'Manual';

        // Coerce target_universities to array if it's a plain string
        if (isset($data['target_universities']) && is_string($data['target_universities'])) {
            $data['target_universities'] = array_filter(
                array_map('trim', explode(',', $data['target_universities']))
            );
        }

        $student = Student::create($data);

        // Handle initial document upload if present
        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $path = $file->store('documents/' . $student->id, 'public');
            
            Document::create([
                'student_id' => $student->id,
                'type'       => 'Initial Document',
                'file_path'  => $path,
                'file_name'  => $file->getClientOriginalName(),
            ]);
        }

        return $student->load(['counselor', 'documents']);
    }

    public function show($id)
    {
        return Student::with(['counselor', 'documents'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $student = Student::findOrFail($id);

        $data = $request->all();

        // Coerce booleans
        if (array_key_exists('drop_out_flag', $data)) {
            $data['drop_out_flag'] = filter_var($data['drop_out_flag'], FILTER_VALIDATE_BOOLEAN);
        }
        if (array_key_exists('is_whatsapp_enabled', $data)) {
            $data['is_whatsapp_enabled'] = filter_var($data['is_whatsapp_enabled'], FILTER_VALIDATE_BOOLEAN);
        }

        // Coerce target_universities to array if string
        if (isset($data['target_universities']) && is_string($data['target_universities'])) {
            $data['target_universities'] = array_filter(
                array_map('trim', explode(',', $data['target_universities']))
            );
        }

        $student->update($data);

        return $student->load(['counselor', 'documents']);
    }

    public function uploadDocument(Request $request, $id)
    {
        $student = Student::findOrFail($id);

        $request->validate([
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'type'     => 'nullable|string|max:100',
        ]);

        $file = $request->file('document');
        $path = $file->store('documents/' . $student->id, 'public');

        $doc = Document::create([
            'student_id' => $student->id,
            'type'       => $request->type ?? 'Other',
            'file_path'  => $path,
            'file_name'  => $file->getClientOriginalName(),
        ]);

        return response()->json($doc, 201);
    }

    public function destroy($id)
    {
        $student = Student::findOrFail($id);
        
        // Delete document files from storage
        foreach ($student->documents as $doc) {
            Storage::disk('public')->delete($doc->file_path);
        }
        
        $student->delete();
        return response()->noContent();
    }
}
