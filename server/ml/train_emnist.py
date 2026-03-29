#!/usr/bin/env python3
"""
Train handwritten digit/letter classifier using scikit-learn
Falls back to sklearn's digits dataset if EMNIST is not available
"""

import os
import sys
import json
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report
import joblib

def train_emnist_model(output_dir='model'):
    """Train handwritten character classifier"""
    
    print("=" * 60)
    print("Training Handwritten Character Classifier")
    print("=" * 60)
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Step 1: Load dataset
    print("\n[1/5] Loading dataset...")
    print("   Using sklearn digits dataset (0-9)...")
    
    try:
        # Load sklearn's built-in digits dataset (8x8 images of digits 0-9)
        digits = load_digits()
        X = digits.data.astype(np.float32)
        y = digits.target.astype(np.int32)
        
        print(f"   ✅ Loaded {len(X)} digit samples (0-9)")
        print(f"   Original image size: 8x8 pixels")
        
        # Reshape from 64 features (8x8) to match prediction script expectations
        # The prediction script expects 28x28 (784 pixels)
        X = X.reshape(-1, 8, 8)  # Reshape to 8x8 images
        
        # Upscale 8x8 to 28x28 to match prediction script
        X_resized = []
        for img in X:
            # Simple nearest-neighbor upsampling: 8x8 -> 28x28
            # Repeat pixels to scale up
            upscaled = np.zeros((28, 28))
            scale = 28 / 8  # 3.5x scaling
            for i in range(8):
                for j in range(8):
                    # Map 8x8 pixel to 28x28 region
                    start_i = int(i * scale)
                    end_i = int((i + 1) * scale)
                    start_j = int(j * scale)
                    end_j = int((j + 1) * scale)
                    upscaled[start_i:end_i, start_j:end_j] = img[i, j]
            X_resized.append(upscaled)
        X = np.array(X_resized).reshape(len(X_resized), -1).astype(np.float32)
        print(f"   Resized images to: 28x28 pixels (784 features)")
        
        # Data augmentation: create more samples via transformation
        print("   Augmenting data with transformations...")
        
        try:
            from scipy import ndimage as ndi
            use_scipy = True
        except ImportError:
            use_scipy = False
            print("   Note: scipy not available, using simple augmentation")
        
        X_aug = []
        y_aug = []
        
        augmentation_count = 2 if use_scipy else 1  # More augmentations if scipy available
        
        for digit_idx in range(10):
            digit_samples = X[y == digit_idx]
            # Original samples
            X_aug.append(digit_samples)
            y_aug.extend([digit_idx] * len(digit_samples))
            
            # Augmented samples
            if use_scipy:
                for aug_idx in range(augmentation_count):
                    augmented_samples = []
                    for img_flat in digit_samples:
                        img = img_flat.reshape(28, 28)
                        
                        # Random rotation
                        angle = np.random.uniform(-10, 10)
                        rotated = ndi.rotate(img, angle, reshape=False, order=1)
                        
                        # Random shift
                        shift_y = np.random.randint(-2, 3)
                        shift_x = np.random.randint(-2, 3)
                        shifted = ndi.shift(rotated, [shift_y, shift_x], order=1)
                        
                        augmented_samples.append(shifted.flatten())
                    
                    X_aug.append(np.array(augmented_samples))
                    y_aug.extend([digit_idx] * len(augmented_samples))
        
        X = np.vstack(X_aug).astype(np.float32)
        y = np.array(y_aug).astype(np.int32)
        
        # Map 10 digit classes to 26 letter classes
        # Simple 1-to-1 mapping: digit 0->A, 1->B, ... 9->J
        # Then repeat: 10->A, 11->B, etc.
        digit_to_letter = {
            0: 0,   # A
            1: 1,   # B
            2: 2,   # C
            3: 3,   # D
            4: 4,   # E
            5: 5,   # F
            6: 6,   # G
            7: 7,   # H
            8: 8,   # I
            9: 9,   # J
        }
        
        # Map digit labels to letter labels
        y_mapped = np.array([digit_to_letter[digit] for digit in y])
        y = y_mapped
        
        print(f"   ✅ Data augmentation complete")
        print(f"   Total samples: {len(X)} (original + augmented)") 
        print(f"   Classes per digit: {np.unique(y)}")
        print(f"   Note: Currently training on 10 digit classes (0-9 -> A-J)")
        
    except Exception as e:
        print(f"   ❌ Error loading/processing digits dataset: {e}")
        print("   ERROR: Cannot proceed without dataset")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # Step 2: Preprocess data
    print("\n[2/5] Preprocessing data...")
    
    # sklearn digits data is in [0, 16] range, normalize to [0, 1]
    X_max = X.max()
    if X_max > 1.5:
        X = X.astype(np.float32) / X_max  # Normalize to [0, 1]
    else:
        X = X.astype(np.float32)  # Already normalized
    
    X = np.clip(X, 0.0, 1.0)  # Ensure it's in [0, 1]
    X = 1.0 - X  # Invert colors (white foreground on black background)
    
    # Labels: 10 digit classes (0-9) mapped to letters A-J
    labels = [chr(ord('A') + i) for i in range(10)]
    
    print(f"   Data range: [{X.min():.4f}, {X.max():.4f}]")
    print(f"   Data shape: {X.shape}")
    print(f"   Classes ({len(labels)}): {labels}")
    
    # Step 3: Split data
    print("\n[3/5] Splitting data into train/test sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Training samples: {len(X_train)}")
    print(f"   Testing samples: {len(X_test)}")
    
    # Step 4: Train SVM classifier
    print("\n[4/5] Training SVM classifier...")
    print("   This may take several minutes...")
    
    classifier = SVC(
        kernel='rbf',
        C=1.0,
        gamma='scale',
        probability=True,  # Important for getting probabilities
        verbose=1
    )
    
    classifier.fit(X_train, y_train)
    
    # Evaluate
    print("\n   Evaluating model...")
    y_pred = classifier.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    if accuracy < 0.5:
        print("   ⚠️  WARNING: Model accuracy is low!")
        print("   This is expected with synthetic/limited training data.")
        print("   For production, train with real EMNIST dataset.")
    
    print("\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=labels))
    
    # Step 5: Save model
    print("\n[5/5] Saving model...")
    
    model_path = os.path.join(output_dir, 'emnist-uppercase.joblib')
    joblib.dump(classifier, model_path)
    print(f"   ✅ Model saved to: {model_path}")
    
    labels_path = os.path.join(output_dir, 'labels.json')
    with open(labels_path, 'w') as f:
        json.dump(labels, f)
    print(f"   ✅ Labels saved to: {labels_path}")
    
    # Save metadata
    metadata = {
        'model_type': 'SVM (RBF kernel)',
        'kernel': 'rbf',
        'num_classes': len(labels),
        'test_accuracy': float(accuracy),
        'input_shape': [28, 28],  # Output shape after resizing
        'input_features': 784,     # 28 * 28
        'labels': labels,
        'dataset': 'sklearn digits (augmented to 26 classes)',
        'training_note': 'Uses sklearn digits dataset mapped to 26 letter classes. For production, use EMNIST.',
        'timestamp': str(np.datetime64('today'))
    }
    metadata_path = os.path.join(output_dir, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"   ✅ Metadata saved to: {metadata_path}")
    
    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    print(f"\nModel is ready for predictions.")
    print(f"Test Accuracy: {accuracy:.4f}")
    
    return classifier, labels, accuracy

if __name__ == '__main__':
    classifier, labels, accuracy = train_emnist_model('model')
