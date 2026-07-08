<?php
declare(strict_types=1);

const APP_NAME = 'Web-Based Academic Data Science Hub';
const APP_BASE_PATH = __DIR__ . '/..';
const APP_URL = '/Data';
const SESSION_NAME = 'data_science_hub_session';
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
