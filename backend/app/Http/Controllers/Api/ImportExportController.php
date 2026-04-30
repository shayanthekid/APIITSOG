<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ImportExportController extends Controller
{
    /**
     * Import students from parsed Excel rows (JSON sent from frontend SheetJS).
     * Expects an array of row objects matching the SG Inquiries Sheet format.
     */
    public function import(Request $request)
    {
        $request->validate([
            'rows' => 'required|array|min:1',
        ]);

        $rows = $request->input('rows');

        // Build a counselor name→id map for lookup
        $counselors = User::where('role', 'Counselor')
            ->orWhere('role', 'Head')
            ->get()
            ->keyBy(fn($u) => strtolower(trim($u->name)));

        $imported = 0;
        $skipped  = 0;
        $errors   = [];

        foreach ($rows as $index => $row) {
            // Normalize: keys may come with different casing from SheetJS
            $row = array_change_key_case($row, CASE_LOWER);

            $name = trim($row['name'] ?? '');
            if (empty($name)) {
                $skipped++;
                continue;
            }

            // Map Excel columns to DB fields
            $counselorName = strtolower(trim($row['education consultant name'] ?? $row['counselor'] ?? ''));
            $counselorId   = $counselors->get($counselorName)?->id ?? null;

            // Map "Student Type" → type enum (APIIT / External)
            $typeRaw = strtolower(trim($row['student type'] ?? ''));
            $type    = str_contains($typeRaw, 'apiit') ? 'APIIT' : 'External';

            // Map Lead Status → current_stage
            $leadStatus = trim($row['lead status'] ?? '');
            $stage      = $this->mapLeadStatusToStage($leadStatus);

            // Map preferred country → destination
            $destination = trim($row['prefferred country'] ?? $row['preferred country'] ?? $row['country'] ?? '');

            // Build student data array
            $data = [
                'student_id'       => 'CB0' . rand(10000, 99999),
                'name'             => $name,
                'email'            => trim($row['email address'] ?? $row['email'] ?? '') ?: null,
                'phone'            => trim($row['number'] ?? $row['phone'] ?? '') ?: null,
                'address'          => trim($row['address'] ?? '') ?: null,
                'source'           => trim($row['source'] ?? 'Manual') ?: 'Manual',
                'type'             => $type,
                'intake'           => trim($row['intake'] ?? '') ?: null,
                'preferred_program'=> trim($row['prefferred  program'] ?? $row['preferred program'] ?? $row['program'] ?? '') ?: null,
                'level'            => trim($row['level'] ?? '') ?: null,
                'destination'      => $destination ?: null,
                'target_universities' => $row['prefferred university'] ?? $row['preferred university'] ?? $row['university'] ?? null
                    ? [trim($row['prefferred university'] ?? $row['preferred university'] ?? $row['university'] ?? '')]
                    : null,
                'lead_status'      => $leadStatus ?: null,
                'current_stage'    => $stage,
                'remarks'          => trim($row['remarks'] ?? '') ?: null,
                'visa_status'      => trim($row['visa status'] ?? '') ?: null,
                'counselor_id'     => $counselorId,
                'import_date'      => now(),
            ];

            // Avoid exact duplicate (same name + phone)
            $existing = Student::where('name', $name)
                ->when(!empty($data['phone']), fn($q) => $q->where('phone', $data['phone']))
                ->first();

            if ($existing) {
                // Update instead of duplicate
                $existing->update($data);
            } else {
                Student::create($data);
            }

            $imported++;
        }

        return response()->json([
            'message'  => "$imported record(s) imported successfully.",
            'imported' => $imported,
            'skipped'  => $skipped,
        ]);
    }

    /**
     * Export all (or filtered) students as JSON structured for SheetJS on the frontend.
     */
    public function export(Request $request)
    {
        $query = Student::with('counselor');

        if ($request->has('ids')) {
            $query->whereIn('id', explode(',', $request->ids));
        }

        $students = $query->get();

        $rows = $students->map(function ($s) {
            $unis = is_array($s->target_universities) ? implode(', ', $s->target_universities) : ($s->target_universities ?? '');
            $countries = is_array($s->target_countries) ? implode(', ', $s->target_countries) : ($s->target_countries ?? '');

            return [
                'Name'                      => $s->name,
                'Education Consultant Name' => $s->counselor?->name ?? '',
                'Number'                    => $s->phone ?? '',
                'Email Address'             => $s->email ?? '',
                'Address'                   => $s->address ?? '',
                'Source'                    => $s->source ?? '',
                'Student Type'              => $s->type ?? '',
                'Intake'                    => $s->intake ?? '',
                'Preferred Program'         => $s->preferred_program ?? '',
                'Preferred Country'         => $s->destination ?? '',
                'Level'                     => $s->level ?? '',
                'Preferred University'      => $unis,
                'Lead Status'               => $s->lead_status ?? $this->stageToLeadStatus($s->current_stage),
                'Current Stage'             => $s->current_stage ?? '',
                'Visa Status'               => $s->visa_status ?? '',
                'Remarks'                   => $s->remarks ?? '',
                'Student ID'                => $s->student_id ?? '',
                'Drop Out'                  => $s->drop_out_flag ? 'Yes' : 'No',
                'Last Contact'              => $s->last_contact_date ? $s->last_contact_date->format('Y-m-d') : '',
            ];
        });

        return response()->json($rows);
    }

    /**
     * Map Excel "Lead Status" value to a CRM pipeline stage.
     */
    private function mapLeadStatusToStage(string $leadStatus): string
    {
        return match (strtolower($leadStatus)) {
            'prospective'       => 'University Apps',
            'future lead'       => 'Follow-up',
            'lead'              => 'Inquiry',
            'junk'              => 'Inquiry',
            'need time'         => 'Follow-up',
            'call'              => 'Follow-up',
            'more details'      => 'Follow-up',
            'cannot contacted ever', 'no answer' => 'Follow-up',
            default             => 'Inquiry',
        };
    }

    /**
     * Map a pipeline stage back to a Lead Status label for export.
     */
    private function stageToLeadStatus(string $stage): string
    {
        return match ($stage) {
            'University Apps'   => 'Prospective',
            'Payment'           => 'Prospective',
            'Visa Application'  => 'Prospective',
            'Visa Status'       => 'Prospective',
            'Follow-up'         => 'Lead',
            default             => 'Lead',
        };
    }
}
