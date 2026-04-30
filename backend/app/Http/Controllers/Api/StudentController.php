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
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'counselor_id' => 'nullable|exists:users,id',
        ]);

        $data = $request->all();
        if (empty($data['student_id'])) {
            $data['student_id'] = 'CB0' . rand(1000, 9999);
        }

        return Student::create($data);
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
