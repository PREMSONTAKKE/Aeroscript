import React, { useEffect, useRef } from 'react';

const DotFormation = ({ onTitleComplete }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const titleDoneRef = useRef(false);

  const DOT_COUNT = 100000;

  const createDots = (width, height) => {
    const dots = new Float32Array(DOT_COUNT * 4);
    const colors = new Uint8Array(DOT_COUNT * 4);

    for (let i = 0; i < DOT_COUNT; i++) {
      const idx = i * 4;
      dots[idx] = Math.random() * width;
      dots[idx + 1] = Math.random() * height;
      dots[idx + 2] = (Math.random() - 0.5) * 2;
      dots[idx + 3] = (Math.random() - 0.5) * 2;

      const isCyan = Math.random() > 0.5;
      if (isCyan) {
        colors[idx] = 56;
        colors[idx + 1] = 189;
        colors[idx + 2] = 248;
      } else {
        colors[idx] = 200;
        colors[idx + 1] = 200;
        colors[idx + 2] = 200;
      }
    }
    return { dots, colors };
  };

  const getTargets = (width, height) => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    const cardY = height / 2;
    const titleY = cardY - 200;

    tempCtx.font = 'bold 80px sans-serif';
    tempCtx.fillStyle = 'white';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText('AEROSCRIPT', width / 2, titleY);

    tempCtx.font = 'bold 18px sans-serif';
    tempCtx.fillText('Kinetic Writing Intelligence', width / 2, titleY + 60);

    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const targets = new Float32Array(width * height * 2);
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const pixelIdx = i / 4;
        targets[count * 2] = pixelIdx % width;
        targets[count * 2 + 1] = Math.floor(pixelIdx / width);
        count++;
      }
    }

    return { targets, count };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isRunning = true;
    let startTime = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const data = createDots(canvas.width, canvas.height);
    let dots = data.dots;
    let colors = data.colors;
    const targets = getTargets(canvas.width, canvas.height);
    let targetCount = targets.count;

    const drawFrame = (timestamp) => {
      if (!startTime) startTime = timestamp;
      
      const w = canvas.width;
      const h = canvas.height;
      const imgData = ctx.createImageData(w, h);
      const pixels = imgData.data;

      pixels.fill(0);

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / 3000, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const easing = eased * 0.03;

      for (let i = 0; i < DOT_COUNT; i++) {
        const idx = i * 4;
        let px = dots[idx];
        let py = dots[idx + 1];

        if (i < targetCount) {
          const tx = targets.targets[i * 2];
          const ty = targets.targets[i * 2 + 1];
          px += (tx - px) * easing;
          py += (ty - py) * easing;
          dots[idx] = px;
          dots[idx + 1] = py;
        } else {
          px += dots[idx + 2] * 0.98;
          py += dots[idx + 3] * 0.98;
          dots[idx + 2] += (Math.random() - 0.5) * 0.02;
          dots[idx + 3] += (Math.random() - 0.5) * 0.02;
          dots[idx] = px;
          dots[idx + 1] = py;
        }

        const pixelX = Math.floor(px);
        const pixelY = Math.floor(py);
        if (pixelX >= 0 && pixelX < w && pixelY >= 0 && pixelY < h) {
          const pIdx = (pixelY * w + pixelX) * 4;
          const isSettled = i < targetCount && progress > 0.5;
          const alpha = isSettled ? 255 : 80 + Math.random() * 40;
          pixels[pIdx] = colors[idx];
          pixels[pIdx + 1] = colors[idx + 1];
          pixels[pIdx + 2] = colors[idx + 2];
          pixels[pIdx + 3] = alpha;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      if (progress >= 1 && !titleDoneRef.current) {
        titleDoneRef.current = true;
        if (onTitleComplete) onTitleComplete();
        
        const finalImgData = ctx.createImageData(w, h);
        const finalPixels = finalImgData.data;
        
        for (let i = 0; i < DOT_COUNT; i++) {
          const idx = i * 4;
          const px = Math.floor(dots[idx]);
          const py = Math.floor(dots[idx + 1]);
          
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const pIdx = (py * w + px) * 4;
            finalPixels[pIdx] = colors[idx];
            finalPixels[pIdx + 1] = colors[idx + 1];
            finalPixels[pIdx + 2] = colors[idx + 2];
            finalPixels[pIdx + 3] = 255;
          }
        }
        
        isRunning = false;
        ctx.putImageData(finalImgData, 0, 0);
        return;
      }

      if (isRunning) {
        animFrameRef.current = requestAnimationFrame(drawFrame);
      }
    };

    requestAnimationFrame(drawFrame);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [onTitleComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: 'transparent', pointerEvents: 'none' }}
    />
  );
};

export default DotFormation;