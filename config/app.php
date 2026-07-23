<?php
declare(strict_types=1);

const APP_NAME = 'Web-Based Academic Data Science Hub';
const APP_BASE_PATH = __DIR__ . '/..';
const APP_URL = '/Data';
const SESSION_NAME = 'data_science_hub_session';

/**
 * Python executable path.
 * Detection priority:
 *   1. Bundled portable Python at python/runtime/python.exe (self-contained, always wins)
 *   2. System 'python' on PATH
 *   3. System 'python3' on PATH
 *   4. Windows Launcher 'py'
 *
 * To bundle a portable Python:
 *   Place the Windows embeddable zip contents into: <project>/python/runtime/
 *   (download from https://www.python.org/downloads/windows/ → "Windows embeddable package")
 *   Then run install.bat which will install pip + packages into that runtime.
 *
 * To override manually: replace the define() below with:
 *   define('PYTHON_EXECUTABLE', 'C:/Python312/python.exe');
 */
function resolve_python_executable(): string {
    // 1. Bundled portable Python bundled inside the project (highest priority)
    $bundled = __DIR__ . '/../python/runtime/python.exe';
    if (file_exists($bundled)) {
        return realpath($bundled);
    }

    // 2. System Python on PATH
    foreach (['python', 'python3', 'py'] as $cmd) {
        $test = shell_exec($cmd . ' --version 2>&1');
        if ($test && stripos($test, 'Python') !== false) {
            return $cmd;
        }
    }

    return 'python'; // last-resort fallback
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
