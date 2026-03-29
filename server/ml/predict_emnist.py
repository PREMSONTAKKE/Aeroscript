import json
import sys
import os

# Add better error handling and logging
try:
    import numpy as np
    import joblib
except ImportError as e:
    error_msg = f"Missing required package: {str(e)}. Install with: pip install scikit-learn numpy"
    sys.stderr.write(error_msg)
    sys.exit(1)


def preprocess_image(pixels):
    """
    Convert flat pixel array to 28x28 normalized image for EMNIST prediction
    """
    try:
        if len(pixels) != 28 * 28:
            raise ValueError(f'EMNIST prediction expects 784 pixels (28x28), got {len(pixels)}')
        
        image = np.array(pixels, dtype=np.float32).reshape(28, 28)
        image = np.clip(image, 0.0, 1.0)
        
        # Normalize: invert colors and flatten
        image = 1.0 - image
        image_flat = image.flatten()
        
        return image_flat
    except Exception as e:
        raise ValueError(f"Image preprocessing failed: {str(e)}")


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

        # Validate input
        if not model_path:
            raise ValueError("Missing 'modelPath' in input")
        if not labels or not isinstance(labels, list):
            raise ValueError("Missing or invalid 'labels' in input")
        if not pixels or not isinstance(pixels, (list, np.ndarray)):
            raise ValueError("Missing or invalid 'pixels' in input")

        if len(pixels) != 28 * 28:
            raise ValueError(f'EMNIST prediction expects 784 pixels (28x28), got {len(pixels)}')

        # Check if model file exists
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        # Preprocess image
        processed = preprocess_image(pixels)
        
        # Load model
        try:
            classifier = joblib.load(model_path)
        except Exception as e:
            raise RuntimeError(f"Failed to load model from {model_path}: {str(e)}")
        
        # Make prediction
        try:
            if hasattr(classifier, 'predict_proba'):
                probabilities = classifier.predict_proba([processed])[0]
            elif hasattr(classifier, 'decision_function'):
                # Fallback for SVM and similar models
                decision = classifier.decision_function([processed])[0]
                exp_decision = np.exp(decision - np.max(decision))
                probabilities = exp_decision / np.sum(exp_decision)
            else:
                # Last resort: use predict and convert to one-hot
                prediction = classifier.predict([processed])[0]
                probabilities = np.zeros(len(labels))
                if prediction < len(labels):
                    probabilities[prediction] = 1.0
        except Exception as e:
            raise RuntimeError(f"Prediction failed: {str(e)}")
        
        # Get top 5 predictions
        top_indices = np.argsort(probabilities)[::-1][:5]
        top_indices = [int(idx) for idx in top_indices if idx < len(labels)]

        predictions = [
            {
                'character': labels[int(index)],
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
        sys.stderr.write(f"Prediction error: {str(e)}")
        sys.stdout.write(error_response)
        sys.exit(1)


if __name__ == '__main__':
    main()
