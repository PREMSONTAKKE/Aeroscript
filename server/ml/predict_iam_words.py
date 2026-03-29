import json
import sys
import os

# Better error handling and imports
try:
    import cv2
    import numpy as np
    import torch
    from torchvision import transforms
except ImportError as e:
    error_msg = f"Missing required package: {str(e)}. Install with: pip install torch torchvision opencv-python numpy"
    sys.stderr.write(error_msg)
    sys.exit(1)


IMAGE_WIDTH = 128
IMAGE_HEIGHT = 48


def preprocess_image(pixels, width, height):
    """
    Preprocess image for word recognition
    """
    try:
        if not isinstance(pixels, (list, np.ndarray)):
            raise ValueError(f"Pixels must be list or array, got {type(pixels)}")
        
        if len(pixels) != width * height:
            raise ValueError(f"Pixel count ({len(pixels)}) does not match width*height ({width*height})")
        
        image = np.array(pixels, dtype=np.float32).reshape(height, width)
        image = np.clip(image, 0.0, 1.0)
        image = (image * 255.0).astype(np.uint8)
        
        transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Grayscale(num_output_channels=1),
            transforms.Resize((IMAGE_HEIGHT, IMAGE_WIDTH)),
            transforms.ToTensor(),
            transforms.Lambda(lambda x: 1.0 - x)
        ])
        image = transform(image)
        return image.unsqueeze(0)
    except Exception as e:
        raise ValueError(f"Image preprocessing failed: {str(e)}")


class SimpleCNN(torch.nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.conv1 = torch.nn.Conv2d(1, 32, kernel_size=5, stride=1, padding=2)
        self.pool = torch.nn.MaxPool2d(kernel_size=2, stride=2)
        self.conv2 = torch.nn.Conv2d(32, 64, kernel_size=5, stride=1, padding=2)
        self.fc1 = torch.nn.Linear(64 * 12 * 32, 1024)
        self.dropout1 = torch.nn.Dropout(0.35)
        self.fc2 = torch.nn.Linear(1024, 256)
        self.dropout2 = torch.nn.Dropout(0.2)
        self.fc3 = torch.nn.Linear(256, num_classes)

    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))
        x = self.pool(torch.relu(self.conv2(x)))
        x = torch.flatten(x, 1)
        x = torch.relu(self.fc1(x))
        x = self.dropout1(x)
        x = torch.relu(self.fc2(x))
        x = self.dropout2(x)
        x = self.fc3(x)
        return x


def main():
    try:
        # Read and parse input
        input_data = sys.stdin.read()
        if not input_data.strip():
            raise ValueError("No input data received")
        
        payload = json.loads(input_data)
        model_path = payload.get('modelPath')
        labels = payload.get('labels')
        pixels = payload.get('pixels')
        width = payload.get('width')
        height = payload.get('height')

        # Validate input
        if not model_path:
            raise ValueError("Missing 'modelPath' in input")
        if not labels or not isinstance(labels, list):
            raise ValueError("Missing or invalid 'labels' in input")
        if not pixels or not isinstance(pixels, (list, np.ndarray)):
            raise ValueError("Missing or invalid 'pixels' in input")
        if width is None or height is None:
            raise ValueError("Missing 'width' or 'height' in input")

        width = int(width)
        height = int(height)

        if width <= 0 or height <= 0 or len(pixels) != width * height:
            raise ValueError(f'Word prediction expects width, height, and matching grayscale pixels. Got {len(pixels)} pixels for {width}x{height}')

        # Check if model file exists
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        # Preprocess image
        processed = preprocess_image(pixels, width, height)
        
        # Load model
        try:
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            model = SimpleCNN(len(labels)).to(device)
            model.load_state_dict(torch.load(model_path, map_location=device))
            model.eval()
        except Exception as e:
            raise RuntimeError(f"Failed to load model from {model_path}: {str(e)}")
        
        # Make prediction
        try:
            with torch.no_grad():
                processed = processed.to(device)
                outputs = model(processed)
                probabilities = torch.nn.functional.softmax(outputs, dim=1).cpu().numpy()[0]
                top_indices = np.argsort(probabilities)[::-1][:5]
        except Exception as e:
            raise RuntimeError(f"Prediction failed: {str(e)}")
        
        # Format predictions
        predictions = [
            {
                'word': labels[int(index)] if int(index) < len(labels) else '?',
                'confidence': round(float(probabilities[int(index)]), 4),
            }
            for index in top_indices
        ]

        # Return results
        sys.stdout.write(json.dumps({'predictions': predictions}))
        sys.exit(0)

    except Exception as e:
        error_response = json.dumps({
            'error': str(e),
            'predictions': []
        })
        sys.stderr.write(f"Word prediction error: {str(e)}")
        sys.stdout.write(error_response)
        sys.exit(1)


if __name__ == '__main__':
    main()
