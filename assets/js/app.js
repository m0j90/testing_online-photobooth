document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const video = document.getElementById('webcam');
    const preview = document.getElementById('preview');
    const snapBtn = document.getElementById('snap-btn');
    const filterSelect = document.getElementById('filter-select');
    const stickerSelect = document.getElementById('sticker-select');
    const frameColorInput = document.getElementById('frame-color');
    const textColorInput = document.getElementById('text-color');
    const timerDisplay = document.getElementById('timer-display');
    const downloadBtn = document.getElementById('download-btn');
    const qrWrapper = document.getElementById('qrcode-wrapper');
    const qrContainer = document.getElementById('qrcode');
    const cameraSelect = document.getElementById('cameraSelect');
    
    // Preview Canvas Elements
    const previewCanvas = document.getElementById('stripPreviewCanvas');
    const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

    let currentStream = null;

    // Helper: Maps dropdown values to their respective CSS filter values
    function getSelectedFilterCSS() {
        const val = filterSelect.value;
        switch (val) {
            case 'y2k-flash':
                return 'brightness(130%) contrast(140%) saturate(130%)';
            case 'digital-cam':
                return 'brightness(110%) contrast(125%) saturate(85%)';
            case 'disposable-cam':
                return 'sepia(25%) contrast(120%) brightness(105%) saturate(140%)';
            case 'film-2000s':
                return 'sepia(35%) hue-rotate(-10deg) contrast(115%) saturate(120%)';
            case 'soft-dream':
                return 'brightness(115%) contrast(85%) blur(0.5px) saturate(110%)';
            case 'bw-flash':
                return 'grayscale(100%) brightness(140%) contrast(160%)';
            case 'pink-flash':
                return 'url(#svg-pink-flash) brightness(115%) contrast(120%)';
            case 'cyber-blue':
                return 'url(#svg-cyber-blue) brightness(105%) contrast(125%)';
            case 'polaroid':
                return 'sepia(20%) contrast(110%) brightness(110%) saturate(90%)';
            case 'retro-vhs':
                return 'contrast(130%) saturate(160%) hue-rotate(15deg)';
            case 'thermal':
                // Smooth thermal camera color mapping
                return 'url(#svg-thermal)';
            default:
                // Handles 'none', 'grayscale(100%)', and 'sepia(100%)' directly
                return val;
        }
    }

    // 2. Real-Time Live Preview Loop
    function renderLivePreview() {
        if (!previewCanvas || !previewCtx) return;

        // Draw Background Frame Color
        previewCtx.fillStyle = frameColorInput.value;
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

        const frameWidth = 200;
        const frameHeight = 135;
        const xOffset = 20;
        const yPositions = [20, 175, 330];

        // Draw camera video feed into 3 slots
        yPositions.forEach((y) => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                previewCtx.save();
                previewCtx.filter = getSelectedFilterCSS();
                previewCtx.drawImage(video, xOffset, y, frameWidth, frameHeight);
                previewCtx.restore();
            } else {
                previewCtx.fillStyle = '#333333';
                previewCtx.fillRect(xOffset, y, frameWidth, frameHeight);
            }

            // Draw chosen sticker preview
            const selectedSticker = stickerSelect.value;
            if (selectedSticker !== 'none') {
                previewCtx.font = "20px sans-serif";
                previewCtx.fillText(selectedSticker, xOffset + 10, y + 25);
            }
        });

        // Draw Live Footer Text
        previewCtx.fillStyle = textColorInput.value;
        previewCtx.font = "bold 16px sans-serif";
        previewCtx.textAlign = "center";
        previewCtx.fillText("PHOTOBOOTH", previewCanvas.width / 2, 510);

        previewCtx.font = "12px sans-serif";
        previewCtx.fillText(new Date().toLocaleDateString(), previewCanvas.width / 2, 530);

        requestAnimationFrame(renderLivePreview);
    }

    // Start Live Preview once Video Stream is ready
    video.addEventListener('loadedmetadata', () => {
        renderLivePreview();
    });

    // 3. Camera Initialization
    async function initCamera() {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            if (cameraSelect) {
                cameraSelect.innerHTML = '';
                let mirrorlessId = null;

                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Camera ${index + 1}`;
                    cameraSelect.appendChild(option);

                    const labelLower = device.label.toLowerCase();
                    if (labelLower.includes('eos') || labelLower.includes('imaging edge') || 
                        labelLower.includes('nikon') || labelLower.includes('fujifilm') || 
                        labelLower.includes('lumix') || labelLower.includes('obs')) {
                        mirrorlessId = device.deviceId;
                    }
                });

                const targetId = mirrorlessId || (videoDevices[0] ? videoDevices[0].deviceId : null);
                if (targetId) {
                    cameraSelect.value = targetId;
                    await startStream(targetId);
                }
            } else {
                await startStream();
            }
        } catch (err) {
            alert("Camera initialization failed: " + err.message);
        }
    }

    async function startStream(deviceId) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } : true,
            audio: false
        };

        try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
        } catch (err) {
            alert("Could not start selected camera stream: " + err.message);
        }
    }

    if (cameraSelect) {
        cameraSelect.addEventListener('change', (e) => {
            if (e.target.value) startStream(e.target.value);
        });
    }

    // Live update camera feed filter
    filterSelect.addEventListener('change', () => {
        video.style.filter = getSelectedFilterCSS();
    });

    // 4. Photo Capture & Assembly logic
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function captureSingleShot() {
        return new Promise((resolve) => {
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
            tempCanvas.width = video.videoWidth || 1280;
            tempCanvas.height = video.videoHeight || 720;

            ctx.filter = getSelectedFilterCSS();
            ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            const img = new Image();
            img.onload = () => resolve(img);
            img.src = tempCanvas.toDataURL('image/png');
        });
    }

    async function runCountdown(seconds) {
        for (let i = seconds; i > 0; i--) {
            timerDisplay.textContent = i;
            await delay(1000);
        }
        timerDisplay.textContent = "📸";
        await delay(300);
    }

    snapBtn.addEventListener('click', async () => {
        snapBtn.disabled = true;
        const capturedImages = [];

        for (let shot = 1; shot <= 3; shot++) {
            await runCountdown(3);
            const img = await captureSingleShot();
            capturedImages.push(img);
            timerDisplay.textContent = "";
            await delay(500);
        }

        const stripDataUrl = assemblePhotoStrip(capturedImages);
        
        // Hide preview canvas and show captured image output
        if (previewCanvas) previewCanvas.style.display = "none";
        const previewTitle = document.getElementById('preview-title');
        if (previewTitle) previewTitle.textContent = "Your Photo Strip";

        preview.src = stripDataUrl;
        preview.style.display = "block";
        snapBtn.disabled = false;

        uploadPhoto(stripDataUrl);
    });

    function assemblePhotoStrip(images) {
        const masterCanvas = document.createElement('canvas');
        const ctx = masterCanvas.getContext('2d');

        const photoWidth = images[0].width;
        const photoHeight = images[0].height;

        const padding = 30;
        const photoGap = 20;
        const bottomFooter = 100;

        masterCanvas.width = photoWidth + (padding * 2);
        masterCanvas.height = (photoHeight * 3) + (photoGap * 2) + (padding * 2) + bottomFooter;

        ctx.fillStyle = frameColorInput.value;
        ctx.fillRect(0, 0, masterCanvas.width, masterCanvas.height);

        images.forEach((img, index) => {
            const x = padding;
            const y = padding + (index * (photoHeight + photoGap));

            ctx.drawImage(img, x, y, photoWidth, photoHeight);

            const selectedSticker = stickerSelect.value;
            if (selectedSticker !== 'none') {
                ctx.font = "48px sans-serif";
                ctx.fillText(selectedSticker, x + 20, y + 50);
                ctx.fillText(selectedSticker, x + photoWidth - 60, y + photoHeight - 20);
            }
        });

        ctx.fillStyle = textColorInput.value;
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PHOTOBOOTH", masterCanvas.width / 2, masterCanvas.height - 50);

        ctx.font = "18px sans-serif";
        const currentDate = new Date().toLocaleDateString();
        ctx.fillText(currentDate, masterCanvas.width / 2, masterCanvas.height - 25);

        return masterCanvas.toDataURL('image/png');
    }

    async function uploadPhoto(base64Data) {
        try {
            const response = await fetch('upload.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Data })
            });

            const result = await response.json();

            if (result.success) {
                downloadBtn.href = base64Data;
                downloadBtn.style.display = 'inline-block';

                qrContainer.innerHTML = "";
                new QRCode(qrContainer, {
                    text: result.url,
                    width: 140,
                    height: 140
                });
                qrWrapper.style.display = 'block';
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (err) {
            console.error('Upload Error:', err);
        }
    }

    initCamera();
});