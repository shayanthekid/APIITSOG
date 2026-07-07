<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckOverdueReminders extends Command
{
    protected $signature = 'reminders:check-overdue';
    protected $description = 'Check for overdue reminders and notify the Head of Department';

    public function handle()
    {
        $overdueReminders = DB::table('tasks_and_reminders')
            ->join('students', 'tasks_and_reminders.student_id', '=', 'students.id')
            ->where('students.drop_out_flag', false) // Only active students (pause if Dropped)
            ->where('tasks_and_reminders.due_date', '<=', now())
            ->where('tasks_and_reminders.notified_head', false)
            ->select('tasks_and_reminders.*', 'students.name as student_name')
            ->get();

        foreach ($overdueReminders as $reminder) {
            // Log notification to Head of Department (simulate alert)
            Log::warning("ALERT: Overdue action for student '{$reminder->student_name}'. Action: '{$reminder->title}' was due on {$reminder->due_date}. Notifying Consultant Head.");

            // Update to prevent duplicate notifications
            DB::table('tasks_and_reminders')
                ->where('id', $reminder->id)
                ->update(['notified_head' => true]);
        }

        $this->info("Processed " . $overdueReminders->count() . " overdue reminders.");
    }
}
