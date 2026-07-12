<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['student']);

$user = current_user();
$studentId = $user['student_id'] ?? null;

if ($studentId === null || $studentId === '') {
    json_response(['success' => false, 'message' => 'No student identifier found for your account.'], 400);
}

$sql = '
    SELECT
        d.dataset_id,
        d.dataset_name,
        d.dataset_description,
        d.processing_status,
        d.uploaded_at,
        d.owner_user_id,
        owner.full_name AS owner_name,
        dr.row_number,
        dr.student_id,
        dr.student_name,
        dr.course,
        dr.year_level,
        dr.section,
        dr.subject,
        dr.quiz_score,
        dr.midterm_score,
        dr.final_score,
        dr.attendance,
        ar.metrics_json AS analysis_json,
        ar.created_at AS analysis_created_at
    FROM dataset_records dr
    INNER JOIN datasets d ON d.dataset_id = dr.dataset_id
    LEFT JOIN users owner ON owner.user_id = d.owner_user_id
    LEFT JOIN analysis_results ar ON ar.analysis_result_id = (
        SELECT a2.analysis_result_id
        FROM analysis_results a2
        WHERE a2.dataset_id = d.dataset_id AND a2.status = \'completed\'
        ORDER BY a2.analysis_result_id DESC
        LIMIT 1
    )
    WHERE dr.student_id = :student_id
    ORDER BY d.uploaded_at DESC, d.dataset_id DESC
';

$stmt = db()->prepare($sql);
$stmt->execute(['student_id' => $studentId]);
$rows = $stmt->fetchAll();

$datasets = [];
foreach ($rows as $row) {
    $analysis = null;
    if (!empty($row['analysis_json'])) {
        $decoded = json_decode((string) $row['analysis_json'], true);
        if (is_array($decoded)) {
            $analysis = $decoded;
        }
    }

    $datasets[] = [
        'dataset_id' => (int) $row['dataset_id'],
        'dataset_name' => $row['dataset_name'],
        'dataset_description' => $row['dataset_description'],
        'processing_status' => $row['processing_status'],
        'uploaded_at' => $row['uploaded_at'],
        'owner_name' => $row['owner_name'],
        'record' => [
            'row_number' => (int) $row['row_number'],
            'student_id' => $row['student_id'],
            'student_name' => $row['student_name'],
            'course' => $row['course'],
            'year_level' => $row['year_level'],
            'section' => $row['section'],
            'subject' => $row['subject'],
            'quiz_score' => is_numeric($row['quiz_score']) ? (float) $row['quiz_score'] : null,
            'midterm_score' => is_numeric($row['midterm_score']) ? (float) $row['midterm_score'] : null,
            'final_score' => is_numeric($row['final_score']) ? (float) $row['final_score'] : null,
            'attendance' => is_numeric($row['attendance']) ? (float) $row['attendance'] : null,
        ],
        'analysis' => $analysis,
        'analysis_created_at' => $row['analysis_created_at'],
    ];
}

json_response([
    'success' => true,
    'student' => [
        'user_id' => (int) $user['user_id'],
        'student_id' => $studentId,
        'full_name' => $user['full_name'] ?? null,
        'email' => $user['email'] ?? null,
    ],
    'datasets' => $datasets,
]);
