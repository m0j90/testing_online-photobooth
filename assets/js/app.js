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

    // Fixed internal frame aspect ratio standards (Standard 4:3 Laptop/Photobooth slot)
    const TARGET_SLOT_WIDTH = 640;
    const TARGET_SLOT_HEIGHT = 480;

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
                return 'url(#svg-thermal)';
            default:
                return val;
        }
    }

    // Helper: Center-crops video frame to fit uniform slot sizes regardless of mobile/desktop orientation
    function drawCroppedVideo(ctx, videoEl, destX, destY, destWidth, destHeight) {
        const vWidth = videoEl.videoWidth || destWidth;
        const vHeight = videoEl.videoHeight || destHeight;
        
        const targetRatio = destWidth / destHeight;
        const videoRatio = vWidth / vHeight;

        let srcX = 0, srcY = 0, srcWidth = vWidth, srcHeight = vHeight;

        if (videoRatio > targetRatio) {
            srcWidth = vHeight * targetRatio;
            srcX = (vWidth - srcWidth) / 2;
        } else {
            srcHeight = vWidth / targetRatio;
            srcY = (vHeight - srcHeight) / 2;
        }

        ctx.drawImage(videoEl, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight);
    }

    // Helper: Creates a baked filtered canvas frame compatible across iOS/iPadOS Safari and Desktop
    function createFilteredFrameCanvas(sourceVideo, width, height) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;

        // Apply clean cropped video feed first
        drawCroppedVideo(tempCtx, sourceVideo, 0, 0, width, height);

        // Create secondary offscreen canvas to force filter baking
        const bakedCanvas = document.createElement('canvas');
        const bakedCtx = bakedCanvas.getContext('2d');
        bakedCanvas.width = width;
        bakedCanvas.height = height;

        const currentFilter = getSelectedFilterCSS();
        try {
            bakedCtx.filter = currentFilter;
        } catch (e) {
            bakedCtx.filter = 'none';
        }

        bakedCtx.drawImage(tempCanvas, 0, 0);
        return bakedCanvas;
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

        // Process live filtered frame canvas
        let liveFilteredFrame = null;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            liveFilteredFrame = createFilteredFrameCanvas(video, frameWidth, frameHeight);
        }

        // Draw camera video feed into 3 slots
        yPositions.forEach((y) => {
            if (liveFilteredFrame) {
                previewCtx.drawImage(liveFilteredFrame, xOffset, y, frameWidth, frameHeight);
            } else {
                previewCtx.fillStyle = '#333333';
                previewCtx.fillRect(xOffset, y, frameWidth, frameHeight);
            }

            // Draw chosen sticker preview
            const selectedSticker = stickerSelect.value;
            if (selectedSticker !== 'none') {
                previewCtx.fillStyle = textColorInput.value;
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
            video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: 'user' },
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

    // 4. Photo Capture & Assembly Logic
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function captureSingleShot() {
        return new Promise((resolve) => {
            // Generates a fully baked filtered frame canvas
            const filteredCanvas = createFilteredFrameCanvas(video, TARGET_SLOT_WIDTH, TARGET_SLOT_HEIGHT);

            // Convert baked canvas into an Image element for master strip assembly
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = filteredCanvas.toDataURL('image/png');
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

        try {
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

            // Set fallback direct download href immediately
            downloadBtn.href = stripDataUrl;
            downloadBtn.style.display = 'inline-block';

            uploadPhoto(stripDataUrl);
        } catch (error) {
            console.error("Error during capture sequence:", error);
        } finally {
            snapBtn.disabled = false;
        }
    });

    function assemblePhotoStrip(images) {
        const masterCanvas = document.createElement('canvas');
        const ctx = masterCanvas.getContext('2d');

        // Uniform slot dimensions guarantees identical strip size on smartphones and laptops
        const photoWidth = TARGET_SLOT_WIDTH;
        const photoHeight = TARGET_SLOT_HEIGHT;

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
                ctx.fillStyle = textColorInput.value;
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
                console.warn('Upload failed:', result.error);
            }
        } catch (err) {
            console.error('Upload Error:', err);
        }
    }

    initCamera();
});