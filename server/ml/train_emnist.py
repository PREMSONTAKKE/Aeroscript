#!/usr/bin/env python3
"""
Train handwritten character classifier using EMNIST dataset
Uses balanced split with 47 classes
"""

import os
import sys
import json
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import torch
from torchvision import datasets, transforms


def load_emnist_sample(max_per_class=500):
    """Load a balanced sample of EMNIST dataset"""
    print("   Loading EMNIST dataset (balanced, sampled)...")
    
    train_dataset = datasets.EMNIST(
        root='./data',
        split='balanced',
        train=True,
        download=True,
        transform=transforms.ToTensor()
    )
    test_dataset = datasets.EMNIST(
        root='./data',
        split='balanced',
        train=False,
        download=True,
        transform=transforms.ToTensor()
    )
    
    # Combine datasets
    all_data = []
    all_labels = []
    
    for dataset in [train_dataset, test_dataset]:
        for i in range(len(dataset)):
            _, label = dataset[i]
            all_data.append(dataset.data[i].numpy())
            all_labels.append(label)
    
    X = np.array(all_data).astype(np.float32)
    y = np.array(all_labels)
    
    # Sample max_per_class from each class
    unique_classes = np.unique(y)
    sampled_indices = []
    
    for cls in unique_classes:
        class_indices = np.where(y == cls)[0]
        if len(class_indices) > max_per_class:
            selected = np.random.choice(class_indices, max_per_class, replace=False)
        else:
            selected = class_indices
        sampled_indices.extend(selected)
    
    X_sampled = X[sampled_indices]
    y_sampled = y[sampled_indices]
    
    print(f"   Sampled {len(X_sampled)} total from {len(unique_classes)} classes")
    return X_sampled, y_sampled


def create_label_mapping():
    """Create mapping from EMNIST class indices to character labels"""
    labels = []
    for i in range(10):
        labels.append(str(i))
    for i in range(26):
        labels.append(chr(ord('A') + i))
    for i in range(26):
        labels.append(chr(ord('a') + i))
    return labels[:47]


def train_emnist_model(output_dir='model'):
    """Train handwritten character classifier"""
    
    print("=" * 60)
    print("Training EMNIST Character Classifier (47 classes)")
    print("=" * 60)
    
    os.makedirs(output_dir, exist_ok=True)
    
    print("\n[1/5] Loading EMNIST dataset...")
    X, y = load_emnist_sample(max_per_class=800)
    
    print(f"   Unique classes: {len(np.unique(y))}")
    
    print("\n[2/5] Preprocessing data...")
    X = X.reshape(-1, 28, 28)
    X = X.astype(np.float32)
    
    if X.max() > 1.5:
        X = X / 255.0
    
    X = np.clip(X, 0.0, 1.0)
    X = 1.0 - X
    X = X.reshape(len(X), -1)
    
    labels = create_label_mapping()
    print(f"   Classes ({len(labels)}): {labels}")
    print(f"   Data shape: {X.shape}")
    
    print("\n[3/5] Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Training samples: {len(X_train)}")
    print(f"   Testing samples: {len(X_test)}")
    
    print("\n[4/5] Training RandomForest classifier...")
    print("   This should take about 1-2 minutes...")
    
    classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    classifier.fit(X_train, y_train)
    
    print("\n   Evaluating model...")
    y_pred = classifier.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    print("\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=labels, zero_division=0))
    
    print("\n[5/5] Saving model...")
    model_path = os.path.join(output_dir, 'emnist-uppercase.joblib')
    joblib.dump(classifier, model_path)
    print(f"   Model saved to: {model_path}")
    
    labels_path = os.path.join(output_dir, 'labels.json')
    with open(labels_path, 'w') as f:
        json.dump(labels, f)
    print(f"   Labels saved to: {labels_path}")
    
    metadata = {
        'model_type': 'RandomForest (100 trees)',
        'num_classes': len(labels),
        'test_accuracy': float(accuracy),
        'input_shape': [28, 28],
        'input_features': 784,
        'labels': labels,
        'dataset': 'EMNIST Balanced (47 classes, 800 per class)',
        'training_samples': len(X_train),
        'timestamp': str(np.datetime64('today'))
    }
    metadata_path = os.path.join(output_dir, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"   Metadata saved to: {metadata_path}")
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print(f"\nModel can now recognize {len(labels)} classes: A-Z, a-z, 0-9")
    print(f"Test Accuracy: {accuracy:.4f}")
    
    return classifier, labels, accuracy


if __name__ == '__main__':
    classifier, labels, accuracy = train_emnist_model('model')