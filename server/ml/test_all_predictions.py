#!/usr/bin/env python
"""
Combined test script for both EMNIST (character) and IAM word prediction
Run this to verify both prediction pipelines are working
"""

import json
import sys
import os
import subprocess

print("=" * 70)
print(" AEROSCRIPT ML PREDICTION SYSTEM - COMBINED TEST")
print("=" * 70)

# Run both test scripts
test_scripts = [
    ('EMNIST Character Recognition', 'test_prediction.py'),
    ('IAM Word Recognition', 'test_word_prediction.py')
]

results = {}

for test_name, script in test_scripts:
    print(f"\n{'=' * 70}")
    print(f" {test_name.upper()}")
    print(f"{'=' * 70}\n")
    
    script_path = os.path.join(os.path.dirname(__file__), script)
    
    if not os.path.exists(script_path):
        print(f"❌ Test script not found: {script_path}")
        results[test_name] = False
        continue
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=False,
            text=True,
            timeout=60
        )
        results[test_name] = result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"\n❌ Test timed out for {test_name}")
        results[test_name] = False
    except Exception as e:
        print(f"\n❌ Error running {test_name}: {e}")
        results[test_name] = False

# Summary
print(f"\n{'=' * 70}")
print(" TEST SUMMARY")
print(f"{'=' * 70}\n")

all_passed = True
for test_name, passed in results.items():
    status = "✅ PASSED" if passed else "❌ FAILED"
    print(f"{test_name:40} {status}")
    if not passed:
        all_passed = False

print(f"\n{'=' * 70}")
if all_passed:
    print("✅ ALL TESTS PASSED - System is ready!")
    print("\nAPI ENDPOINTS:")
    print("  • POST /api/ml/predict")
    print("    Predict individual letters/characters (28x28 grayscale pixels)")
    print("    Request: { pixels: [784 floats] }")
    print("    Response: { predictions: [{character, confidence}, ...] }")
    print("")
    print("  • POST /api/ml/predict-word")
    print("    Predict words (variable size grayscale image)")
    print("    Request: { pixels: [width*height floats], width: int, height: int }")
    print("    Response: { predictions: [{word, confidence}, ...] }")
else:
    print("❌ SOME TESTS FAILED - Check logs above")
    sys.exit(1)

print(f"{'=' * 70}\n")
