<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$token = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
if (!verify_csrf_token(is_string($token) ? $token : null)) {
    json_response(['success' => false, 'message' => 'Invalid CSRF token.'], 419);
}

$datasetId = isset($_POST['dataset_id']) ? (int) $_POST['dataset_id'] : 0;
if ($datasetId <= 0) {
    json_response(['success' => false, 'message' => 'Missing dataset_id.'], 422);
}

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :dataset_id LIMIT 1');
$stmt->execute(['dataset_id' => $datasetId]);
$dataset = $stmt->fetch();

if ($dataset === false) {
    json_response(['success' => false, 'message' => 'Dataset not found.'], 404);
}

$uploadsDir = __DIR__ . '/../../uploads';
$stored = $dataset['stored_filename'] ?? null;
$filePath = $stored ? $uploadsDir . DIRECTORY_SEPARATOR . $stored : null;

if (empty($filePath) || !is_file($filePath) || !is_readable($filePath)) {
    json_response(['success' => false, 'message' => 'Stored CSV file missing or unreadable.'], 500);
}

$required = ['Student ID','Student Name','Course','Year Level','Section','Subject','Quiz Score','Midterm Score','Final Score','Attendance'];

if (($handle = fopen($filePath, 'r')) === false) {
    json_response(['success' => false, 'message' => 'Failed to open stored CSV file.'], 500);
}

$header = fgetcsv($handle);
if ($header === false) {
    fclose($handle);
    json_response(['success' => false, 'message' => 'CSV header missing or empty.'], 422);
}

$header = array_map('trim', $header);
if ($header !== $required) {
    fclose($handle);
    json_response(['success' => false, 'message' => 'CSV template mismatch. Required columns: ' . implode(', ', $required)], 422);
}

$insertStmt = db()->prepare(
    'INSERT INTO dataset_records (dataset_id, row_number, student_id, student_name, course, year_level, section, subject, quiz_score, midterm_score, final_score, attendance, is_valid, validation_notes, created_at, updated_at)
     VALUES (:dataset_id, :row_number, :student_id, :student_name, :course, :year_level, :section, :subject, :quiz_score, :midterm_score, :final_score, :attendance, :is_valid, :validation_notes, NOW(), NOW())'
);

$rowNumber = 0;
$inserted = 0;
$errors = [];

db()->beginTransaction();
try {
    while (($row = fgetcsv($handle)) !== false) {
        $rowNumber++;

        // Normalize row to required length
        if (count($row) !== count($required)) {
            $errors[] = ['row' => $rowNumber, 'error' => 'Column count mismatch'];
            $isValid = 0;
            $notes = 'Column count mismatch';
            // still insert partially if possible
            $row = array_pad($row, count($required), '');
        } else {
            $isValid = 1;
            $notes = null;
        }

        $row = array_map('trim', $row);

        [$studentId, $studentName, $course, $yearLevel, $section, $subject, $quiz, $midterm, $final, $attendance] = $row;

        // Parse numeric fields
        $parseNumber = function ($value) {
            $v = trim((string) $value);
            if ($v === '') return null;
            $v = str_replace([','], [''], $v);
            if (!is_numeric($v)) return false;
            return (float) $v;
        };

        $quizN = $parseNumber($quiz);
        $midN = $parseNumber($midterm);
        $finalN = $parseNumber($final);
        $attN = $parseNumber($attendance);

        foreach (['quiz' => $quizN, 'midterm' => $midN, 'final' => $finalN, 'attendance' => $attN] as $k => $val) {
            if ($val === false) {
                $isValid = 0;
                $notes = ($notes ? $notes . '; ' : '') . sprintf('%s not numeric', ucfirst($k));
            }
        }

        $insertStmt->execute([
            'dataset_id' => $datasetId,
            'row_number' => $rowNumber,
            'student_id' => $studentId,
            'student_name' => $studentName,
            'course' => $course,
            'year_level' => $yearLevel,
            'section' => $section,
            'subject' => $subject,
            'quiz_score' => $quizN === false ? null : $quizN,
            'midterm_score' => $midN === false ? null : $midN,
            'final_score' => $finalN === false ? null : $finalN,
            'attendance' => $attN === false ? null : $attN,
            'is_valid' => $isValid,
            'validation_notes' => $notes,
        ]);

        $inserted++;
    }

    db()->commit();
} catch (Throwable $ex) {
    db()->rollBack();
    fclose($handle);
    json_response(['success' => false, 'message' => 'Failed to import CSV: ' . $ex->getMessage()], 500);
}

fclose($handle);

// Update dataset record_count and status
$update = db()->prepare('UPDATE datasets SET record_count = :record_count, processing_status = :status, validated_at = NOW(), updated_at = NOW() WHERE dataset_id = :dataset_id');
$update->execute(['record_count' => $inserted, 'status' => 'validated', 'dataset_id' => $datasetId]);

// Log activity
log_activity((int) $user['user_id'], 'import', 'datasets', 'Imported dataset records from CSV', ['inserted' => $inserted, 'errors' => $errors], $datasetId, null, 'dataset', $datasetId);

json_response(['success' => true, 'message' => 'Import completed.', 'inserted' => $inserted, 'errors' => $errors]);
