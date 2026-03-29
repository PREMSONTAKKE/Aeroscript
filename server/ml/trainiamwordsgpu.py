import json
import sys
from collections import Counter
from pathlib import Path

import cv2
import joblib
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import transforms


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / 'dataset' / 'iam_online_word_images.json'
MODEL_DIR = BASE_DIR / 'model-word'
MODEL_PATH = MODEL_DIR / 'iam-word-image.pt'
LABELS_PATH = MODEL_DIR / 'labels.json'
METADATA_PATH = MODEL_DIR / 'metadata.json'
IMAGE_WIDTH = 128
IMAGE_HEIGHT = 48
MAX_VOCAB = 100
MIN_FREQUENCY = 30
MAX_SAMPLES_PER_CLASS = 250
MAX_EPOCHS = 35
BATCH_SIZE = 128
LEARNING_RATE = 1e-3
RANDOM_SEED = 42


def get_arg(flag, fallback):
    try:
        index = sys.argv.index(flag)
        return sys.argv[index + 1]
    except (ValueError, IndexError):
        return fallback


def load_dataset():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f'IAM dataset not found: {DATASET_PATH}')

    raw = json.loads(DATASET_PATH.read_text(encoding='utf8'))
    if not isinstance(raw, list) or not raw:
        raise ValueError('IAM word dataset is empty. Run the parser first.')

    return raw


def choose_vocabulary(samples):
    counts = Counter(sample['label'].strip() for sample in samples if isinstance(sample.get('label'), str) and sample['label'].strip())
    vocabulary = [label for label, count in counts.most_common() if count >= MIN_FREQUENCY][:MAX_VOCAB]
    if len(vocabulary) < 2:
        raise ValueError('Not enough repeated words. Lower MIN_FREQUENCY or parse more IAM forms.')
    return vocabulary, counts


class WordImageDataset(Dataset):
    def __init__(self, samples, vocabulary):
        self.samples = [s for s in samples if s['label'].strip() in vocabulary]
        self.label_to_index = {label: index for index, label in enumerate(vocabulary)}
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Grayscale(num_output_channels=1),
            transforms.Resize((IMAGE_HEIGHT, IMAGE_WIDTH)),
            transforms.ToTensor()
        ])
        # Pre-filter valid samples to avoid issues during loading
        self._valid_indices = self._validate_samples()

    def _validate_samples(self):
        """Pre-validate samples to ensure they exist and are loadable"""
        valid_indices = []
        for i, sample in enumerate(self.samples):
            image_path = BASE_DIR / sample['imagePath']
            if image_path.exists():
                valid_indices.append(i)
            else:
                print(f"Warning: Image not found, skipping: {image_path}")
        return valid_indices

    def __len__(self):
        return len(self._valid_indices)

    def __getitem__(self, index):
        actual_index = self._valid_indices[index]
        sample = self.samples[actual_index]
        image_path = BASE_DIR / sample['imagePath']
        
        try:
            image = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
            if image is None:
                raise ValueError(f"Failed to read image: {image_path}")
            
            image = self.transform(image)
            image = 1.0 - image  # Invert colors
            label = self.label_to_index[sample['label'].strip()]
            return image, label
        except Exception as e:
            print(f"Error loading {image_path}: {str(e)}")
            # Return a black image instead of recursing
            black_image = torch.zeros(1, IMAGE_HEIGHT, IMAGE_WIDTH)
            label = self.label_to_index.get(sample['label'].strip(), 0)
            return black_image, label


class SimpleCNN(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=5, stride=1, padding=2)
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=5, stride=1, padding=2)
        
        # Calculate flattened size dynamically instead of hardcoding
        # After conv1 + pool: 64 channels, height/2, width/2
        # After conv2 + pool: 64 channels, height/4, width/4
        flattened_height = IMAGE_HEIGHT // 4
        flattened_width = IMAGE_WIDTH // 4
        flattened_size = 64 * flattened_height * flattened_width
        
        self.fc1 = nn.Linear(flattened_size, 1024)
        self.dropout1 = nn.Dropout(0.35)
        self.fc2 = nn.Linear(1024, 256)
        self.dropout2 = nn.Dropout(0.2)
        self.fc3 = nn.Linear(256, num_classes)

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
    global MAX_VOCAB, MIN_FREQUENCY, MAX_SAMPLES_PER_CLASS, MAX_EPOCHS, BATCH_SIZE, LEARNING_RATE

    MAX_VOCAB = int(get_arg('--max-vocab', str(MAX_VOCAB)))
    MIN_FREQUENCY = int(get_arg('--min-frequency', str(MIN_FREQUENCY)))
    MAX_SAMPLES_PER_CLASS = int(get_arg('--max-samples-per-class', str(MAX_SAMPLES_PER_CLASS)))
    MAX_EPOCHS = int(get_arg('--max-epochs', str(MAX_EPOCHS)))
    BATCH_SIZE = int(get_arg('--batch-size', str(BATCH_SIZE)))
    LEARNING_RATE = float(get_arg('--learning-rate', str(LEARNING_RATE)))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    samples = load_dataset()
    vocabulary, counts = choose_vocabulary(samples)

    dataset = WordImageDataset(samples, vocabulary)
    train_size = int(0.85 * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = random_split(dataset, [train_size, test_size], generator=torch.Generator().manual_seed(RANDOM_SEED))

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=4, pin_memory=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SimpleCNN(len(vocabulary)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    print(f'TensorFlow backend: PyTorch {torch.__version__}')
    print(f'Device: {device}')
    print(f'Train images: {len(train_dataset)}')
    print(f'Test images: {len(test_dataset)}')
    print(f'Vocabulary size: {len(vocabulary)}')
    print('Top labels:', ', '.join(vocabulary[:20]))

    for epoch in range(MAX_EPOCHS):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        for images, labels in train_loader:
            if images is None:
                continue
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
        train_loss = running_loss / len(train_loader)
        train_acc = correct / total
        print(f'Epoch {epoch + 1}: loss={train_loss:.4f} acc={train_acc:.4f}')

        model.eval()
        test_correct = 0
        test_total = 0
        all_probs = []
        all_targets = []
        with torch.no_grad():
            for images, labels in test_loader:
                if images is None:
                    continue
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, predicted = torch.max(outputs.data, 1)
                test_total += labels.size(0)
                test_correct += (predicted == labels).sum().item()
                probs = torch.nn.functional.softmax(outputs, dim=1)
                all_probs.extend(probs.cpu().numpy())
                all_targets.extend(labels.cpu().numpy())
        test_acc = test_correct / test_total if test_total else 0.0
        top3 = 0.0
        top5 = 0.0
        if test_total:
            all_probs = np.array(all_probs)
            all_targets = np.array(all_targets)
            sorted_indices = np.argsort(all_probs, axis=1)[:, ::-1]
            top3 = np.mean([t in sorted_indices[i, :min(3, len(vocabulary))] for i, t in enumerate(all_targets)])
            top5 = np.mean([t in sorted_indices[i, :min(5, len(vocabulary))] for i, t in enumerate(all_targets)])
        print(f'Test accuracy: {test_acc:.4f}')
        print(f'Top-3 accuracy: {top3:.4f}')
        print(f'Top-5 accuracy: {top5:.4f}')

    torch.save(model.state_dict(), MODEL_PATH)
    LABELS_PATH.write_text(json.dumps(vocabulary, indent=2), encoding='utf8')
    METADATA_PATH.write_text(json.dumps({
        'dataset': 'IAM On-Line word images',
        'task': 'full-word classification',
        'imageWidth': IMAGE_WIDTH,
        'imageHeight': IMAGE_HEIGHT,
        'classCount': len(vocabulary),
        'classes': vocabulary,
        'trainSamples': int(len(train_dataset)),
        'testSamples': int(len(test_dataset)),
        'minFrequency': MIN_FREQUENCY,
        'maxVocabulary': MAX_VOCAB,
        'maxSamplesPerClass': MAX_SAMPLES_PER_CLASS,
        'accuracy': float(test_acc),
        'top3Accuracy': float(top3),
        'top5Accuracy': float(top5),
        'model': 'SimpleCNN(Conv2d+Dropout)',
    }, indent=2), encoding='utf8')

    print(f'Saved word-image classifier to {MODEL_PATH}')


if __name__ == '__main__':
    main()
