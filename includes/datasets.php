<?php
declare(strict_types=1);

function dataset_columns_match(array $headers): bool
{
    return array_values($headers) === REQUIRED_DATASET_COLUMNS;
}

function dataset_columns_differences(array $headers): array
{
    $missing = array_values(array_diff(REQUIRED_DATASET_COLUMNS, $headers));
    $extra = array_values(array_diff($headers, REQUIRED_DATASET_COLUMNS));

    return [
        'missing' => $missing,
        'extra' => $extra,
        'expected' => REQUIRED_DATASET_COLUMNS,
        'received' => array_values($headers),
    ];
}

function sanitize_upload_filename(string $name): string
{
    $name = pathinfo($name, PATHINFO_FILENAME);
    $name = preg_replace('/[^A-Za-z0-9_-]+/', '_', $name) ?? 'dataset';

    return trim($name, '_') ?: 'dataset';
}
