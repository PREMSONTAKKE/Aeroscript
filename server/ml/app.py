import os
import json
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load models at startup
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
classifier = None
labels = []
status = "Loading..."

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "ml_ready": classifier is not None})

@app.route('/api/ml/status', methods=['GET'])
def ml_status():
    global status
    return jsonify({
        "ready": classifier is not None,
        "status": status
    })

@app.route('/api/ml/predict', methods=['POST'])
def predict():
    global classifier, labels
    
    if classifier is None:
        return jsonify({"error": status}), 503
    
    data = request.get_json()
    pixels = data.get('pixels')
    
    if not pixels:
        return jsonify({"error": "No pixels provided"}), 400
    
    if len(pixels) != 28 * 28:
        return jsonify({"error": f"Expected 784 pixels, got {len(pixels)}"}), 400
    
    try:
        # Convert to numpy array and reshape
        img = np.array(pixels).reshape(1, -1)
        
        # Get probabilities for each class
        proba = classifier.predict_proba(img)[0]
        
        # Get top 3 predictions
        top_indices = proba.argsort()[-3:][::-1]
        
        predictions = [
            {
                "label": labels[i],
                "confidence": round(float(proba[i]) * 100
            }
            for i in top_indices
        ]
        
        return jsonify({"predictions": predictions})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ml/predict-word', methods=['POST'])
def predict_word():
    return jsonify({"error": "Word recognition not implemented in this version"}), 501

def load_models():
    global classifier, labels, status
    
    try:
        labels_path = os.path.join(MODEL_DIR, 'labels.json')
        model_path = os.path.join(MODEL_DIR, 'emnist-uppercase.joblib')
        
        if not os.path.exists(labels_path):
            status = "labels.json not found"
            print(f"⚠️ {status}")
            return
        
        if not os.path.exists(model_path):
            status = "model file not found"
            print(f"⚠️ {status}")
            return
        
        # Load labels
        with open(labels_path, 'r') as f:
            labels = json.load(f)
        
        # Load model
        classifier = joblib.load(model_path)
        
        status = f"Model loaded: {len(labels)} classes"
        print(f"✅ ML Service ready: {len(labels)} classes")
        
    except Exception as e:
        status = f"Failed to load: {str(e)}"
        print(f"❌ {status}")

if __name__ == '__main__':
    load_models()
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)