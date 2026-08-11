<?php
date_default_timezone_set('Asia/Manila');
 
header('Content-Type: application/json');

$jsonInput = file_get_contents('php://input');
$requestData = json_decode($jsonInput, true);

if (strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST' || empty($requestData['image'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid request payload']);
    exit;
}

$imgData = $requestData['image'];
$imgData = str_replace('data:image/png;base64,', '', $imgData);
$imgData = str_replace(' ', '+', $imgData);
$decodedData = base64_decode($imgData);

if ($decodedData === false) {
    echo json_encode(['success' => false, 'error' => 'Base64 decoding failed']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$filename = 'strip_' . time() . '_' . uniqid() . '.png';
$filePath = $uploadDir . $filename;

if (!file_put_contents($filePath, $decodedData)) {
    echo json_encode(['success' => false, 'error' => 'Failed to write file to disk']);
    exit;
}

$jsonFile = __DIR__ . '/photos.json';
$photos = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];

$newRecord = [
    'id' => uniqid(),
    'filename' => $filename,
    'created_at' => date('Y-m-d H:i:s')
];

array_unshift($photos, $newRecord);
file_put_contents($jsonFile, json_encode($photos, JSON_PRETTY_PRINT));

$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'off') ? "https" : "https";
$domainName = $_SERVER['HTTP_HOST'];
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
$imageUrl = $protocol . "://" . $domainName . rtrim($scriptDir, '/\\') . "/uploads/" . $filename;

echo json_encode([
    'success' => true,
    'filename' => $filename,
    'url' => $imageUrl
]);
?>