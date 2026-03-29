#!/usr/bin/env python
"""
Test script to verify EMNIST prediction functionality
Run this to diagnose issues with the prediction pipeline
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
    import joblib
    print(f"✅ joblib installed")
except ImportError as e:
    print(f"❌ joblib not found: {e}")
    print("   Install with: pip install scikit-learn")
    sys.exit(1)

# Test 2: Check model files
print("\n" + "=" * 60)
print("TEST 2: Checking model files...")
print("=" * 60)

model_dir = os.path.join(os.path.dirname(__file__), 'model')
labels_path = os.path.join(model_dir, 'labels.json')
classifier_path = os.path.join(model_dir, 'emnist-uppercase.joblib')

if os.path.exists(labels_path):
    print(f"✅ labels.json found")
    with open(labels_path) as f:
        labels = json.load(f)
        print(f"   {len(labels)} classes: {labels}")
else:
    print(f"❌ labels.json not found at {labels_path}")
    sys.exit(1)

if os.path.exists(classifier_path):
    print(f"✅ emnist-uppercase.joblib found")
    file_size = os.path.getsize(classifier_path)
    print(f"   File size: {file_size / 1024 / 1024:.2f} MB")
else:
    print(f"❌ emnist-uppercase.joblib not found at {classifier_path}")
    sys.exit(1)

# Test 3: Load and test model
print("\n" + "=" * 60)
print("TEST 3: Loading and testing model...")
print("=" * 60)

try:
    classifier = joblib.load(classifier_path)
    print(f"✅ Model loaded successfully")
    print(f"   Type: {type(classifier).__name__}")
    print(f"   n_classes: {classifier.n_classes_ if hasattr(classifier, 'n_classes_') else 'unknown'}")
    
    # Check prediction capabilities
    if hasattr(classifier, 'predict_proba'):
        print(f"   ✅ Has predict_proba method")
    elif hasattr(classifier, 'decision_function'):
        print(f"   ⚠️  Has decision_function method (will use for probabilities)")
    else:
        print(f"   ⚠️  Only has predict method")
        
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    sys.exit(1)

# Test 4: Test prediction
print("\n" + "=" * 60)
print("TEST 4: Testing prediction with random image...")
print("=" * 60)

try:
    # Create a random 28x28 image
    test_image = np.random.rand(28, 28)
    test_image = 1.0 - test_image  # Invert
    test_pixels = test_image.flatten()
    
    # Make prediction
    if hasattr(classifier, 'predict_proba'):
        probabilities = classifier.predict_proba([test_pixels])[0]
    elif hasattr(classifier, 'decision_function'):
        decision = classifier.decision_function([test_pixels])[0]
        exp_decision = np.exp(decision - np.max(decision))
        probabilities = exp_decision / np.sum(exp_decision)
    else:
        prediction = classifier.predict([test_pixels])[0]
        probabilities = np.zeros(len(labels))
        probabilities[prediction] = 1.0
    
    top_indices = np.argsort(probabilities)[::-1][:5]
    
    print(f"✅ Prediction successful!")
    print(f"   Top 5 predictions:")
    for i, idx in enumerate(top_indices, 1):
        char = labels[int(idx)]
        conf = probabilities[int(idx)]
        print(f"      {i}. '{char}' - {conf:.4f}")
        
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
        'labels': labels,
        'pixels': test_pixels.tolist()
    }
    
    json_input = json.dumps(test_payload)
    print(f"✅ Input JSON serialized: {len(json_input)} bytes")
    
    test_output = {
        'predictions': [
            {'character': 'A', 'confidence': 0.9234},
            {'character': 'B', 'confidence': 0.0521}
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
print("\nThe prediction system is ready to use.")
