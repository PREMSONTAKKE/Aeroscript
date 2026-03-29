# AEROSCRIPT - Character & Word Recognition System

This document explains how to use both character (EMNIST) and word (IAM) recognition in Aeroscript.

## System Overview

Aeroscript provides two machine learning services:

1. **Character Recognition (EMNIST)**
   - Recognizes individual uppercase letters (A-Z)
   - Input: 28×28 pixel grayscale images
   - Output: Top 5 predictions with confidence scores

2. **Word Recognition (IAM)**
   - Recognizes complete handwritten words
   - Input: Variable-sized grayscale word images
   - Output: Top 5 predictions with confidence scores

## API Endpoints

### 1. Character Prediction

**Endpoint:** `POST /api/ml/predict`

Predicts individual letters/characters from a 28×28 grayscale image.

**Request Body:**
```json
{
  "pixels": [0.0, 0.1, 0.2, ..., 0.9]  // Array of 784 grayscale values (28×28)
}
```

**Response (Success):**
```json
{
  "predictions": [
    {
      "character": "A",
      "confidence": 0.9523
    },
    {
      "character": "B",
      "confidence": 0.0312
    },
    {
      "character": "C",
      "confidence": 0.0098
    },
    {
      "character": "D",
      "confidence": 0.0043
    },
    {
      "character": "E",
      "confidence": 0.0024
    }
  ]
}
```

**Response (Error):**
```json
{
  "error": "ML service unavailable",
  "details": "EMNIST model files are missing..."
}
```

### 2. Word Prediction

**Endpoint:** `POST /api/ml/predict-word`

Predicts complete words from a variable-sized grayscale image.

**Request Body:**
```json
{
  "pixels": [0.0, 0.1, 0.2, ..., 0.9],  // Array of width×height grayscale values
  "width": 128,                          // Image width in pixels
  "height": 48                           // Image height in pixels
}
```

**Response (Success):**
```json
{
  "predictions": [
    {
      "word": "hello",
      "confidence": 0.8934
    },
    {
      "word": "hallo",
      "confidence": 0.0523
    },
    {
      "word": "jello",
      "confidence": 0.0398
    },
    {
      "word": "help",
      "confidence": 0.0098
    },
    {
      "word": "well",
      "confidence": 0.0047
    }
  ]
}
```

**Response (Error):**
```json
{
  "error": "Word ML service unavailable",
  "details": "IAM word model files are missing..."
}
```

## Usage Examples

### JavaScript/Fetch

#### Predict a Character
```javascript
async function predictCharacter(pixels) {
  const response = await fetch('/api/ml/predict', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pixels })
  });
  
  const data = await response.json();
  console.log('Top prediction:', data.predictions[0]);
}

// Usage:
const imagePixels = new Array(784).fill(0.5); // 28×28 = 784 pixels
predictCharacter(imagePixels);
```

#### Predict a Word
```javascript
async function predictWord(pixels, width, height) {
  const response = await fetch('/api/ml/predict-word', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pixels, width, height })
  });
  
  const data = await response.json();
  console.log('Top prediction:', data.predictions[0]);
}

// Usage:
const wordPixels = new Array(128 * 48).fill(0.5); // 128×48 pixels
predictWord(wordPixels, 128, 48);
```

### curl

#### Predict a Character
```bash
curl -X POST http://localhost:5002/api/ml/predict \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pixels": [0.1, 0.2, ..., 0.9]}'
```

#### Predict a Word
```bash
curl -X POST http://localhost:5002/api/ml/predict-word \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pixels": [0.1, 0.2, ..., 0.9], "width": 128, "height": 48}'
```

## Integration with Frontend

### Step 1: Capture Drawing
```javascript
// From your canvas drawing component
const canvasData = canvas.getImageData(0, 0, 28, 28);
const pixels = Array.from(canvasData.data)
  .filter((_, i) => i % 4 === 3)  // Alpha channel
  .map(v => v / 255);              // Normalize to 0-1
```

### Step 2: Send for Prediction
```javascript
const response = await fetch('/api/ml/predict', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ pixels })
});

const { predictions } = await response.json();
displayResults(predictions);
```

### Step 3: Display Results
```javascript
function displayResults(predictions) {
  predictions.forEach((pred, idx) => {
    const confidence = (pred.confidence * 100).toFixed(1);
    console.log(`${idx + 1}. ${pred.character} (${confidence}%)`);
  });
}
```

## Testing

### Run All Tests
```bash
cd server/ml
python test_all_predictions.py
```

### Test Character Recognition Only
```bash
cd server/ml
python test_prediction.py
```

### Test Word Recognition Only
```bash
cd server/ml
python test_word_prediction.py
```

## Model Files

### Character Recognition (EMNIST)
- **Location:** `server/ml/model/`
- **Files:**
  - `emnist-uppercase.joblib` - Trained classifier
  - `labels.json` - Class labels (A-Z)
  - `metadata.json` - Model metadata

### Word Recognition (IAM)
- **Location:** `server/ml/model-word/`
- **Files:**
  - `iam-word-image.pt` - Trained neural network
  - `labels.json` - Word vocabulary
  - `metadata.json` - Model metadata

## Troubleshooting

### "ML service unavailable"
- Ensure model files exist in the correct directories
- Run the test scripts to identify which models are missing
- Train models if needed: `npm run train-ml` and `npm run train-word-ml`

### "Prediction script exited with code 1"
- Check Python environment: `python -m pip list`
- Install missing dependencies:
  ```bash
  pip install numpy scikit-learn torch torchvision opencv-python
  ```
- Run tests to identify specific errors

### Predictions are inaccurate
- Ensure input images are properly normalized (0.0-1.0 range)
- Check image preprocessing matches training pipeline
- Verify model files are not corrupted
- Train models with more data for better accuracy

## Architecture

```
Frontend (React)
    ↓
    ├─ Canvas Drawing
    ├─ Image Preprocessing
    └─ Send to Backend
           ↓
Server (Node.js)
    ↓
    ├─ /api/ml/predict (Character)
    │  └─ recognitionService.js
    │     └─ predict_emnist.py
    │        └─ emnist-uppercase.joblib
    │
    └─ /api/ml/predict-word (Word)
       └─ wordRecognitionService.js
          └─ predict_iam_words.py
             └─ iam-word-image.pt
```

## Performance Notes

- **Character Prediction:** ~50-100ms per request
- **Word Prediction:** ~200-500ms per request (depending on image size)
- Models run on CPU by default (GPU supported if available)
- Results are deterministic (same input = same output)

## Next Steps

1. Run tests to verify both models are working
2. Integrate prediction endpoints into your frontend
3. Fine-tune confidence thresholds for your use case
4. Retrain models with domain-specific handwriting data if needed
