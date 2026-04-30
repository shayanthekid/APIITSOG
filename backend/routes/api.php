<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ImportExportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Protected routes (require valid Sanctum token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return response()->json([
            'id'    => $request->user()->id,
            'name'  => $request->user()->name,
            'email' => $request->user()->email,
            'role'  => $request->user()->role,
        ]);
    });

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Import & Export MUST be before apiResource to avoid route param conflict
    Route::post('/students/import', [ImportExportController::class, 'import']);
    Route::get('/students/export', [ImportExportController::class, 'export']);

    Route::apiResource('students', \App\Http\Controllers\Api\StudentController::class);
    Route::post('/students/{student}/documents', [\App\Http\Controllers\Api\StudentController::class, 'uploadDocument']);

    Route::get('/counselors', function () {
        return response()->json(\App\Models\User::where('role', 'like', '%Counselor%')->get());
    });
});
