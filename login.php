<?php 
session_start();

$error = '';
$adminUsername = 'admin';
$adminPassword = 'admin123';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($_POST['username'] === $adminUsername && $_POST['password'] === $adminPassword) {
        $_SESSION['admin_logged_in'] = true;
        header("Location: gallery.php");
        exit;
    } else {
        $error = 'Invalid credentials.';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
</head>
<body class="bg-light d-flex align-items-center vh-100">

    <div class="container" style="max-width: 360px;">
        <div class="card shadow-sm border-0">
            <div class="card-body p-4">
                <h4 class="fw-bold text-center mb-3">Admin Login</h4>
                <?php if ($error) { ?>
                    <div class="alert alert-danger p-2 small text-center"><?= $error ?></div>
                <?php } ?>
                <form method="POST">
                    <div lass="mb-3 mt-3">
                        <input type="text" name="username" class="form-control" placeholder="Username" required>
                    </div>
                    <div class="mb-3 mt-3">
                        <input type="password" name="password" class="form-control" placeholder="Password" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-100 fw-bold">Login</button>
                </form>
            </div>
        </div>
    </div>
    
</body>
</html>