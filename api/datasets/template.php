<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="dataset_template.csv"');

$output = fopen('php://output', 'wb');
fputcsv($output, REQUIRED_DATASET_COLUMNS);
fclose($output);
