import React, { useEffect, useRef, useState, useCallback } from 'react';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');

const LetterParticles = ({ mode, onTitleFormed }) => {
  const canvasRef = useRef(null);
  const lettersRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, vx: 0, vy: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const grabbedRef = useRef(null);
  const animFrameRef = useRef(null);
  const [formed, setFormed] = useState(false);

  const titlePositions = useRef([]);

  const calculateTitlePositions = useCallback((width, height) => {
    const title = 'AEROSCRIPT';
    const positions = [];
    const centerX = width / 2;
    const centerY = height * 0.35;
    const letterSpacing = 60;
    const startX = centerX - (title.length * letterSpacing) / 2;

    for (let i = 0; i < title.length; i++) {
      positions.push({
        x: startX + i * letterSpacing,
        y: centerY,
        char: title[i],
        size: 48,
        opacity: 1,
        color: '#38bdf8'
      });
    }
    return positions;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let isRunning = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      titlePositions.current = calculateTitlePositions(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    if (lettersRef.current.length === 0) {
      const count = 80;
      for (let i = 0; i < count; i++) {
        lettersRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          char: LETTERS[Math.floor(Math.random() * LETTERS.length)],
          size: 14 + Math.random() * 18,
          opacity: 0.2 + Math.random() * 0.4,
          color: Math.random() > 0.7 ? '#38bdf8' : '#ffffff',
          targetX: null,
          targetY: null,
          grabbed: false,
          settled: false,
          wanderAngle: Math.random() * Math.PI * 2,
          wanderSpeed: 0.5 + Math.random() * 1.5
        });
      }
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current.vx = x - mouseRef.current.x;
      mouseRef.current.vy = y - mouseRef.current.y;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    };

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (let i = lettersRef.current.length - 1; i >= 0; i--) {
        const l = lettersRef.current[i];
        const dx = mx - l.x;
        const dy = my - l.y;
        if (Math.sqrt(dx * dx + dy * dy) < l.size + 10) {
          grabbedRef.current = { letter: l, offsetX: dx, offsetY: dy };
          l.grabbed = true;
          break;
        }
      }
    };

    const handleMouseUp = () => {
      if (grabbedRef.current) {
        grabbedRef.current.letter.grabbed = false;
        grabbedRef.current.letter.vx = mouseRef.current.vx * 0.5;
        grabbedRef.current.letter.vy = mouseRef.current.vy * 0.5;
        grabbedRef.current = null;
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const animate = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const letters = lettersRef.current;
      const repulsionRadius = 120;
      const repulsionStrength = mode === 'scatter' ? 2 : 0.5;

      for (let i = 0; i < letters.length; i++) {
        const l = letters[i];

        if (l.grabbed && grabbedRef.current) {
          l.x = mouseRef.current.x - grabbedRef.current.offsetX;
          l.y = mouseRef.current.y - grabbedRef.current.offsetY;
          l.vx = 0;
          l.vy = 0;
        } else {
          l.wanderAngle += (Math.random() - 0.5) * 0.3;
          const wanderForce = l.wanderSpeed * 0.1;
          l.vx += Math.cos(l.wanderAngle) * wanderForce;
          l.vy += Math.sin(l.wanderAngle) * wanderForce;

          const dx = l.x - mouseRef.current.x;
          const dy = l.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < repulsionRadius && dist > 0) {
            const force = (repulsionRadius - dist) / repulsionRadius * repulsionStrength;
            const angle = Math.atan2(dy, dx);
            l.vx += Math.cos(angle) * force;
            l.vy += Math.sin(angle) * force;
          }

          if (mode === 'title' && l.targetX !== null && !l.grabbed) {
            const tdx = l.targetX - l.x;
            const tdy = l.targetY - l.y;
            l.vx += tdx * 0.03;
            l.vy += tdy * 0.03;
          }

          const maxSpeed = mode === 'title' ? 8 : 4;
          const speed = Math.sqrt(l.vx * l.vx + l.vy * l.vy);
          if (speed > maxSpeed) {
            l.vx = (l.vx / speed) * maxSpeed;
            l.vy = (l.vy / speed) * maxSpeed;
          }

          l.vx *= 0.96;
          l.vy *= 0.96;
          l.x += l.vx;
          l.y += l.vy;

          const margin = 50;
          if (l.x < -margin) { l.x = canvas.width + margin; }
          if (l.x > canvas.width + margin) { l.x = -margin; }
          if (l.y < -margin) { l.y = canvas.height + margin; }
          if (l.y > canvas.height + margin) { l.y = -margin; }
        }

        if (mode === 'title' && l.targetX !== null && !l.grabbed) {
          const tdx = l.targetX - l.x;
          const tdy = l.targetY - l.y;
          if (Math.abs(tdx) < 2 && Math.abs(tdy) < 2) {
            l.settled = true;
          }
        }

        ctx.save();
        ctx.font = `bold ${l.size}px monospace`;
        ctx.fillStyle = l.color;
        ctx.globalAlpha = l.opacity * (l.settled ? 1 : 0.6);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (l.settled) {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 20;
        }

        ctx.fillText(l.char, l.x, l.y);
        ctx.restore();
      }

      if (mode === 'title') {
        const settledCount = letters.filter(l => l.settled).length;
        if (settledCount > letters.length * 0.8 && !formed) {
          setFormed(true);
          if (onTitleFormed) onTitleFormed();
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, formed, onTitleFormed, calculateTitlePositions]);

  useEffect(() => {
    if (mode === 'title') {
      const letters = lettersRef.current;
      const title = titlePositions.current;

      for (let i = 0; i < title.length; i++) {
        if (letters[i]) {
          letters[i].targetX = title[i].x;
          letters[i].targetY = title[i].y;
          letters[i].char = title[i].char;
          letters[i].size = title[i].size;
          letters[i].color = title[i].color;
          letters[i].opacity = title[i].opacity;
        }
      }
    } else {
      const letters = lettersRef.current;
      for (let i = 0; i < letters.length; i++) {
        letters[i].targetX = null;
        letters[i].targetY = null;
        letters[i].settled = false;
      }
    }
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-auto z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default LetterParticles;
