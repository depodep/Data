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

if (empty($_FILES['dataset']) && empty($_POST['stored'])) {
    json_response(['success' => false, 'message' => 'No file uploaded.'], 422);
}

$file = $_FILES['dataset'] ?? null;
$isNewUpload = $file !== null && ($file['error'] === UPLOAD_ERR_OK);
$unique = bin2hex(random_bytes(12));

if ($file !== null && $file['error'] !== UPLOAD_ERR_OK) {
    json_response(['success' => false, 'message' => 'Upload error code: ' . $file['error']], 400);
}

// move file to uploads with unique name
$uploadsDir = __DIR__ . '/../../uploads';
if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

$destination = '';
$storedName = '';

if (!empty($_POST['stored']) && !$isNewUpload) {
    $storedName = basename((string) $_POST['stored']);
    $destination = $uploadsDir . DIRECTORY_SEPARATOR . $storedName;
    if (!file_exists($destination)) {
        json_response(['success' => false, 'message' => 'Stored file not found.'], 404);
    }
} else {
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'csv') {
        json_response(['success' => false, 'message' => 'Only CSV uploads are supported. For Excel use the backend PhpSpreadsheet integration.'], 415);
    }

    $unique = bin2hex(random_bytes(12));
    $storedName = $unique . '_' . basename($file['name']);
    $destination = $uploadsDir . DIRECTORY_SEPARATOR . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        json_response(['success' => false, 'message' => 'Failed to move uploaded file.'], 500);
    }
}

// Validate header matches exactly the required template
$required = ['Student ID','Student Name','Course','Year Level','Section','Subject','Quiz Score','Midterm Score','Final Score','Attendance'];

if (($handle = fopen($destination, 'r')) === false) {
    unlink($destination);
    json_response(['success' => false, 'message' => 'Failed to open uploaded file.'], 500);
}

$header = fgetcsv($handle);
fclose($handle);

if ($header === false) {
    unlink($destination);
    json_response(['success' => false, 'message' => 'CSV header not found or empty.'], 422);
}

// Trim header values
$header = array_map('trim', $header);

if ($header !== $required) {
    unlink($destination);
    json_response(['success' => false, 'message' => 'CSV template mismatch. Required columns: ' . implode(', ', $required)], 422);
}

// Support preview and cleaning modes
$mode = $_POST['mode'] ?? '';

// helper to read N rows (excluding header), returned as associative arrays
$read_rows = function (string $path, int $limit = 10) {
    $out = [];
    if (($h = fopen($path, 'r')) === false) return ['header' => [], 'rows' => []];
    $hdr = fgetcsv($h);
    $count = 0;
    while (($row = fgetcsv($h)) !== false && $count < $limit) {
        if (is_array($hdr) && count($hdr) === count($row)) {
            $out[] = array_combine($hdr, $row);
        } else {
            $out[] = $row;
        }
        $count++;
    }
    fclose($h);
    return ['header' => $hdr ?: [], 'rows' => $out];
};

$scan_dataset = function (string $path, array $numericColumns = [], int $limitIssues = 100) {
    $header = [];
    $rows = [];
    if (($h = fopen($path, 'r')) === false) {
        return [
            'total_rows' => 0,
            'missing_counts' => [],
            'duplicate_count' => 0,
            'invalid_numeric_count' => 0,
            'issue_count' => 0,
            'issues' => [],
            'outlier_summary' => [],
        ];
    }
    $header = fgetcsv($h);
    if ($header === false) {
        fclose($h);
        return [
            'total_rows' => 0,
            'missing_counts' => [],
            'duplicate_count' => 0,
            'invalid_numeric_count' => 0,
            'issue_count' => 0,
            'issues' => [],
            'outlier_summary' => [],
        ];
    }
    while (($row = fgetcsv($h)) !== false) {
        if (is_array($row) && count($row) === count($header)) {
            $rows[] = array_combine($header, $row);
        }
    }
    fclose($h);

    $missingCounts = array_fill_keys($header, 0);
    $invalidNumericCount = 0;
    $duplicateCount = 0;
    $issues = [];
    $seen = [];
    $numericStats = [];
    foreach ($numericColumns as $column) {
        if (in_array($column, $header, true)) {
            $numericStats[$column] = ['values' => [], 'outliers' => 0];
        }
    }

    foreach ($rows as $index => $row) {
        $rowNumber = $index + 2;
        $key = implode('||', array_map(fn($value) => $value ?? '', $row));
        if (isset($seen[$key])) {
            $duplicateCount++;
            if (count($issues) < $limitIssues) {
                $issues[] = [
                    'row' => $rowNumber,
                    'column' => 'All',
                    'problem' => 'Duplicate row detected',
                    'value' => implode(', ', array_slice($row, 0, 3)),
                    'recommendation' => 'Keep one copy and remove duplicates',
                    'status' => 'warning',
                ];
            }
        } else {
            $seen[$key] = true;
        }

        foreach ($header as $col) {
            $value = trim((string) ($row[$col] ?? ''));
            if ($value === '') {
                $missingCounts[$col]++;
                if (count($issues) < $limitIssues) {
                    $issues[] = [
                        'row' => $rowNumber,
                        'column' => $col,
                        'problem' => 'Missing value',
                        'value' => '',
                        'recommendation' => 'Review or fill missing values',
                        'status' => 'warning',
                    ];
                }
            }
            if (isset($numericStats[$col]) && $value !== '' && !is_numeric($value)) {
                $invalidNumericCount++;
                if (count($issues) < $limitIssues) {
                    $issues[] = [
                        'row' => $rowNumber,
                        'column' => $col,
                        'problem' => 'Invalid numeric value',
                        'value' => $value,
                        'recommendation' => 'Use a numeric value or leave blank for imputing',
                        'status' => 'danger',
                    ];
                }
            }
            $textOnlyColumns = ['Student Name', 'Course', 'Section'];
            if (in_array($col, $textOnlyColumns, true) && $value !== '' && preg_match('/\d/', $value)) {
                $invalidNumericCount++;
                if (count($issues) < $limitIssues) {
                    $issues[] = [
                        'row' => $rowNumber,
                        'column' => $col,
                        'problem' => 'Invalid text value',
                        'value' => $value,
                        'recommendation' => 'Name/Course/Section should not contain numbers',
                        'status' => 'danger',
                    ];
                }
            }
            if (isset($numericStats[$col])) {
                $numericStats[$col]['values'][] = $value;
            }
        }
    }

    foreach ($numericStats as $col => $stats) {
        $numbers = array_filter(array_map(fn($value) => is_numeric($value) ? (float) $value : null, $stats['values']), fn($value) => $value !== null);
        $count = count($numbers);
        if ($count < 2) {
            $numericStats[$col]['outliers'] = 0;
            continue;
        }
        $mean = array_sum($numbers) / $count;
        $variance = array_sum(array_map(fn($value) => ($value - $mean) ** 2, $numbers)) / $count;
        $std = sqrt($variance);
        if ($std > 0) {
            $numericStats[$col]['outliers'] = array_reduce($numbers, fn($carry, $value) => $carry + (abs(($value - $mean) / $std) > 3 ? 1 : 0), 0);
        } else {
            $numericStats[$col]['outliers'] = 0;
        }
    }

    $outlierSummary = [];
    foreach ($numericStats as $col => $stats) {
        $outlierSummary[$col] = $stats['outliers'];
    }

    return [
        'total_rows' => count($rows),
        'missing_counts' => $missingCounts,
        'duplicate_count' => $duplicateCount,
        'invalid_numeric_count' => $invalidNumericCount,
        'issue_count' => count($issues),
        'issues' => $issues,
        'outlier_summary' => $outlierSummary,
    ];
};

if ($mode === 'preview') {
    $preview = $read_rows($destination, PHP_INT_MAX);
    $numericColumns = ['Quiz Score', 'Midterm Score', 'Final Score', 'Attendance', 'Year Level'];
    $scan = $scan_dataset($destination, $numericColumns, 200);
    json_response([
        'success' => true,
        'rows' => $preview['rows'],
        'header' => $preview['header'],
        'stored' => $storedName,
        'total_rows' => $scan['total_rows'],
        'column_count' => count($preview['header']),
        'missing_counts' => $scan['missing_counts'],
        'duplicate_count' => $scan['duplicate_count'],
        'invalid_numeric_count' => $scan['invalid_numeric_count'],
        'issue_count' => $scan['issue_count'],
        'issues' => $scan['issues'],
        'outlier_summary' => $scan['outlier_summary'],
    ]);
}

if ($mode === 'clean') {
    // optionally use client-side preview data as the source for cleaning
    $cleanSourcePath = $destination;
    $tempPreviewInput = '';
    if (!empty($_POST['preview_data'])) {
        $previewData = json_decode((string) $_POST['preview_data'], true);
        if (is_array($previewData) && count($previewData) > 0) {
            $tempPreviewName = 'preview_input_' . $unique . '.csv';
            $tempPreviewInput = $uploadsDir . DIRECTORY_SEPARATOR . $tempPreviewName;
            $previewHandle = fopen($tempPreviewInput, 'w');
            if ($previewHandle !== false) {
                fputcsv($previewHandle, $required);
                foreach ($previewData as $row) {
                    $rowValues = [];
                    foreach ($required as $col) {
                        $rowValues[] = isset($row[$col]) ? $row[$col] : '';
                    }
                    fputcsv($previewHandle, $rowValues);
                }
                fclose($previewHandle);
                $cleanSourcePath = $tempPreviewInput;
            }
        }
    }

    $cleanedName = 'cleaned_' . $storedName;
    $cleanedPath = $uploadsDir . DIRECTORY_SEPARATOR . $cleanedName;
    $script = __DIR__ . '/../../python/clean_dataset.py';
    $options = [];
    if (!empty($_POST['remove_duplicates'])) {
        $options['remove_duplicates'] = filter_var($_POST['remove_duplicates'], FILTER_VALIDATE_BOOLEAN);
    }
    if (!empty($_POST['missing_strategy'])) {
        $options['missing_strategy'] = $_POST['missing_strategy'];
    }
    $encodedOptions = json_encode($options, JSON_UNESCAPED_UNICODE);
    $cmd = escapeshellcmd('python') . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($cleanSourcePath) . ' ' . escapeshellarg($cleanedPath) . ' ' . escapeshellarg($encodedOptions);
    $out = [];
    $exit = 0;
    @exec($cmd . ' 2>&1', $out, $exit);

    if ($tempPreviewInput && file_exists($tempPreviewInput)) {
        @unlink($tempPreviewInput);
    }

    if ($exit !== 0 || !file_exists($cleanedPath)) {
        json_response(['success' => false, 'message' => 'Cleaning failed', 'details' => $out], 500);
    }

    $preview = $read_rows($cleanedPath, 10);
    $summary = ['removed_duplicates' => 0, 'missing_strategy' => $options['missing_strategy'] ?? 'none', 'options' => $options];
    if (!empty($out) && is_array($out)) {
        $raw = trim(end($out));
        $decoded = json_decode($raw, true);
        if (is_array($decoded) && !empty($decoded['success'])) {
            $summary['removed_duplicates'] = $decoded['removed_duplicates'] ?? 0;
            $summary['missing_before'] = $decoded['missing_before'] ?? [];
            $summary['missing_after'] = $decoded['missing_after'] ?? [];
            $summary['outliers'] = $decoded['outliers'] ?? [];
        }
    }

    json_response([
        'success' => true,
        'preview' => $preview,
        'cleaned' => $cleanedName,
        'stored' => $storedName,
        'removed_duplicates' => $summary['removed_duplicates'],
        'options' => $summary['options'],
        'missing_before' => $summary['missing_before'] ?? null,
        'missing_after' => $summary['missing_after'] ?? null,
        'outliers' => $summary['outliers'] ?? null,
    ]);
}

// Finalize: if preview data is available, write it to a prepared CSV and use that file
$finalPath = $destination;
$finalStored = $storedName;
if (!empty($_POST['preview_data'])) {
    $previewData = json_decode((string) $_POST['preview_data'], true);
    if (is_array($previewData) && count($previewData) > 0) {
        $previewedName = 'prepared_' . $storedName;
        $previewedPath = $uploadsDir . DIRECTORY_SEPARATOR . $previewedName;
        $previewHandle = fopen($previewedPath, 'w');
        if ($previewHandle !== false) {
            fputcsv($previewHandle, $required);
            foreach ($previewData as $row) {
                $rowValues = [];
                foreach ($required as $col) {
                    $rowValues[] = isset($row[$col]) ? $row[$col] : '';
                }
                fputcsv($previewHandle, $rowValues);
            }
            fclose($previewHandle);
            $finalPath = $previewedPath;
            $finalStored = $previewedName;
        }
    }
}

$cleanCandidate = $uploadsDir . DIRECTORY_SEPARATOR . 'cleaned_' . $storedName;
if ($finalPath === $destination && file_exists($cleanCandidate)) {
    $finalPath = $cleanCandidate;
    $finalStored = 'cleaned_' . $storedName;
}

// Count rows (excluding header)
$rows = 0;
if (($handle = fopen($finalPath, 'r')) !== false) {
    fgetcsv($handle);
    while (fgetcsv($handle) !== false) {
        $rows++;
    }
    fclose($handle);
}

// Insert dataset metadata
$stmt = db()->prepare('INSERT INTO datasets (owner_user_id, dataset_name, dataset_description, source_filename, stored_filename, file_path, file_size, file_type, record_count, column_count, processing_status, upload_hash, uploaded_at, created_at, updated_at) VALUES (:owner_user_id, :dataset_name, :dataset_description, :source_filename, :stored_filename, :file_path, :file_size, :file_type, :record_count, :column_count, :processing_status, :upload_hash, NOW(), NOW(), NOW())');

// determine original filename, size and scope
$datasetName = trim((string) ($_POST['dataset_name'] ?? ''));
if (empty($datasetName)) {
    json_response(['success' => false, 'message' => 'Dataset name is required.'], 422);
}
$description = trim((string) ($_POST['description'] ?? ''));
$uploadHash = hash('sha256', $unique . microtime(true));

if ($file !== null) {
    $sourceFilename = $file['name'];
    $fileType = $file['type'] ?? 'text/csv';
    $fileSize = (int) $file['size'];
} else {
    $sourceFilename = preg_replace('/^[0-9a-f]+_/', '', $finalStored);
    $fileType = 'text/csv';
    $fileSize = (int) filesize($finalPath);
}

$stmt->execute([
    'owner_user_id' => $user['user_id'],
    'dataset_name' => $datasetName,
    'dataset_description' => $description,
    'source_filename' => $sourceFilename,
    'stored_filename' => $finalStored,
    'file_path' => '/Data/uploads/' . $finalStored,
    'file_size' => $fileSize,
    'file_type' => $fileType,
    'record_count' => $rows,
    'column_count' => count($header),
    'processing_status' => 'uploaded',
    'upload_hash' => $uploadHash,
]);

$newDatasetId = (int) db()->lastInsertId();

log_activity((int) $user['user_id'], 'upload', 'datasets', 'Dataset uploaded: ' . $datasetName, ['rows' => $rows], $newDatasetId, null, 'dataset', $newDatasetId);

json_response(['success' => true, 'message' => 'Dataset uploaded and validated.', 'rows' => $rows, 'dataset_id' => $newDatasetId]);
