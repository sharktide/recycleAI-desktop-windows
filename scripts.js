// Global variables
let selectedFile = null;
let boundingBoxes = [];
let scaledBoxes = [];
let selectedBox = null;
let currentImg = null;
let webcamStream = null;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Convert server boxes to {x, y, width, height}
function convertBoxes(serverBoxes) {
  return serverBoxes.map(det => {
    const [x1, y1, x2, y2] = det.box;
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      label: det.label,
      confidence: det.confidence.toFixed(2),
    };
  });
}

function previewImage(file) {
  let img = new Image();
  img.onload = function () {
    currentImg = img;

    const maxDimension = 500;
    const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);

    const displayWidth = img.width * scale;
    const displayHeight = img.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.display = 'block';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    scaledBoxes = boundingBoxes.map(box => ({
      ...box,
      x: box.x * scale,
      y: box.y * scale,
      width: box.width * scale,
      height: box.height * scale,
    }));

    drawBoundingBoxes(scaledBoxes);
  };
  img.src = URL.createObjectURL(file);
}

function drawBoundingBoxes(boxes) {
  boxes.forEach(box => {
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fill();

    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(` `, box.x + 4, box.y + 14);
  });
}

// Handle file upload
document.getElementById('fileInput').addEventListener('change', async (event) => {
  selectedFile = event.target.files[0];
  if (selectedFile) {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch('https://sharktide-yolo-server.hf.space/detect', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    boundingBoxes = convertBoxes(data.detections);
    previewImage(selectedFile);
  }
});

// Canvas click to select box
canvas.addEventListener('click', (e) => {
  const mouseX = e.offsetX;
  const mouseY = e.offsetY;

  selectedBox = scaledBoxes.find(box =>
    mouseX > box.x && mouseX < box.x + box.width &&
    mouseY > box.y && mouseY < box.y + box.height
  );

  if (selectedBox) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);
    drawBoundingBoxes(scaledBoxes);

    ctx.beginPath();
    ctx.rect(selectedBox.x, selectedBox.y, selectedBox.width, selectedBox.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'green';
    ctx.stroke();
  }
});

// Predict selected crop
document.getElementById('predictButton').addEventListener('click', async () => {
  if (!selectedBox) {
    alert('Please select a bounding box to predict.');
    return;
  }

  const cropped = await cropImage(selectedFile, selectedBox);
  sendImageToServer(cropped);
});

async function sendImageToServer(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://sharktide-recycleai-api.hf.space/predict', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  document.getElementById('prediction').innerText = `Prediction: ${data.prediction}`;
}

// Crop logic
function cropImage(file, box) {
  return new Promise((resolve) => {
    let img = new Image();
    img.onload = function () {
      const scaleX = img.width / canvas.width;
      const scaleY = img.height / canvas.height;

      const sx = box.x * scaleX;
      const sy = box.y * scaleY;
      const sw = box.width * scaleX;
      const sh = box.height * scaleY;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = sw;
      cropCanvas.height = sh;

      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      cropCanvas.toBlob(blob => {
        const cropped = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        resolve(cropped);
      }, 'image/jpeg');
    };
    img.src = URL.createObjectURL(file);
  });
}

// Webcam logic
document.getElementById('switchToWebcam').addEventListener('click', () => {
  document.getElementById('drop-area').style.display = 'none';
  document.getElementById('webcamContainer').style.display = 'block';
  document.getElementById('takePictureButton').style.display = 'inline-block';
  document.getElementById('switchToWebcam').style.display = 'none';
  document.getElementById('switchToFile').style.display = 'inline-block';
  startWebcam();
});

document.getElementById('switchToFile').addEventListener('click', switchToFile);

function switchToFile() {
  stopWebcam();
  document.getElementById('webcamContainer').style.display = 'none';
  document.getElementById('drop-area').style.display = 'block';
  document.getElementById('takePictureButton').style.display = 'none';
  document.getElementById('switchToFile').style.display = 'none';
  document.getElementById('switchToWebcam').style.display = 'inline-block';
}

function startWebcam() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      webcamStream = stream;
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      document.getElementById('webcamContainer').innerHTML = '';
      document.getElementById('webcamContainer').appendChild(video);
    })
    .catch(err => {
      console.error('Webcam error:', err);
    });
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
}

document.getElementById('takePictureButton').addEventListener('click', () => {
  const video = document.querySelector('#webcamContainer video');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(async (blob) => {
    selectedFile = new File([blob], 'webcam_image.jpg', { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch('https://sharktide-yolo-server.hf.space/detect', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    boundingBoxes = convertBoxes(data.detections);
    previewImage(selectedFile);
  }, 'image/jpeg');
});

document.getElementById('clearSelectorButton').addEventListener('click', () => {
  document.getElementById('fileInput').value = '';
  selectedFile = null;
  boundingBoxes = [];
  scaledBoxes = [];
  selectedBox = null;
  document.getElementById('prediction').innerText = 'No result yet';
  canvas.style.display = 'none';
  stopWebcam();
  document.getElementById('webcamContainer').innerHTML = '';
  switchToFile();
});
