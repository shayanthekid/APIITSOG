<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;

class StudentFactory extends Factory
{
    public function definition(): array
    {
        static $studentCounter = 1000;
        $studentCounter++;

        $types = ['APIIT', 'External'];
        $stages = ['Inquiry', 'Follow-up', 'University Apps', 'Payment', 'Visa Application', 'Visa Status'];
        $sources = ['Meta', 'Walk-in', 'Referral', 'APIIT internal', 'WhatsApp', 'Other'];
        $englishTests = ['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'Waiver'];
        $targetDegrees = ['Undergraduate', 'Postgraduate', 'PhD', 'Other'];
        $countries = ['UK', 'Australia', 'Canada', 'USA', 'Malaysia'];
        $visaStatuses = ['Pending', 'Approved', 'Rejected', 'Requested Documents', null];

        return [
            'student_id' => 'CB0' . $studentCounter,
            'name' => fake()->name(),
            'dob' => fake()->dateTimeBetween('-30 years', '-18 years')->format('Y-m-d'),
            'gender' => fake()->randomElement(['Male', 'Female', 'Other']),
            'nationality' => fake()->country(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'is_whatsapp_enabled' => fake()->boolean(80),
            'address' => fake()->address(),
            'passport_number' => fake()->bothify('??#######'),
            'type' => fake()->randomElement($types),
            'highest_qualification' => fake()->randomElement(['A-Levels', 'O-Levels', 'Bachelor Degree', 'Diploma']),
            'institution' => fake()->company(),
            'gpa' => (string)fake()->randomFloat(2, 2.0, 4.0),
            'english_proficiency' => fake()->randomElement($englishTests),
            'english_score' => (string)fake()->randomFloat(1, 5.0, 9.0),
            'target_degree' => fake()->randomElement($targetDegrees),
            'target_countries' => fake()->randomElements($countries, fake()->numberBetween(1, 2)),
            'target_universities' => [fake()->company() . ' University'],
            'source' => $source = fake()->randomElement($sources),
            'campaign_name' => $source === 'Meta' ? fake()->word() . ' Campaign' : null,
            'import_date' => fake()->dateTimeThisYear(),
            'destination' => fake()->randomElement($countries),
            'current_stage' => fake()->randomElement($stages),
            'drop_out_flag' => fake()->boolean(5),
            'drop_out_reason' => null,
            'counselor_id' => User::inRandomOrder()->first()?->id ?? User::factory(),
            'follow_up_due_date' => fake()->dateTimeBetween('-1 week', '+2 weeks'),
            'visa_status' => fake()->randomElement($visaStatuses),
            'last_contact_date' => fake()->dateTimeThisMonth(),
        ];
    }
}
