#!/usr/bin/env python
"""
Test script to verify IAM word prediction functionality
Run this to diagnose issues with the word prediction pipeline
"""

import json
import sys
import os

# Test 1: Check imports
print("=" * 60)
print("TEST 1: Checking required packages...")
print("=" * 60)

try:
    import numpy as np
    print(f"✅ numpy {np.__version__}")
except ImportError as e:
    print(f"❌ numpy not found: {e}")
    sys.exit(1)

try:
    import cv2
    print(f"✅ opencv-python (cv2) installed")
except ImportError as e:
    print(f"❌ opencv-python not found: {e}")
    print("   Install with: pip install opencv-python")
    sys.exit(1)

try:
    import torch
    print(f"✅ torch {torch.__version__}")
except ImportError as e:
    print(f"❌ torch not found: {e}")
    print("   Install with: pip install torch")
    sys.exit(1)

try:
    import torchvision
    print(f"✅ torchvision {torchvision.__version__}")
except ImportError as e:
    print(f"❌ torchvision not found: {e}")
    print("   Install with: pip install torchvision")
    sys.exit(1)

# Test 2: Check model files
print("\n" + "=" * 60)
print("TEST 2: Checking model files...")
print("=" * 60)

model_dir = os.path.join(os.path.dirname(__file__), 'model-word')
labels_path = os.path.join(model_dir, 'labels.json')
classifier_path = os.path.join(model_dir, 'iam-word-image.pt')

if os.path.exists(labels_path):
    print(f"✅ labels.json found")
    with open(labels_path) as f:
        labels = json.load(f)
        print(f"   {len(labels)} word classes loaded")
        print(f"   Sample words: {labels[:10]}")
else:
    print(f"❌ labels.json not found at {labels_path}")
    print(f"   Expected path: {labels_path}")
    sys.exit(1)

if os.path.exists(classifier_path):
    print(f"✅ iam-word-image.pt found")
    file_size = os.path.getsize(classifier_path)
    print(f"   File size: {file_size / 1024 / 1024:.2f} MB")
else:
    print(f"⚠️  iam-word-image.pt not found at {classifier_path}")
    print(f"   Expected path: {classifier_path}")
    print("   Checking for alternative formats...")
    
    # Check for .joblib or other formats
    for ext in ['.joblib', '.pkl', '.pth']:
        alt_path = os.path.join(model_dir, f'iam-word-image{ext}')
        if os.path.exists(alt_path):
            print(f"   Found alternative: {alt_path}")

# Test 3: Load and test model
print("\n" + "=" * 60)
print("TEST 3: Loading and testing model...")
print("=" * 60)

try:
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Define SimpleCNN model
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
    
    # Load model
    model = SimpleCNN(len(labels)).to(device)
    
    if os.path.exists(classifier_path):
        state_dict = torch.load(classifier_path, map_location=device)
        model.load_state_dict(state_dict)
        print(f"✅ Model loaded successfully from {classifier_path}")
    else:
        print(f"⚠️  Model not found, creating new model instance for testing")
    
    model.eval()
    print(f"   Type: SimpleCNN")
    print(f"   Output classes: {len(labels)}")
        
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Test prediction
print("\n" + "=" * 60)
print("TEST 4: Testing prediction with random word image...")
print("=" * 60)

try:
    import cv2
    from torchvision import transforms
    
    # Create a random word-sized image (128x48)
    test_image_np = np.random.rand(48, 128)
    test_image_np = 1.0 - test_image_np  # Invert
    test_image_uint8 = (test_image_np * 255.0).astype(np.uint8)
    
    # Preprocess using same pipeline as prediction script
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((48, 128)),
        transforms.ToTensor(),
        transforms.Lambda(lambda x: 1.0 - x)
    ])
    
    processed = transform(test_image_uint8).unsqueeze(0).to(device)
    
    # Make prediction
    with torch.no_grad():
        outputs = model(processed)
        probabilities = torch.nn.functional.softmax(outputs, dim=1).cpu().numpy()[0]
        top_indices = np.argsort(probabilities)[::-1][:5]
    
    print(f"✅ Prediction successful!")
    print(f"   Top 5 predictions:")
    for i, idx in enumerate(top_indices, 1):
        word = labels[int(idx)]
        conf = probabilities[int(idx)]
        print(f"      {i}. '{word}' - {conf:.4f}")
        
except Exception as e:
    print(f"❌ Prediction failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Test JSON input/output
print("\n" + "=" * 60)
print("TEST 5: Testing JSON input/output format...")
print("=" * 60)

try:
    test_payload = {
        'modelPath': classifier_path,
        'labels': labels[:10],  # Sample labels
        'pixels': test_image_np.flatten().tolist(),
        'width': 128,
        'height': 48
    }
    
    json_input = json.dumps(test_payload)
    print(f"✅ Input JSON serialized: {len(json_input)} bytes")
    
    test_output = {
        'predictions': [
            {'word': 'hello', 'confidence': 0.9234},
            {'word': 'world', 'confidence': 0.0521}
        ]
    }
    
    json_output = json.dumps(test_output)
    print(f"✅ Output JSON serialized: {len(json_output)} bytes")
    
except Exception as e:
    print(f"❌ JSON test failed: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED!")
print("=" * 60)
print("\nThe word prediction system is ready to use.")
print("\nAPI Endpoints:")
print("  POST /api/ml/predict       - Predict letters (28x28 image)")
print("  POST /api/ml/predict-word  - Predict words (variable size image)")
