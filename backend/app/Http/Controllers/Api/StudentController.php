<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::query()->with('counselor');

        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
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
        $validated = $request->validate([
            'student_id' => 'required|unique:students',
            'name' => 'required|string|max:255',
            'type' => 'in:APIIT,External',
        ]);

        return Student::create($request->all());
    }

    public function show($id)
    {
        $student = Student::with(['counselor', 'documents'])->findOrFail($id);
        return $student;
    }

    public function update(Request $request, $id)
    {
        $student = Student::findOrFail($id);
        $student->update($request->all());
        return $student;
    }

    public function destroy($id)
    {
        $student = Student::findOrFail($id);
        $student->delete();
        return response()->noContent();
    }
}
