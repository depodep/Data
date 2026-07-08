<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['student']);

$user = current_user();
$studentId = $user['student_id'] ?? null;

if ($studentId === null) {
    http_response_code(400);
    echo '<h3>No student identifier found for your account.</h3>';
    exit;
}

$stmt = db()->prepare('SELECT * FROM dataset_records WHERE student_id = :sid ORDER BY created_at DESC');
$stmt->execute(['sid' => $studentId]);
$rows = $stmt->fetchAll();

?><!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Summary</title>
  <link href="/Data/assets/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container py-4">
  <h1>Welcome, <?php echo e($user['full_name'] ?? $studentId); ?></h1>

  <?php if (empty($rows)): ?>
    <div class="alert alert-info">No records found.</div>
  <?php else: ?>
    <h3>Your Records</h3>
    <table class="table table-sm">
      <thead><tr>
        <th>Dataset</th><th>Row</th><th>Subject</th><th>Quiz</th><th>Midterm</th><th>Final</th><th>Attendance</th>
      </tr></thead>
      <tbody>
      <?php foreach ($rows as $r): ?>
        <tr>
          <td><?php echo e($r['dataset_id']); ?></td>
          <td><?php echo e($r['row_number']); ?></td>
          <td><?php echo e($r['subject']); ?></td>
          <td><?php echo e($r['quiz_score']); ?></td>
          <td><?php echo e($r['midterm_score']); ?></td>
          <td><?php echo e($r['final_score']); ?></td>
          <td><?php echo e($r['attendance']); ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>

</body>
</html>
