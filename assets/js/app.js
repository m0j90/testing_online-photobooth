document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const video = document.getElementById('webcam');
    const preview = document.getElementById('preview');
    const gifPreview = document.getElementById('gif-preview');
    const snapBtn = document.getElementById('snap-btn');
    const filterSelect = document.getElementById('filter-select');
    const fisheyeToggle = document.getElementById('fisheye-toggle');
    const stickerSelect = document.getElementById('sticker-select');
    const frameColorInput = document.getElementById('frame-color');
    const textColorInput = document.getElementById('text-color');
    const timerDisplay = document.getElementById('timer-display');
    const downloadBtn = document.getElementById('download-btn');
    const downloadGifBtn = document.getElementById('download-gif-btn');
    const qrWrapper = document.getElementById('qrcode-wrapper');
    const qrContainer = document.getElementById('qrcode');
    const cameraSelect = document.getElementById('cameraSelect');
    
    const previewCanvas = document.getElementById('stripPreviewCanvas');
    const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

    let currentStream = null;

    const TARGET_SLOT_WIDTH = 640;
    const TARGET_SLOT_HEIGHT = 480;

    // 2. CSS Color Filters Mapping
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
            case 'polaroid':
                return 'sepia(20%) contrast(110%) brightness(110%) saturate(90%)';
            case 'retro-vhs':
                return 'contrast(130%) saturate(160%) hue-rotate(15deg)';
            case 'pink-flash':
                return 'url(#svg-pink-flash) brightness(115%) contrast(120%)';
            case 'cyber-blue':
                return 'url(#svg-cyber-blue) brightness(105%) contrast(125%)';
            case 'thermal':
                return 'url(#svg-thermal)';
            default:
                return val;
        }
    }

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

    // 3. Background-Only Circular Fisheye Algorithm (Shields Center Subject)
    function applyBackgroundFisheye(ctx, width, height) {
        const srcData = ctx.getImageData(0, 0, width, height);
        const dstData = ctx.createImageData(width, height);
        
        const src = srcData.data;
        const dst = dstData.data;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.95; 

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - centerX) / radius;
                const dy = (y - centerY) / radius;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const dstIdx = (y * width + x) * 4;

                if (distance <= 1.0) {
                    let factor = 1.0;

                    // Inner 40% area (where person/face is) stays completely 1:1 unwarped
                    if (distance > 0.4) {
                        // Beyond center, smoothly accelerate distortion into the background outer ring
                        const bgRatio = (distance - 0.4) / 0.6;
                        factor = 1.0 + Math.pow(bgRatio, 2) * 0.65;
                    }

                    let srcX = Math.floor(centerX + dx * factor * radius);
                    let srcY = Math.floor(centerY + dy * factor * radius);

                    // Clamp pixel coordinates within boundaries
                    srcX = Math.max(0, Math.min(width - 1, srcX));
                    srcY = Math.max(0, Math.min(height - 1, srcY));

                    const srcIdx = (srcY * width + srcX) * 4;

                    // Smooth edge vignette transition
                    let vignette = 1.0;
                    if (distance > 0.88) {
                        vignette = (1.0 - distance) / 0.12; 
                    }

                    dst[dstIdx]     = src[srcIdx] * vignette;     
                    dst[dstIdx + 1] = src[srcIdx + 1] * vignette; 
                    dst[dstIdx + 2] = src[srcIdx + 2] * vignette; 
                    dst[dstIdx + 3] = 255;                        
                } else {
                    // Solid black circular frame
                    dst[dstIdx]     = 0;   
                    dst[dstIdx + 1] = 0;   
                    dst[dstIdx + 2] = 0;   
                    dst[dstIdx + 3] = 255; 
                }
            }
        }

        ctx.putImageData(dstData, 0, 0);
    }

    function createFilteredFrameCanvas(sourceVideo, width, height) {
        const rawCanvas = document.createElement('canvas');
        const rawCtx = rawCanvas.getContext('2d');
        rawCanvas.width = width;
        rawCanvas.height = height;

        drawCroppedVideo(rawCtx, sourceVideo, 0, 0, width, height);

        const bakedCanvas = document.createElement('canvas');
        const bakedCtx = bakedCanvas.getContext('2d');
        bakedCanvas.width = width;
        bakedCanvas.height = height;

        try {
            bakedCtx.filter = getSelectedFilterCSS();
        } catch (e) {
            bakedCtx.filter = 'none';
        }

        bakedCtx.drawImage(rawCanvas, 0, 0);

        if (fisheyeToggle && fisheyeToggle.checked) {
            applyBackgroundFisheye(bakedCtx, width, height);
        }

        return bakedCanvas;
    }

    // 4. Preview & Render Engine
    function renderLivePreview() {
        if (!previewCanvas || !previewCtx) return;

        previewCtx.fillStyle = frameColorInput.value;
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

        const frameWidth = 200;
        const frameHeight = 135;
        const xOffset = 20;
        const yPositions = [20, 175, 330];

        let liveFilteredFrame = null;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            liveFilteredFrame = createFilteredFrameCanvas(video, frameWidth, frameHeight);
        }

        yPositions.forEach((y) => {
            if (liveFilteredFrame) {
                previewCtx.drawImage(liveFilteredFrame, xOffset, y, frameWidth, frameHeight);
            } else {
                previewCtx.fillStyle = '#333333';
                previewCtx.fillRect(xOffset, y, frameWidth, frameHeight);
            }

            const selectedSticker = stickerSelect.value;
            if (selectedSticker !== 'none') {
                previewCtx.fillStyle = textColorInput.value;
                previewCtx.font = "20px sans-serif";
                previewCtx.fillText(selectedSticker, xOffset + 10, y + 25);
            }
        });

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

    // 5. Camera Setup
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
            alert("Could not start camera stream: " + err.message);
        }
    }

    if (cameraSelect) {
        cameraSelect.addEventListener('change', (e) => {
            if (e.target.value) startStream(e.target.value);
        });
    }

    filterSelect.addEventListener('change', () => {
        video.style.filter = getSelectedFilterCSS();
    });

    // 6. Photo Capture & Assembly Logic
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function captureSingleShot() {
        return new Promise((resolve) => {
            const filteredCanvas = createFilteredFrameCanvas(video, TARGET_SLOT_WIDTH, TARGET_SLOT_HEIGHT);
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = filteredCanvas.toDataURL('image/png');
        });
    }

    function generateStopMotionGIF(images) {
        return new Promise((resolve) => {
            const frameDataUrls = images.map(img => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                return canvas.toDataURL('image/png');
            });

            gifshot.createGIF({
                images: frameDataUrls,
                gifWidth: TARGET_SLOT_WIDTH,
                gifHeight: TARGET_SLOT_HEIGHT,
                interval: 0.3, 
                numWorkers: 2
            }, function (obj) {
                if (!obj.error) {
                    resolve(obj.image); 
                } else {
                    console.error("GIF Generation failed:", obj.error);
                    resolve(null);
                }
            });
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
            
            if (previewCanvas) previewCanvas.style.display = "none";
            
            const previewTitle = document.getElementById('preview-title');
            if (previewTitle) previewTitle.textContent = "Your Photo Strip & Stop-Motion GIF";

            preview.src = stripDataUrl;
            preview.style.display = "block";

            if (downloadBtn) {
                downloadBtn.href = stripDataUrl;
                downloadBtn.style.display = 'inline-block';
            }

            const gifDataUrl = await generateStopMotionGIF(capturedImages);
            
            if (gifDataUrl) {
                if (gifPreview) {
                    gifPreview.src = gifDataUrl;
                    gifPreview.style.display = 'block';
                }
                if (downloadGifBtn) {
                    downloadGifBtn.href = gifDataUrl;
                    downloadGifBtn.style.display = 'inline-block';
                }
            }

            uploadPhotosToGallery(stripDataUrl, gifDataUrl);

        } catch (error) {
            console.error("Error during capture sequence:", error);
        } finally {
            snapBtn.disabled = false;
        }
    });

    function assemblePhotoStrip(images) {
        const masterCanvas = document.createElement('canvas');
        const ctx = masterCanvas.getContext('2d');

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

    async function uploadPhotosToGallery(stripData, gifData) {
        try {
            const response = await fetch('upload.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    image: stripData,
                    gif: gifData 
                })
            });

            const result = await response.json();

            if (result.success && qrContainer) {
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
            console.error('Gallery Upload Error:', err);
        }
    }

    initCamera();
});