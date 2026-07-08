<?php
declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

if (!is_authenticated()) {
	header('Location: /Data/pages/auth/login.php');
	exit;
}

if (is_authenticated()) {
	header('Location: /Data/pages/dashboard/index.php');
	exit;
}


