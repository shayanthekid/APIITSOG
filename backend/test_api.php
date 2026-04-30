<?php
require __DIR__ . '/vendor/autoload.php';
$app    = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

// ─── Helpers ────────────────────────────────────────────────
$pass  = 0;
$fail  = 0;
$tests = [];

function ok(string $name, bool $result, string $detail = '') {
    global $pass, $fail, $tests;
    $tests[] = ['name' => $name, 'pass' => $result, 'detail' => $detail];
    if ($result) { $pass++; echo "  ✅  $name\n"; }
    else         { $fail++; echo "  ❌  $name" . ($detail ? " — $detail" : '') . "\n"; }
}

function assert_ok(string $name, $value, $expected, string $detail = '') {
    $result = $value === $expected;
    ok($name, $result, $result ? '' : "Expected: ".json_encode($expected)." Got: ".json_encode($value).($detail?" ($detail)":''));
}

$baseUrl = 'http://127.0.0.1:8000/api';

// ─── Login to get token ──────────────────────────────────────
echo "\n========================================\n";
echo "   SGO STUDENT API — UNIT TEST SUITE\n";
echo "========================================\n\n";

echo "[ AUTH ]\n";
$loginRes = Http::post("$baseUrl/auth/login", ['email' => 'admin@example.com', 'password' => 'password']);
ok('Login returns 200',     $loginRes->status() === 200, "HTTP {$loginRes->status()}");
ok('Login returns token',   isset($loginRes->json()['token']), json_encode($loginRes->json()));

$token = $loginRes->json()['token'] ?? null;
if (!$token) { echo "\nFATAL: Cannot get auth token. Aborting.\n"; exit(1); }

$auth = ['Authorization' => "Bearer $token", 'Accept' => 'application/json'];

// ─── GET /api/students ───────────────────────────────────────
echo "\n[ LIST STUDENTS ]\n";
$listRes = Http::withHeaders($auth)->get("$baseUrl/students");
ok('GET /students returns 200',         $listRes->status() === 200);
ok('GET /students returns array',       is_array($listRes->json()));
ok('GET /students returns 150+ records', count($listRes->json()) >= 150, "Got: ".count($listRes->json()));
$firstStudent = $listRes->json()[0] ?? null;
ok('Each student has student_id',       isset($firstStudent['student_id']));
ok('Each student has name',             isset($firstStudent['name']));
ok('Each student has counselor rel',    isset($firstStudent['counselor']));
ok('Each student has intake field',     array_key_exists('intake', $firstStudent));
ok('Each student has preferred_program',array_key_exists('preferred_program', $firstStudent));
ok('Each student has lead_status',      array_key_exists('lead_status', $firstStudent));
ok('Each student has target_universities', array_key_exists('target_universities', $firstStudent));

// ─── POST /api/students (Fast Add) ──────────────────────────
echo "\n[ ADD STUDENT — FAST ADD ]\n";
$newStudent = [
    'name'              => 'Rakesh Sharma',
    'phone'             => '+94 77 900 0001',
    'email'             => 'rakesh.sharma.test@example.com',
    'counselor_id'      => User::first()->id,
    'source'            => 'Walk - in',
    'type'              => 'External',
    'destination'       => 'UK',
    'intake'            => 'Sep 2025',
    'preferred_program' => 'Computer Science',
    'target_universities' => ['University of Manchester'],
    'lead_status'       => 'Lead',
    'current_stage'     => 'Inquiry',
];

$addRes = Http::withHeaders($auth)->post("$baseUrl/students", $newStudent);
ok('POST /students returns 200/201',     in_array($addRes->status(), [200, 201]), "HTTP {$addRes->status()}");
ok('Created student has name',           ($addRes->json()['name'] ?? '') === 'Rakesh Sharma');
ok('Created student has student_id',     !empty($addRes->json()['student_id'] ?? ''));
ok('Created student has intake',         ($addRes->json()['intake'] ?? '') === 'Sep 2025');
ok('Created student has destination',    ($addRes->json()['destination'] ?? '') === 'UK');
ok('Created student has lead_status',    ($addRes->json()['lead_status'] ?? '') === 'Lead');
ok('Created student has preferred_program', ($addRes->json()['preferred_program'] ?? '') === 'Computer Science');
ok('Created student has target_universities', !empty($addRes->json()['target_universities'] ?? []));
ok('Created student defaults to Inquiry stage', ($addRes->json()['current_stage'] ?? '') === 'Inquiry');
ok('Created student is not dropped out', ($addRes->json()['drop_out_flag'] ?? true) === false);

$createdId  = $addRes->json()['id'] ?? null;
$studentId  = $addRes->json()['student_id'] ?? null;

// ─── POST validation (missing name) ─────────────────────────
echo "\n[ ADD STUDENT — VALIDATION ]\n";
$badRes = Http::withHeaders($auth)->post("$baseUrl/students", ['email' => 'nope@test.com']);
ok('POST without name returns 422',  $badRes->status() === 422, "HTTP {$badRes->status()}");
ok('Validation error mentions name', str_contains(json_encode($badRes->json()), 'name'), json_encode($badRes->json()));

// ─── POST duplicate handling ─────────────────────────────────
echo "\n[ ADD STUDENT — ADVANCED FIELDS ]\n";
$advStudent = [
    'name'                  => 'Priya Nair Test',
    'phone'                 => '+94 76 111 2222',
    'email'                 => 'priya.nair.adv@example.com',
    'counselor_id'          => User::first()->id,
    'source'                => 'Facebook',
    'type'                  => 'APIIT',
    'destination'           => 'Australia',
    'intake'                => 'Jan 2026',
    'preferred_program'     => 'Data Science',
    'target_universities'   => ['Monash University'],
    'lead_status'           => 'Prospective',
    'current_stage'         => 'Inquiry',
    'dob'                   => '2000-05-15',
    'gender'                => 'Female',
    'nationality'           => 'Sri Lankan',
    'passport_number'       => 'N9876543',
    'address'               => 'Colombo 05, Sri Lanka',
    'highest_qualification' => 'A-Levels',
    'institution'           => 'APIIT Lanka',
    'gpa'                   => '3.8',
    'english_proficiency'   => 'IELTS',
    'english_score'         => '7.0',
    'level'                 => 'UG - Direct',
    'remarks'               => 'Strong candidate, fast track visa.',
];

$advRes = Http::withHeaders($auth)->post("$baseUrl/students", $advStudent);
ok('POST advanced add returns 200/201',      in_array($advRes->status(), [200, 201]), "HTTP {$advRes->status()}");
ok('Advanced: nationality saved',            ($advRes->json()['nationality'] ?? '') === 'Sri Lankan');
ok('Advanced: passport saved',               ($advRes->json()['passport_number'] ?? '') === 'N9876543');
ok('Advanced: gpa saved',                    ($advRes->json()['gpa'] ?? '') === '3.8');
ok('Advanced: english_proficiency saved',    ($advRes->json()['english_proficiency'] ?? '') === 'IELTS');
ok('Advanced: level saved',                  ($advRes->json()['level'] ?? '') === 'UG - Direct');
ok('Advanced: remarks saved',               ($advRes->json()['remarks'] ?? '') === 'Strong candidate, fast track visa.');
ok('Advanced: institution saved',            ($advRes->json()['institution'] ?? '') === 'APIIT Lanka');

$advId = $advRes->json()['id'] ?? null;

// ─── GET /api/students/:id ───────────────────────────────────
echo "\n[ GET STUDENT BY ID ]\n";
if ($createdId) {
    $getRes = Http::withHeaders($auth)->get("$baseUrl/students/$createdId");
    ok('GET /students/:id returns 200',       $getRes->status() === 200, "HTTP {$getRes->status()}");
    ok('GET returns correct student',         ($getRes->json()['name'] ?? '') === 'Rakesh Sharma');
    ok('GET includes counselor relation',     isset($getRes->json()['counselor']));
    ok('GET includes documents relation',     array_key_exists('documents', $getRes->json()));
    ok('GET returns intake',                  ($getRes->json()['intake'] ?? '') === 'Sep 2025');
    ok('GET returns target_universities',     !empty($getRes->json()['target_universities'] ?? []));
}

$notFoundRes = Http::withHeaders($auth)->get("$baseUrl/students/99999");
ok('GET non-existent student returns 404',  $notFoundRes->status() === 404, "HTTP {$notFoundRes->status()}");

// ─── PUT /api/students/:id ───────────────────────────────────
echo "\n[ EDIT STUDENT ]\n";
if ($createdId) {
    $editPayload = [
        'name'              => 'Rakesh Sharma',
        'phone'             => '+94 77 900 0001',
        'email'             => 'rakesh.sharma.test@example.com',
        'destination'       => 'Canada',
        'current_stage'     => 'Follow-up',
        'lead_status'       => 'Prospective',
        'intake'            => 'Jan 2026',
        'preferred_program' => 'Data Science',
        'target_universities' => ['University of Toronto'],
        'level'             => 'PG',
        'visa_status'       => 'Pending',
        'remarks'           => 'Changed destination to Canada after consultation.',
        'drop_out_flag'     => false,
    ];

    $editRes = Http::withHeaders($auth)->put("$baseUrl/students/$createdId", $editPayload);
    ok('PUT /students/:id returns 200',        $editRes->status() === 200, "HTTP {$editRes->status()}");
    ok('Edit: destination updated to Canada',  ($editRes->json()['destination'] ?? '') === 'Canada');
    ok('Edit: stage updated to Follow-up',     ($editRes->json()['current_stage'] ?? '') === 'Follow-up');
    ok('Edit: lead_status updated',            ($editRes->json()['lead_status'] ?? '') === 'Prospective');
    ok('Edit: intake updated',                 ($editRes->json()['intake'] ?? '') === 'Jan 2026');
    ok('Edit: program updated',                ($editRes->json()['preferred_program'] ?? '') === 'Data Science');
    ok('Edit: level updated',                  ($editRes->json()['level'] ?? '') === 'PG');
    ok('Edit: visa_status saved',              ($editRes->json()['visa_status'] ?? '') === 'Pending');
    ok('Edit: remarks saved',                  str_contains($editRes->json()['remarks'] ?? '', 'Canada'));
    ok('Edit: name preserved',                 ($editRes->json()['name'] ?? '') === 'Rakesh Sharma');

    // Verify persistence by re-fetching
    $verifyRes = Http::withHeaders($auth)->get("$baseUrl/students/$createdId");
    ok('Edit: changes persisted (re-fetch destination)', ($verifyRes->json()['destination'] ?? '') === 'Canada');
    ok('Edit: changes persisted (re-fetch stage)',        ($verifyRes->json()['current_stage'] ?? '') === 'Follow-up');

    // Test drop_out_flag toggle
    $dropRes = Http::withHeaders($auth)->put("$baseUrl/students/$createdId", ['drop_out_flag' => true, 'drop_out_reason' => 'Visa refused']);
    ok('Edit: drop_out_flag can be set to true',  ($dropRes->json()['drop_out_flag'] ?? false) === true);

    $undropRes = Http::withHeaders($auth)->put("$baseUrl/students/$createdId", ['drop_out_flag' => false]);
    ok('Edit: drop_out_flag can be unset',        ($undropRes->json()['drop_out_flag'] ?? true) === false);
}

// ─── PUT non-existent ────────────────────────────────────────
$badEdit = Http::withHeaders($auth)->put("$baseUrl/students/99999", ['name' => 'Ghost']);
ok('PUT non-existent student returns 404',  $badEdit->status() === 404, "HTTP {$badEdit->status()}");

// ─── Import endpoint ─────────────────────────────────────────
echo "\n[ IMPORT ENDPOINT ]\n";
$importRows = [
    ['Name' => 'Import Test One', 'Education Consultant Name' => '', 'Number' => '+94 71 111 0001', 'Email Address' => 'importone@example.com', 'Source' => 'Expo', 'Student Type' => 'APIIT', 'Prefferred Country' => 'UK', 'Level' => 'PG', 'Prefferred  Program' => 'MBA', 'Prefferred University' => 'University of Leeds', 'Lead Status' => 'Lead', 'Intake' => 'Sep 2025'],
    ['Name' => 'Import Test Two', 'Education Consultant Name' => '', 'Number' => '+94 71 111 0002', 'Email Address' => 'importtwo@example.com', 'Source' => 'Facebook', 'Student Type' => 'Non APIIT', 'Prefferred Country' => 'Australia', 'Level' => 'UG - Direct', 'Prefferred  Program' => 'Nursing', 'Prefferred University' => 'Deakin University', 'Lead Status' => 'Prospective', 'Intake' => 'Jan 2026'],
    ['Name' => '', 'Email Address' => 'empty@example.com'], // should be skipped
];

$importRes = Http::withHeaders($auth)->post("$baseUrl/students/import", ['rows' => $importRows]);
ok('POST /students/import returns 200',       $importRes->status() === 200, "HTTP {$importRes->status()} — ".json_encode($importRes->json()));
ok('Import: imported count is 2',             ($importRes->json()['imported'] ?? 0) === 2, "Got: ".($importRes->json()['imported'] ?? 'null'));
ok('Import: skipped count is 1 (empty name)', ($importRes->json()['skipped'] ?? 0) === 1, "Got: ".($importRes->json()['skipped'] ?? 'null'));

// Verify imported students exist
$imported1 = Student::where('name', 'Import Test One')->first();
ok('Import: student 1 saved in DB',           $imported1 !== null);
ok('Import: student 1 has correct source',    ($imported1->source ?? '') === 'Expo');
ok('Import: student 1 stage mapped to Inquiry', ($imported1->current_stage ?? '') === 'Inquiry');

// Re-import same rows — should UPDATE not duplicate
$reimportRes = Http::withHeaders($auth)->post("$baseUrl/students/import", ['rows' => $importRows]);
ok('Re-import: returns 200',                  $reimportRes->status() === 200);
$dupCount = Student::where('name', 'Import Test One')->count();
ok('Re-import: no duplicate created',         $dupCount === 1, "Found $dupCount records");

// ─── Export endpoint ─────────────────────────────────────────
echo "\n[ EXPORT ENDPOINT ]\n";
$exportRes = Http::withHeaders($auth)->get("$baseUrl/students/export");
ok('GET /students/export returns 200',        $exportRes->status() === 200, "HTTP {$exportRes->status()}");
ok('Export returns array',                    is_array($exportRes->json()));
ok('Export has 150+ records',                 count($exportRes->json()) >= 150, "Got: ".count($exportRes->json()));
$expRow = $exportRes->json()[0] ?? [];
ok('Export row has Name column',              array_key_exists('Name', $expRow));
ok('Export row has Education Consultant Name',array_key_exists('Education Consultant Name', $expRow));
ok('Export row has Preferred Country column', array_key_exists('Preferred Country', $expRow));
ok('Export row has Intake column',            array_key_exists('Intake', $expRow));
ok('Export row has Preferred University',     array_key_exists('Preferred University', $expRow));
ok('Export row has Lead Status column',       array_key_exists('Lead Status', $expRow));
ok('Export row has Current Stage column',     array_key_exists('Current Stage', $expRow));

// ─── Cleanup test data ───────────────────────────────────────
echo "\n[ CLEANUP ]\n";
$cleaned = 0;
foreach (['Rakesh Sharma', 'Priya Nair Test', 'Import Test One', 'Import Test Two'] as $nm) {
    $del = Student::where('name', $nm)->delete();
    $cleaned += $del;
}
ok("Cleaned $cleaned test records",           $cleaned >= 3);

// ─── FINAL SUMMARY ───────────────────────────────────────────
echo "\n========================================\n";
echo "            TEST SUMMARY\n";
echo "========================================\n";
echo "  PASSED:  $pass\n";
echo "  FAILED:  $fail\n";
echo "  TOTAL:   " . ($pass + $fail) . "\n";
if ($fail === 0) {
    echo "\n  🎉 ALL TESTS PASSED\n";
} else {
    echo "\n  ⚠️  $fail test(s) failed — review above\n";
}
echo "========================================\n\n";
