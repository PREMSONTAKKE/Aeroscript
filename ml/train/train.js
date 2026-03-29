const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

// TODO: Implement data loader for your dataset
async function loadData() {
  // This should load your collected stroke data
  return {
    trainData: [],
    testData: [],
    labels: []
  };
}

async function createModel(numClasses) {
  const model = tf.sequential();
  
  // Input layer (200 points * 3 features = 600 elements)
  model.add(tf.layers.inputLayer({ inputShape: [600] }));
  
  // Dense layers for classification
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout(0.3));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ 
    units: numClasses,
    activation: 'softmax'
  }));
  
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
}

async function main() {
  const { trainData, testData, labels } = await loadData();
  
  const model = await createModel(labels.length);
  
  // Start training
  await model.fit(
    tf.tensor2d(trainData.features),
    tf.tensor2d(trainData.labels),
    {
      epochs: 50,
      validationData: [
        tf.tensor2d(testData.features),
        tf.tensor2d(testData.labels)
      ],
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss=${logs.loss} acc=${logs.acc}`);
        }
      }
    }
  );
  
  // Save model
  await model.save(`file://${path.join(__dirname, '../model')}`);
  fs.writeFileSync(
    path.join(__dirname, '../model/labels.json'),
    JSON.stringify(labels)
  );
  
  console.log('✅ Model trained and saved');
}

main();
