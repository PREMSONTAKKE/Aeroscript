# Handwriting Model Workflow

## Character recognition

1. Save labeled character samples to `server/ml/dataset/samples.json`, or use the EMNIST training flow.
2. Run `npm run train-ml` inside `server`.
3. The trained character model is written to `server/ml/model/`.

## IAM full-word recognition

This repo now supports a practical full-word recognizer trained from the IAM XML labels and word crop images already extracted in `server/ml/dataset/iam-online`.

### 1. Parse the IAM dataset

```bash
npm run parse-iam-online -- --lowercase
```

This scans the IAM XML forms, matches each `<word ... text="...">` entry to its corresponding PNG crop, and writes:

- `server/ml/dataset/iam_online_word_images.json`

### 2. Train the word model

```bash
npm run train-word-ml
```

This trains a full-word image classifier over the most frequent words and saves:

- `server/ml/model-word/iam-word-image.pt`
- `server/ml/model-word/labels.json`
- `server/ml/model-word/metadata.json`

### 3. Predict words

POST to `/api/ml/predict-word` with grayscale image pixels:

```json
{
  "width": 128,
  "height": 48,
  "pixels": [0.0, 0.1, 0.2]
}
```

### Notes

- This is a full-word classifier, not open-vocabulary decoding.
- It works best on the repeated IAM vocabulary seen during training.
- A true online stroke recognizer would require the pen-point trajectory version of IAM On-Line.
