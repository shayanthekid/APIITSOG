<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ImportExportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Bounce endpoint for forcing downloads
Route::post('/export/bounce', function (Request $request) {
    $content = base64_decode($request->input('content'));
    $filename = $request->input('filename', 'export.file');
    $mime = $request->input('mime_type', 'application/octet-stream');
    
    return response($content)
        ->header('Content-Type', $mime)
        ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
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
    Route::get('/reminders', [\App\Http\Controllers\Api\StudentController::class, 'reminders']);

    Route::apiResource('students', \App\Http\Controllers\Api\StudentController::class);
    Route::post('/students/{student}/documents', [\App\Http\Controllers\Api\StudentController::class, 'uploadDocument']);
    Route::put('/students/{student}/documents/{documentId}/status', [\App\Http\Controllers\Api\StudentController::class, 'updateDocumentStatus']);

    Route::get('/counselors', function () {
        return response()->json(\App\Models\User::where('role', 'like', '%Counselor%')->get());
    });

    // WorkDrive Routes
    Route::get('/workdrive', [\App\Http\Controllers\Api\WorkDriveController::class, 'index']);
    Route::get('/workdrive/search', [\App\Http\Controllers\Api\WorkDriveController::class, 'search']);
    Route::post('/workdrive/folder', [\App\Http\Controllers\Api\WorkDriveController::class, 'createFolder']);
    Route::post('/workdrive/upload', [\App\Http\Controllers\Api\WorkDriveController::class, 'uploadFile']);
    Route::delete('/workdrive/{id}', [\App\Http\Controllers\Api\WorkDriveController::class, 'destroy']);
    Route::get('/workdrive/{id}/download', [\App\Http\Controllers\Api\WorkDriveController::class, 'download']);
    Route::get('/workdrive/logs', [\App\Http\Controllers\Api\WorkDriveController::class, 'getLogs']);
});
