<?php
declare(strict_types=1);

const APP_NAME = 'Web-Based Academic Data Science Hub';
const APP_BASE_PATH = __DIR__ . '/..';
const APP_URL = '/Data';
const SESSION_NAME = 'data_science_hub_session';

/**
 * Python executable path.
 * Auto-detects the correct python binary for the current machine.
 * Priority: 'python' → 'python3' → 'py' (Windows Launcher)
 * You can override this manually if needed, e.g.: const PYTHON_EXECUTABLE = 'C:/Python312/python.exe';
 */
function resolve_python_executable(): string {
    $candidates = ['python', 'python3', 'py'];
    foreach ($candidates as $cmd) {
        $test = shell_exec($cmd . ' --version 2>&1');
        if ($test && stripos($test, 'Python') !== false) {
            return $cmd;
        }
    }
    return 'python'; // fallback
}
define('PYTHON_EXECUTABLE', resolve_python_executable());
const REQUIRED_DATASET_COLUMNS = [
	'Student ID',
	'Student Name',
	'Course',
	'Year Level',
	'Section',
	'Subject',
	'Quiz Score',
	'Midterm Score',
	'Final Score',
	'Attendance',
];
