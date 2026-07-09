<?php
declare(strict_types=1);

// CLI worker: processes one pending job and exits.
require_once __DIR__ . '/../includes/bootstrap.php';

if (php_sapi_name() !== 'cli') {
    echo "This script must be run from CLI\n";
    exit(1);
}

function logStd($msg) { echo '[' . date('c') . '] ' . $msg . "\n"; }

$pdo = db();

$pdo->beginTransaction();
// select one pending job (simple FIFO)
$sel = $pdo->prepare("SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1 FOR UPDATE");
$sel->execute();
$job = $sel->fetch();

if ($job === false) {
    $pdo->rollBack();
    logStd('No pending jobs found.');
    exit(0);
}

$jobId = (int)$job['job_id'];
// mark running
$upd = $pdo->prepare('UPDATE jobs SET status = :status, started_at = NOW(), updated_at = NOW() WHERE job_id = :id');
$upd->execute(['status' => 'running', 'id' => $jobId]);
$pdo->commit();

logStd("Processing job {$jobId} ({$job['job_type']})");

$jobType = $job['job_type'];
$datasetId = $job['dataset_id'] ? (int)$job['dataset_id'] : null;

$result = ['success' => false, 'message' => 'Not processed'];

try {
    switch ($jobType) {
        case 'clean':
            // call cleaning API logic directly: reuse earlier script calling pattern
            $stmt = $pdo->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
            $stmt->execute(['id' => $datasetId]);
            $dataset = $stmt->fetch();
            if (!$dataset) throw new RuntimeException('Dataset not found');

            $uploadsDir = __DIR__ . '/../uploads';
            $cleanedDir = __DIR__ . '/../cleaned';
            $stored = $dataset['stored_filename'] ?? null;
            $inputPath = $stored ? $uploadsDir . DIRECTORY_SEPARATOR . $stored : null;
            if (empty($inputPath) || !is_file($inputPath)) throw new RuntimeException('Stored CSV missing');

            $python = 'python';
            $script = __DIR__ . '/../python/clean_dataset.py';
            $outName = pathinfo($stored, PATHINFO_FILENAME) . '_cleaned.csv';
            $outPath = $cleanedDir . DIRECTORY_SEPARATOR . $outName;
            $cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg(realpath($inputPath)) . ' ' . escapeshellarg($outPath);
            logStd('Running: ' . $cmd);
            $raw = shell_exec($cmd);
            $result = json_decode($raw, true) ?: ['success' => false, 'message' => 'Invalid JSON from script', 'raw' => $raw];
            if (!empty($result['success'])) {
                $u = $pdo->prepare('UPDATE datasets SET processing_status = :status, cleaned_at = NOW(), file_path = :clean_path, updated_at = NOW() WHERE dataset_id = :id');
                $u->execute(['status' => 'cleaned', 'clean_path' => '/Data/cleaned/' . $outName, 'id' => $datasetId]);
            }
            break;

        case 'analyze':
            $stmt = $pdo->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
            $stmt->execute(['id' => $datasetId]);
            $dataset = $stmt->fetch();
            if (!$dataset) throw new RuntimeException('Dataset not found');

            $file = $dataset['file_path'] ?? null;
            $abs = realpath(__DIR__ . '/../' . ltrim($file, '/\\'));
            if ($abs === false || !is_file($abs)) throw new RuntimeException('File not readable');

            $python = 'python';
            $script = __DIR__ . '/../python/analyze_dataset.py';
            $cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($abs);
            logStd('Running: ' . $cmd);
            $raw = shell_exec($cmd);
            $result = json_decode($raw, true) ?: ['success' => false, 'message' => 'Invalid JSON from script', 'raw' => $raw];
            break;

        case 'visualize':
            $stmt = $pdo->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
            $stmt->execute(['id' => $datasetId]);
            $dataset = $stmt->fetch();
            if (!$dataset) throw new RuntimeException('Dataset not found');

            $file = $dataset['file_path'] ?? null;
            $abs = realpath(__DIR__ . '/../' . ltrim($file, '/\\'));
            if ($abs === false || !is_file($abs)) throw new RuntimeException('File not readable');

            $chartsDir = __DIR__ . '/../charts';
            $outDir = $chartsDir . DIRECTORY_SEPARATOR . 'dataset_' . $datasetId;
            $python = 'python';
            $script = __DIR__ . '/../python/visualize_dataset.py';
            $cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($abs) . ' ' . escapeshellarg($outDir);
            logStd('Running: ' . $cmd);
            $raw = shell_exec($cmd);
            $result = json_decode($raw, true) ?: ['success' => false, 'message' => 'Invalid JSON from script', 'raw' => $raw];
            break;

        case 'predict':
            $payload = json_decode((string)$job['payload_json'], true) ?: [];
            $target = $payload['target'] ?? 'Final Score';
            $featureColumns = $payload['feature_columns'] ?? ['Attendance'];
            if (!$target) throw new RuntimeException('Missing target in payload');

            $stmt = $pdo->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
            $stmt->execute(['id' => $datasetId]);
            $dataset = $stmt->fetch();
            if (!$dataset) throw new RuntimeException('Dataset not found');

            $file = $dataset['file_path'] ?? null;
            $abs = realpath(__DIR__ . '/../' . ltrim($file, '/\\'));
            if ($abs === false || !is_file($abs)) throw new RuntimeException('File not readable');

            $outDir = __DIR__ . '/../models/predictions';
            if (!is_dir($outDir)) mkdir($outDir, 0755, true);
            $outPath = $outDir . DIRECTORY_SEPARATOR . pathinfo($abs, PATHINFO_FILENAME) . '_' . $target . '_predictions.csv';

            $python = 'python';
            $script = __DIR__ . '/../python/predict_dataset.py';
            $featureArg = implode(',', is_array($featureColumns) ? $featureColumns : ['Attendance']);
            $cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($abs) . ' ' . escapeshellarg($target) . ' ' . escapeshellarg($outPath) . ' ' . escapeshellarg($featureArg);
            logStd('Running: ' . $cmd);
            $raw = shell_exec($cmd);
            $result = json_decode($raw, true) ?: ['success' => false, 'message' => 'Invalid JSON from script', 'raw' => $raw];

            // If the prediction succeeded, persist prediction_results and create a report
            if (!empty($result['success'])) {
                try {
                    // detect optional columns
                    $colCheck = $pdo->prepare("SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prediction_results' AND COLUMN_NAME = 'model_path'");
                    $colCheck->execute();
                    $hasModelPath = (int) ($colCheck->fetchColumn() ?: 0) > 0;

                    $featureJson = json_encode($featureColumns, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    $metricsJson = json_encode($result['metrics'] ?? $result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    $predictionsJson = json_encode(['predictions_path' => $result['predictions_path'] ?? $outPath], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

                    if ($hasModelPath) {
                        $ins = $pdo->prepare('INSERT INTO prediction_results (dataset_id, run_by_user_id, model_type, target_column, feature_columns_json, training_rows, testing_rows, accuracy, metrics_json, predictions_json, model_path, predictions_path, status, started_at, completed_at, created_at, updated_at) VALUES (:dataset_id, :run_by_user_id, :model_type, :target_column, :feature_columns_json, :training_rows, :testing_rows, :accuracy, :metrics_json, :predictions_json, :model_path, :predictions_path, :status, NOW(), NOW(), NOW(), NOW())');
                        $ins->execute([
                            'dataset_id' => $datasetId,
                            'run_by_user_id' => $job['run_by_user_id'],
                            'model_type' => 'linear_regression',
                            'target_column' => $target,
                            'feature_columns_json' => $featureJson,
                            'training_rows' => $result['training_rows'] ?? 0,
                            'testing_rows' => $result['testing_rows'] ?? 0,
                            'accuracy' => $result['r2'] ?? null,
                            'metrics_json' => $metricsJson,
                            'predictions_json' => $predictionsJson,
                            'model_path' => $result['model_path'] ?? null,
                            'predictions_path' => $result['predictions_path'] ?? ($outPath),
                            'status' => 'completed'
                        ]);
                    } else {
                        $ins = $pdo->prepare('INSERT INTO prediction_results (dataset_id, run_by_user_id, model_type, target_column, feature_columns_json, training_rows, testing_rows, accuracy, metrics_json, predictions_json, status, started_at, completed_at, created_at, updated_at) VALUES (:dataset_id, :run_by_user_id, :model_type, :target_column, :feature_columns_json, :training_rows, :testing_rows, :accuracy, :metrics_json, :predictions_json, :status, NOW(), NOW(), NOW(), NOW())');
                        $ins->execute([
                            'dataset_id' => $datasetId,
                            'run_by_user_id' => $job['run_by_user_id'],
                            'model_type' => 'linear_regression',
                            'target_column' => $target,
                            'feature_columns_json' => $featureJson,
                            'training_rows' => $result['training_rows'] ?? 0,
                            'testing_rows' => $result['testing_rows'] ?? 0,
                            'accuracy' => $result['r2'] ?? null,
                            'metrics_json' => $metricsJson,
                            'predictions_json' => $predictionsJson,
                            'status' => 'completed'
                        ]);
                    }

                    $predictionResultId = (int) $pdo->lastInsertId();

                    // create a report entry for the predictions CSV
                    $predPath = $result['predictions_path'] ?? $outPath;
                    $fileName = basename($predPath);
                    $filePathWeb = preg_replace('#^.+/htdocs/#', '/', str_replace('\\', '/', $predPath));
                    $fileSize = is_file($predPath) ? filesize($predPath) : 0;

                    $rins = $pdo->prepare('INSERT INTO reports (dataset_id, prediction_result_id, generated_by_user_id, report_type, report_title, report_format, file_name, file_path, file_size, status, generated_at, created_at, updated_at) VALUES (:dataset_id, :prediction_result_id, :generated_by_user_id, :report_type, :report_title, :report_format, :file_name, :file_path, :file_size, :status, NOW(), NOW(), NOW())');
                    $rins->execute([
                        'dataset_id' => $datasetId,
                        'prediction_result_id' => $predictionResultId,
                        'generated_by_user_id' => $job['run_by_user_id'],
                        'report_type' => 'prediction',
                        'report_title' => 'Predictions for ' . ($dataset['dataset_name'] ?? 'dataset'),
                        'report_format' => 'csv',
                        'file_name' => $fileName,
                        'file_path' => $filePathWeb ?: $predPath,
                        'file_size' => $fileSize,
                        'status' => 'generated'
                    ]);

                    $reportId = (int) $pdo->lastInsertId();
                    // log activity
                    $actStmt = $pdo->prepare('INSERT INTO activity_logs (user_id, dataset_id, report_id, activity_type, module_name, description, ip_address, user_agent, metadata_json, created_at) VALUES (:user_id, :dataset_id, :report_id, :activity_type, :module_name, :description, :ip_address, :user_agent, :metadata_json, NOW())');
                    $actStmt->execute([
                        'user_id' => $job['run_by_user_id'],
                        'dataset_id' => $datasetId,
                        'report_id' => $reportId,
                        'activity_type' => 'generate',
                        'module_name' => 'prediction',
                        'description' => 'Generated prediction report',
                        'ip_address' => null,
                        'user_agent' => null,
                        'metadata_json' => json_encode(['prediction_result_id' => $predictionResultId, 'file' => $fileName], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                    ]);

                } catch (Throwable $e) {
                    logStd('Warning: failed to persist prediction result: ' . $e->getMessage());
                }
            }
            break;

        default:
            throw new RuntimeException('Unknown job type: ' . $jobType);
    }

    // update job result
    $u = $pdo->prepare('UPDATE jobs SET status = :status, result_json = :result_json, completed_at = NOW(), updated_at = NOW() WHERE job_id = :id');
    $status = (!empty($result['success'])) ? 'completed' : 'failed';
    $u->execute(['status' => $status, 'result_json' => json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'id' => $jobId]);

    logStd('Job ' . $jobId . ' finished with status: ' . $status);
    exit(0);

} catch (Throwable $ex) {
    $err = ['success' => false, 'message' => $ex->getMessage()];
    $u = $pdo->prepare('UPDATE jobs SET status = :status, result_json = :result_json, completed_at = NOW(), updated_at = NOW() WHERE job_id = :id');
    $u->execute(['status' => 'failed', 'result_json' => json_encode($err, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'id' => $jobId]);
    logStd('Job ' . $jobId . ' failed: ' . $ex->getMessage());
    exit(1);
}
