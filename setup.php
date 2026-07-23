<?php

/**
 * setup.php
 * Automated database installer for PHP Project.
 */

// Enable strict typing and error reporting
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Setup exception handler for clean exit codes
set_exception_handler(function (Throwable $e) {
    echo "\n[ERROR] " . $e->getMessage() . "\n";
    exit(1);
});

// Database configuration
$host = 'localhost';
$username = 'root';
$password = '';

echo "Connecting to MySQL...\n";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $mysqli = new mysqli($host, $username, $password);
} catch (mysqli_sql_exception $e) {
    throw new Exception("Connection failed: " . $e->getMessage());
}

$sqlFile = __DIR__ . '/sql.sql';

if (!file_exists($sqlFile)) {
    throw new Exception("sql.sql file not found in " . __DIR__);
}

echo "Reading sql.sql...\n";
$sqlContent = file_get_contents($sqlFile);

if ($sqlContent === false) {
    throw new Exception("Failed to read sql.sql file.");
}

// Automatically detect database name from sql.sql
// Matches: CREATE DATABASE `dbname`; or CREATE DATABASE IF NOT EXISTS dbname;
$dbName = '';
if (preg_match('/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i', $sqlContent, $matches)) {
    $dbName = $matches[1];
} else {
    // Fallback if the dump doesn't have CREATE DATABASE but we can extract it from USE statement
    if (preg_match('/USE\s+`?([a-zA-Z0-9_]+)`?/i', $sqlContent, $matches)) {
        $dbName = $matches[1];
    } elseif (preg_match('/--\s+Database:\s+`?([a-zA-Z0-9_]+)`?/i', $sqlContent, $matches)) {
        $dbName = $matches[1];
    }
}

if ($dbName === '') {
    throw new Exception("Could not automatically determine the database name from sql.sql. Ensure it contains a CREATE DATABASE statement.");
}

echo "Database detected: $dbName\n";

// Check if database exists
$result = $mysqli->query("SHOW DATABASES LIKE '$dbName'");
if ($result && $result->num_rows > 0) {
    echo "Existing database found...\n";
    echo "Removing old database...\n";
    $mysqli->query("DROP DATABASE `$dbName`");
}
if ($result) {
    $result->free();
}

echo "Creating new database...\n";
$mysqli->query("CREATE DATABASE `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

// Select the new database
$mysqli->select_db($dbName);

echo "Importing SQL...\n";

if ($mysqli->multi_query($sqlContent)) {
    do {
        // Store first result set
        if ($result = $mysqli->store_result()) {
            $result->free();
        }
        
        // Check for errors in the current query
        if ($mysqli->errno) {
            throw new Exception("MySQL Error during import: " . $mysqli->error);
        }
    } while ($mysqli->more_results() && $mysqli->next_result());
} else {
    throw new Exception("Failed to execute multi_query: " . $mysqli->error);
}

// Final error check after the loop
if ($mysqli->errno) {
    throw new Exception("MySQL Error during import: " . $mysqli->error);
}

echo "Import completed successfully!\n";

// Close connection
$mysqli->close();

exit(0);
