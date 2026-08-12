<?php
    session_start();
    $isAdmin = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Photobooth</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
    <!-- QRCode.js Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
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
                        <a class="nav-link active" href="index.php">Booth</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="gallery.php">Public Gallery</a>
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
        <div class="row g-4 justify-content-center">

            <div class="col-lg-7">
                <div class="card shadow-sm border-0">
                    <div class="card-body p-4 text-center">
                        <div class="card bg-dark text-white p-3 mb-3 shadow-sm">
                            <label for="cameraSelect" class="form-label fw-bold">📷 Select Camera:</label>
                            <select id="cameraSelect" class="form-select bg-secondary text-white border-0">
                                <option value="">Detecting cameras...</option>
                            </select>
                        </div>

                        <div class="position-relative text-center">
                            <video id="webcam" autoplay playsinline class="w-100 rounded bg-black" style="max-height: 450px;"></video>
                            <div id="timer-display" class="display-1 position-absolute top-50 start-50 translate-middle text-warning fw-bold"></div>
                        </div>

                        <div class="row g-3 text-start">
                            <div class="col-md-6">
                                <label for="filter-select" class="form-label fw-medium">Color Filter</label>
                                <select id="filter-select" class="form-select">
                                    <option value="none">Normal</option>
                                    <option value="grayscale(100%)">Grayscale</option>
                                    <option value="sepia(100%)">Sepia</option>

                                    <option value="y2k-flash">Y2K Flash</option>
                                    <option value="digital-cam">Digital Camera</option>
                                    <option value="disposable-cam">Disposable Cam</option>
                                    <option value="film-2000s">Film 2000s</option>
                                    <option value="soft-dream">Soft Dream</option>
                                    <option value="bw-flash">B&W Flash</option>
                                    <option value="pink-flash">Pink Flash</option>
                                    <option value="cyber-blue">Cyber Blue</option>
                                    <option value="polaroid">Polaroid</option>
                                    <option value="retro-vhs">Retro VHS</option>
                                    <option value="thermal">Thermal</option>
                                </select>
                            </div>

                            <div class="col-md-6">
                                <label for="sticker-select" class="form-label fw-medium">Overlay Sticker</label>
                                <select id="sticker-select" class="form-select">
                                    <option value="none">None</option>
                                    <option value="✨">Stars (✨)</option>
                                    <option value="💖">Hearts (💖)</option>
                                    <option value="🎉">Party (🎉)</option>
                                    <option value="🕶️">Sunglasses (🕶️)</option>
                                </select>
                            </div>

                            <div class="col-md-6">
                                <label for="frame-color" class="form-label fw-medium">Frame Color</label>
                                <input type="color" id="frame-color" class="form-control form-control-color w-100" value="#1e1e24">
                            </div>

                            <div class="col-md-6">
                                <label for="text-color" class="form-label fw-medium">Text Color</label>
                                <input type="color" id="text-color" class="form-control form-control-color w-100" value="#ffffff">
                            </div>

                            <div class="col-12 mt-4">
                                <button id="snap-btn" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm">
                                    ⚡ Take 3-Photo Strip
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div class="col-lg-5">
                <div class="card shadow-sm border-0 text-center h-100">
                    <div class="card-body p-4 d-flec flex column align-items-center justify-content-center">

                        <h5 class="card-title mb-3 fw-bold text-secondary" id="preview-title">Live Strip Preview</h5>

                        <canvas id="stripPreviewCanvas" width="240" height="600" class="rounded shadow-sm mb-3 border w-100" style="max-width: 240px; height: auto;"></canvas>

                        <img id="preview" class="img-fluid rounded shadow-sm mb-3" alt="Captured Strip" style="max-height: 400px; display: none;" />

                        <div class="w-100 mt-2">
                            <a id="download-btn" class="btn btn-success btn-lg w-100 mb-3 fw-bold shadow-sm" download="photostrip.png" style="display: none;">
                                📥 Download Strip
                            </a>

                            <div id="qrcode-wrapper" class="p-3 bg-light border-rounded text-center" style="display: none;">
                                <p class="small text-muted mb-2">Scan with your phone to view online:</p>
                                <div id="qrcode" class="d-flex justify-content-center"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    </div>

    <footer class="text-center py-3 text-muted border-top mt-5">
        <small>© <?php echo date("Y"); ?> Photobooth App &middot; Built with Gemini AI Assistant by Jom</small>
    </footer>

    <svg style="display: none;">
        <defs>
            <filter id="svg-pink-flash">
                <feColorMatrix type="matrix" values="
                    1.2 0.2 0.2 0 0
                    0.1 0.8 0.1 0 0
                    0.3 0.1 1.2 0 0
                    0   0   0   1 0" />
            </filter>
            <filter id="svg-cyber-blue">
                <feColorMatrix type="matrix" values="
                    0.6 0.1 0.3 0 0
                    0.1 1.0 0.3 0 0
                    0.2 0.4 1.5 0 0
                    0   0   0   1 0" />
            </filter>
            <filter id="svg-thermal">
                <feColorMatrix type="matrix" values="
                    0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0    0    0    1 0" result="gray" />

                <feComponentTransfer in="gray">
                    <!-- Shifted so lower midtones (skin) register warmer faster -->
                    <feFuncR type="table" tableValues="0.0  0.0  0.2  0.9  1.0  1.0  1.0"/>
                    <feFuncG type="table" tableValues="0.0  0.2  1.0  0.8  0.4  0.0  1.0"/>
                    <feFuncB type="table" tableValues="0.8  1.0  0.2  0.0  0.0  0.0  1.0"/>
                </feComponentTransfer>
            </filter>
        </defs>
    </svg>
    
    <script src="assets/js/app.js"></script>

</body>
</html>