<?php
    session_start();
    $isAdmin = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;

    $jsonFile = __DIR__ . '/photos.json';
    $allPhotos = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];

    $limit = 8;
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
    if ($page < 1) $page = 1;

    $totalPhotos = count($allPhotos);
    $totalPages = ceil($totalPhotos / $limit);
    $offset = ($page - 1) * $limit;

    $photos = array_slice($allPhotos, $offset, $limit);

    date_default_timezone_set('Asia/Manila');
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Public Gallery - Photobooth</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
</head>
<body>
    
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4 shadow-sm">
        <div class="container">
            <a class="navbar-brand fw-bold pt-2 pb-2" href="index.php">Photobooth App</a>

            <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#collapsibleNavbar" aria-controls="collapsibleNavbar" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="collapsibleNavbar">
                <ul class="navbar-nav ms-auto align-items-center gap-2 mt-2 mt-lg-0 pt-2 pb-2">
                    <li class="nav-item">
                        <a class="nav-link" href="index.php">Booth</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="gallery.php">Public Gallery</a>
                    </li>
                    
                    <li class="nav-item d-flex align-items-center gap-2">
                        <?php if ($isAdmin) { ?>
                            <span class="badge bg-warning text-dark">Admin Active</span>
                            <a class="btn btn-sm btn-outline-light" href="logout.php">Logout</a>
                        <?php } else { ?>
                            <a class="btn btn-sm btn-outline-secondary text-white" href="login.php">Admin Login</a>
                        <?php } ?>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container pb-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="fw-bold text-dark mb-0">Public Photo Gallery</h2>
            <a href="index.php" class="btn btn-primary fw-bold">+ Take New Photo</a>
        </div>

        <?php if (empty($photos)) { ?>
            <div class="text-center py-5">
                <p class="lead text-muted">No photo strips found.</p>
            </div>
        <?php } else { ?>
            <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 mb-4">
                
            <?php foreach ($photos as $photo) { ?>
                    <?php $imagePath = "uploads/" . ($photo['filename']); ?>
                    <div class="col">
                        <div class="card h-100 shadow-sm border-0">
                            <img src="<?= $imagePath ?>" class="card-img-top bg-dark" alt="Photobooth Strip" style="object-fit: contain; height: 300px;">
                            <div class="card-body d-flex flex-column justify-content-between text-center p-3">
                                <small class="text-muted mb-2">
                                    <?=  date('M d, Y - h:i A', strtotime($photo['created_at'])) ?>
                                </small>

                                <div class="d-flex gap-2">
                                    <a href="<?= $imagePath ?>" download class="btn btn-sm btn-outline-success fw-bold w-100">
                                        📥 Download
                                    </a>
                                    
                                    <?php if ($isAdmin) { ?>
                                        <form action="delete_photo.php" method="POST" onsubmit="return confirm('Delete this photo permanently?');">
                                            <input type="hidden" name="photo_id" value="<?= $photo['id'] ?>">
                                            <button type="submit" class="btn btn-sm btn-outline-danger fw-bold">🗑️</button>
                                        </form>
                                    <?php } ?>
                                </div>

                            </div>
                        </div>
                    </div>
                <?php } ?>
            </div>

            <?php if ($totalPages > 1) { ?>
                <nav aria-label="Gallery Pagination">
                    <ul class="pagination justify-content-center">
                        <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                            <a class="page-link" href="?page=<?= $page - 1 ?>">Previous</a>
                        </li>
                        <?php for ($i = 1; $i <= $totalPages; $i++) { ?>
                            <li class="page-item <?= ($page == $i) ? 'active' : '' ?>">
                                <a class="page-link" href="?page=<?= $i ?>"><?= $i ?></a>
                            </li>
                        <?php } ?>
                        <li class="page-item <?= ($page >= $totalPages) ? 'disabled' : '' ?>">
                            <a class="page-link" href="?page=<?= $page + 1 ?>">Next</a>
                        </li>
                    </ul>
                </nav>
            <?php } ?>

        <?php } ?>    
    </div>

</body>
</html>