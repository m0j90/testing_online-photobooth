<?php
session_start();

if (!isset($_SESSION['admin_logged_in'])) {
    header("Location: gallery.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['photo_id'])) {
    $photoId = $_POST['photo_id'];
    $jsonFile = __DIR__ . '/photos.json';

    if (file_exists($jsonFile)) {
        $photos = json_decode(file_get_contents($jsonFile), true);

        foreach ($photos as $key => $photo) {
            if ($photo['id'] === $photoId) {
                $filePath = __DIR__ . '/uploads/' . $photo['filename'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                unset($photos[$key]);
                break;
            }
        }

        file_put_contents($jsonFile, json_encode(array_values($photos), JSON_PRETTY_PRINT));
    }
}

header("Location: " . ($_SERVER['HTTP_REFERER'] ?? 'gallery.php'));
exit;
?>