// Initialize canvas for capturing webcam snapshots
const captureCanvas = document.createElement('canvas');
let webcamStream = null;
let selectedFile = null;  // This will store the selected file (either from file input or webcam)

function startWebcam() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      webcamStream = stream;
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.play();
      document.getElementById('webcamContainer').innerHTML = ''; // Clear previous video
      document.getElementById('webcamContainer').appendChild(videoElement);

      // Display 'Take Picture' button when webcam is active
      document.getElementById('takePictureButton').style.display = 'inline-block';
    })
    .catch(error => {
      console.error('Error accessing webcam:', error);
    });
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
  }
}

// Capture snapshot from webcam and store it in selectedFile
function captureSnapshot(videoElement) {
  captureCanvas.width = videoElement.videoWidth;
  captureCanvas.height = videoElement.videoHeight;

  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);

  // Convert canvas to Blob in JPEG format
  captureCanvas.toBlob((blob) => {
    selectedFile = new File([blob], 'webcam_image.jpg', { type: 'image/jpeg' });

    // Update UI to show file is selected
    document.getElementById('prediction').innerText = 'Picture taken, ready to predict!';
    
    // Stop the webcam after taking the snapshot
    stopWebcam();
  }, 'image/jpeg');
}

// Send the selected image to the server for prediction
function sendImageToServer(file) {
  const formData = new FormData();
  formData.append('file', file); // Append the file to FormData

  // Log FormData contents to ensure file is added correctly
  console.log('Sending file:', file);

  fetch('https://sharktide-recycleai-api.hf.space/predict', {
    method: 'POST',
    body: formData // The browser automatically sets the Content-Type header to multipart/form-data
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('prediction').innerText = `Prediction: ${data.prediction}`;
  })
  .catch(error => {
    console.error('Error:', error);
    document.getElementById('prediction').innerText = 'Error predicting image.';
  });
}

// Event listener to switch between file upload and webcam
document.getElementById('switchToWebcam').addEventListener('click', () => {
  document.getElementById('drop-area').style.display = 'none';  // Hide file input
  document.getElementById('webcamContainer').style.display = 'block'; // Show webcam
  document.getElementById('takePictureButton').style.display = 'inline-block';  // Show take picture button
  document.getElementById('switchToWebcam').style.display = 'none'; // Hide 'Switch to Webcam' button
  document.getElementById('switchToFile').style.display = 'inline-block'; // Show 'Switch to File' button
  startWebcam();
});

document.getElementById('switchToFile').addEventListener('click', () => {
  document.getElementById('drop-area').style.display = 'block'; // Show file input
  document.getElementById('webcamContainer').style.display = 'none'; // Hide webcam
  document.getElementById('takePictureButton').style.display = 'none'; // Hide take picture button
  document.getElementById('switchToWebcam').style.display = 'inline-block'; // Show 'Switch to Webcam' button
  document.getElementById('switchToFile').style.display = 'none'; // Hide 'Switch to File' button
});

// Capture a picture from the webcam when the button is clicked
document.getElementById('takePictureButton').addEventListener('click', () => {
  const videoElement = document.querySelector('video');
  captureSnapshot(videoElement);
});

// Clear the selected file or webcam image
document.getElementById('clearSelectorButton').addEventListener('click', () => {
  document.getElementById('fileInput').value = '';  // Clear the file input
  selectedFile = null;  // Reset the selected file variable
  document.getElementById('prediction').innerText = 'No result yet';  // Reset the prediction result
  document.getElementById('drop-area').style.display = 'block';  // Show file input again
  document.getElementById('webcamContainer').style.display = 'none';  // Hide webcam
  document.getElementById('takePictureButton').style.display = 'none';  // Hide take picture button
  document.getElementById('switchToWebcam').style.display = 'inline-block'; // Show 'Switch to Webcam' button
  document.getElementById('switchToFile').style.display = 'none'; // Hide 'Switch to File' button
});

// Handle file selection and show the file name (doesn't send to server yet)
document.getElementById('fileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile = file;
    document.getElementById('prediction').innerText = `Selected: ${file.name}`;
  }
});

// Predict the selected image (file input or webcam)
document.getElementById('predictButton').addEventListener('click', () => {
  if (!selectedFile) {
    alert('Please select an image first.');
    return;
  }
  
  // Send the selected image to the server for prediction
  sendImageToServer(selectedFile);
});