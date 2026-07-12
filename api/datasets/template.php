<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$templatePath = __DIR__ . '/../../templates/dataset_template.csv';

if (!is_file($templatePath) || !is_readable($templatePath)) {
    http_response_code(500);
    echo 'Template file not found.';
    exit;
}

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="dataset_template.csv"');
header('Content-Length: ' . filesize($templatePath));

readfile($templatePath);

