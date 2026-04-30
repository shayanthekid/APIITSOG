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

        $types   = ['APIIT', 'External'];
        $stages  = ['Inquiry', 'Follow-up', 'University Apps', 'Payment', 'Visa Application', 'Visa Status'];
        $sources = ['Walk - in', 'Phone', 'Email', 'Facebook', 'WhatsApp', 'Openday', 'Expo', 'Other'];
        $levels  = ['UG - Direct', 'UG - Transfer', 'PG', 'PG - Diploma'];
        $leadStatuses = ['Lead', 'Prospective', 'Future Lead', 'Need Time'];
        $intakes = ['Jan 2025', 'May 2025', 'Sep 2025', 'Jan 2026', 'May 2026', 'Sep 2026'];

        $ukUniversities = [
            'University of Manchester', 'University of Leeds', 'University of Birmingham',
            'King\'s College London', 'University of Nottingham', 'University of Sheffield',
            'University of Bristol', 'Newcastle University', 'University of Liverpool',
        ];
        $auUniversities = [
            'University of Melbourne', 'University of Sydney', 'Monash University',
            'RMIT University', 'University of Queensland', 'University of Adelaide',
            'Griffith University', 'Deakin University',
        ];
        $caUniversities = [
            'University of Toronto', 'University of British Columbia', 'McGill University',
            'University of Waterloo', 'York University', 'Ryerson University',
        ];
        $allUniversities = array_merge($ukUniversities, $auUniversities, $caUniversities);

        $programs = [
            'Computer Science', 'Business Administration', 'Data Science',
            'Mechanical Engineering', 'Civil Engineering', 'Finance & Accounting',
            'Information Technology', 'Cybersecurity', 'Marketing Management',
            'International Business', 'Healthcare Management', 'Software Engineering',
        ];

        $sriLankanNames = [
            'Dilshan Perera', 'Tharaka Silva', 'Nimasha Fernando', 'Kasun Rajapaksha',
            'Sachini Jayawardena', 'Dinuka Bandara', 'Malsha Wickramasinghe', 'Raveen Mendis',
            'Thilini Gunawardena', 'Chathura Dissanayake', 'Sanduni Pathirana', 'Yasiru Amarasinghe',
            'Nethmi Senanayake', 'Pradeep Rathnayake', 'Dilini Jayasena', 'Asitha Tennakoon',
            'Lahiru Liyanage', 'Samanthi Kumarasinghe', 'Hasara Samaraweera', 'Thusitha Weerasinghe',
            'Madhawa Dassanayake', 'Kavindi Ranasinghe', 'Isuru Herath', 'Nimesha Abeysekara',
            'Ridma Jayatilaka', 'Sachith Gamage', 'Himashi Siriwardena', 'Dulaj Udayakumara',
            'Hansani Wijesinghe', 'Pramodha Lansakara', 'Chamari Jayakodi', 'Shanuka Madushanka',
            'Nadeesha Priyadarshani', 'Ruwan Samarajeewa', 'Thilanka Weerakoon', 'Kalani Dahanayake',
            'Oshada Senevirathne', 'Ridmi Wijesuriya', 'Duminda Rajapaksa', 'Nilmini Kodagoda',
        ];

        $countries = ['UK', 'Australia', 'Canada', 'USA', 'New Zealand'];

        $destination = fake()->randomElement($countries);
        $uniPool = match($destination) {
            'UK'        => $ukUniversities,
            'Australia' => $auUniversities,
            'Canada'    => $caUniversities,
            default     => $allUniversities,
        };

        $visaStatuses = ['Pending', 'Approved', 'Rejected', 'Documents Requested', null];
        $qualifications = ['A-Levels', 'O-Levels', 'Bachelor\'s Degree', 'Diploma', 'Foundation'];
        $englishTests = ['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'Exempted'];

        $source = fake()->randomElement($sources);

        return [
            'student_id'        => 'CB0' . $studentCounter,
            'name'              => fake()->randomElement($sriLankanNames),
            'dob'               => fake()->dateTimeBetween('-30 years', '-18 years')->format('Y-m-d'),
            'gender'            => fake()->randomElement(['Male', 'Female']),
            'nationality'       => 'Sri Lankan',
            'email'             => fake()->unique()->safeEmail(),
            'phone'             => fake()->numerify('+94 7# ### ####'),
            'is_whatsapp_enabled' => fake()->boolean(80),
            'address'           => fake()->city() . ', Sri Lanka',
            'passport_number'   => fake()->bothify('N#######'),
            'type'              => fake()->randomElement($types),
            'intake'            => fake()->randomElement($intakes),
            'preferred_program' => fake()->randomElement($programs),
            'level'             => fake()->randomElement($levels),
            'lead_status'       => fake()->randomElement($leadStatuses),
            'highest_qualification' => fake()->randomElement($qualifications),
            'institution'       => fake()->randomElement(['APIIT Lanka', 'SLIIT', 'NSBM', 'IIT', 'Colombo University', 'Kelaniya University']),
            'gpa'               => (string) fake()->randomFloat(2, 2.5, 4.0),
            'english_proficiency' => fake()->randomElement($englishTests),
            'english_score'     => (string) fake()->randomFloat(1, 5.5, 9.0),
            'target_degree'     => fake()->randomElement(['Undergraduate', 'Postgraduate']),
            'target_countries'  => [$destination],
            'target_universities' => [fake()->randomElement($uniPool)],
            'source'            => $source,
            'campaign_name'     => $source === 'Facebook' ? fake()->randomElement(['Summer 2025 Drive', 'UK Intake Push', 'AUS Open Day Campaign']) : null,
            'import_date'       => fake()->dateTimeThisYear(),
            'destination'       => $destination,
            'current_stage'     => fake()->randomElement($stages),
            'drop_out_flag'     => fake()->boolean(5),
            'drop_out_reason'   => null,
            'counselor_id'      => User::inRandomOrder()->first()?->id ?? User::factory(),
            'follow_up_due_date' => fake()->dateTimeBetween('-1 week', '+3 weeks'),
            'visa_status'       => fake()->randomElement($visaStatuses),
            'last_contact_date' => fake()->dateTimeThisMonth(),
            'remarks'           => null,
        ];
    }
}
