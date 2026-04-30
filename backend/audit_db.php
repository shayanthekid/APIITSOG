<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Student;
use App\Models\User;

echo "========================================\n";
echo "         DATABASE AUDIT REPORT\n";
echo "========================================\n\n";

$total      = Student::count();
$active     = Student::where('drop_out_flag', false)->count();
$dropped    = Student::where('drop_out_flag', true)->count();
$rakesh     = Student::where('name', 'like', '%Rakesh%')->count();
$users      = User::count();
$counselors = User::where('role', 'Counselor')->orWhere('role', 'Head')->count();

echo "STUDENTS:\n";
echo "  Total:       $total\n";
echo "  Active:      $active\n";
echo "  Dropped Out: $dropped\n";
echo "  'Rakesh' matches: $rakesh\n\n";

echo "USERS:\n";
echo "  Total:      $users\n";
echo "  Counselors: $counselors\n\n";

echo "RECENT ADDITIONS (last 5 by created_at):\n";
Student::orderBy('created_at', 'desc')->take(5)->get(['student_id','name','email','phone','current_stage','created_at'])
    ->each(function($s) {
        echo "  [{$s->student_id}] {$s->name} | {$s->current_stage} | {$s->created_at}\n";
    });

echo "\nOLDEST RECORDS (first 5):\n";
Student::orderBy('created_at', 'asc')->take(5)->get(['student_id','name','email','phone','current_stage','created_at'])
    ->each(function($s) {
        echo "  [{$s->student_id}] {$s->name} | {$s->current_stage} | {$s->created_at}\n";
    });

echo "\nALL USER ACCOUNTS:\n";
User::all(['id','name','email','role'])->each(function($u) {
    echo "  [{$u->id}] {$u->name} ({$u->email}) — {$u->role}\n";
});

echo "\nSTAGE DISTRIBUTION:\n";
Student::selectRaw('current_stage, count(*) as cnt')->groupBy('current_stage')->orderBy('cnt','desc')->get()
    ->each(fn($r) => print("  {$r->current_stage}: {$r->cnt}\n"));

echo "\nSOURCE DISTRIBUTION:\n";
Student::selectRaw('source, count(*) as cnt')->groupBy('source')->orderBy('cnt','desc')->get()
    ->each(fn($r) => print("  {$r->source}: {$r->cnt}\n"));

echo "\n========================================\n";
echo "           FIELD COMPLETENESS\n";
echo "========================================\n";
$checks = ['email','phone','intake','preferred_program','destination','level','lead_status','target_universities'];
foreach ($checks as $field) {
    $filled = Student::whereNotNull($field)->where($field, '!=', '')->where($field, '!=', 'null')->count();
    $pct    = $total ? round(($filled / $total) * 100) : 0;
    echo "  $field: $filled/$total ($pct%)\n";
}
