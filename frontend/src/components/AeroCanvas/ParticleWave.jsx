import React, { useEffect, useRef, useCallback } from 'react';

const ParticleWave = ({ scrollProgress }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const animFrameRef = useRef(null);

  const initParticles = useCallback((width, height) => {
    const particles = [];
    const cols = Math.ceil(width / 30);
    const rows = Math.ceil(height / 30);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        particles.push({
          baseX: i * 30 + 15,
          baseY: j * 30 + 15,
          x: i * 30 + 15,
          y: j * 30 + 15,
          waveOffset: Math.random() * Math.PI * 2,
          waveSpeed: 0.02 + Math.random() * 0.02,
          waveAmplitude: 3 + Math.random() * 5,
          size: 1 + Math.random() * 1.5,
          opacity: 0.15 + Math.random() * 0.25,
          color: Math.random() > 0.8 ? '#38bdf8' : '#64748b'
        });
      }
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let isRunning = true;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const waveIntensity = 1 + scrollProgress * 2;
      const connectionDist = 80;
      const mouseRadius = 150;

      time += 0.016;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const waveX = Math.sin(time * p.waveSpeed * 60 + p.waveOffset) * p.waveAmplitude * waveIntensity;
        const waveY = Math.cos(time * p.waveSpeed * 40 + p.waveOffset * 1.5) * p.waveAmplitude * waveIntensity * 0.5;

        let targetX = p.baseX + waveX;
        let targetY = p.baseY + waveY;

        if (mouseRef.current.active) {
          const dx = p.baseX - mouseRef.current.x;
          const dy = p.baseY - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRadius && dist > 0) {
            const force = (mouseRadius - dist) / mouseRadius;
            const angle = Math.atan2(dy, dx);
            targetX += Math.cos(angle) * force * 40;
            targetY += Math.sin(angle) * force * 40;
          }
        }

        p.x += (targetX - p.x) * 0.08;
        p.y += (targetY - p.y) * 0.08;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (p1.x < 0 || p1.x > canvas.width || p1.y < 0 || p1.y > canvas.height) continue;

        for (let j = i + 1; j < Math.min(i + 20, particles.length); j++) {
          const p2 = particles[j];
          if (p2.x < 0 || p2.x > canvas.width || p2.y < 0 || p2.y > canvas.height) continue;

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#38bdf8';
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scrollProgress, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: 'transparent', pointerEvents: 'none' }}
    />
  );
};

export default ParticleWave;
