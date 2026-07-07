<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Student;
// Assuming a Notification class exists, or we log it for now
use Illuminate\Support\Facades\Log;

class CheckInquirySLA extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sla:check-inquiries';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for inquiries older than 48 hours without stage movement';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $breachedInquiries = Student::where('current_stage', 'Inquiry')
            ->where('updated_at', '<=', now()->subHours(48))
            ->get();

        foreach ($breachedInquiries as $inquiry) {
            // Note: Replace with actual notification logic
            Log::info("SLA Breach: Inquiry for student ID {$inquiry->id} has been idle for over 48 hours.");
            
            // Example of how it would notify the consultant:
            // if ($inquiry->consultant) {
            //     $inquiry->consultant->notify(new SlaBreachNotification($inquiry));
            // }
        }

        $this->info("Processed SLA checks for " . $breachedInquiries->count() . " inquiries.");
    }
}
