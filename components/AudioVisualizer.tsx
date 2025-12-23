import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  themeColor?: string; // 主题色，默认红色
}

// 将 hex 颜色转换为 rgb 值
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 77, b: 106 }; // 默认红色
};

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isPlaying, themeColor = '#ff4d6a' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  // Store previous smoothed data for frame interpolation (exponential smoothing)
  const previousDataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set/refresh canvas size for high DPI.
    // Important: use setTransform to avoid accumulating scale (React 18 StrictMode can run effects twice in dev).
    const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return rect;
    };
    let rect = resize();

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);
    const smoothedData = new Float32Array(bufferLength);

    // Initialize or resize previous data storage
    if (!previousDataRef.current || previousDataRef.current.length !== bufferLength) {
        previousDataRef.current = new Float32Array(bufferLength);
    }

    let time = 0;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    let frameSkip = 0;

    const smoothData = () => {
      if (!analyser) return;
      
      // 1. Moving Average (Expanded window to 17 points: -8 to +8)
      const tempSmoothed = new Float32Array(bufferLength);
      for (let i = 0; i < bufferLength; i++) {
        let sum = 0;
        let count = 0;
        for (let offset = -8; offset <= 8; offset++) {
          const idx = Math.min(Math.max(i + offset, 0), bufferLength - 1);
          sum += dataArray[idx];
          count++;
        }
        tempSmoothed[i] = sum / count;
      }

      // 2. Exponential Smoothing (Interpolate with previous frame)
      // alpha = 0.3 means 30% current frame, 70% previous frame
      const alpha = 0.3; 
      const prev = previousDataRef.current!;
      
      for (let i = 0; i < bufferLength; i++) {
         // Apply smoothing
         smoothedData[i] = prev[i] + alpha * (tempSmoothed[i] - prev[i]);
         // Store for next frame
         prev[i] = smoothedData[i];
      }
    };

    const rgb = hexToRgb(themeColor);

    const draw = () => {
      if (!analyser || !isPlaying) {
        // Draw single flat line if paused or no analyser
        rect = resize();
        ctx.clearRect(0, 0, rect.width, rect.height);
        const centerY = rect.height / 2;
        
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        gradient.addColorStop(0.2, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
        gradient.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.moveTo(0, centerY);
        ctx.lineTo(rect.width, centerY);
        ctx.stroke();
        
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      rect = resize();
      frameSkip = (frameSkip + 1) % 2; // Update data every 2 frames (slightly faster response than 3)
      if (frameSkip === 0) {
        analyser.getByteTimeDomainData(dataArray);
        smoothData();
      }
      time += 0.003; // Slow drift

      ctx.clearRect(0, 0, rect.width, rect.height);
      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;

      // Helper function to draw a wave with Bezier curves
      const drawWave = (
        amplitudeMult: number,
        heightMult: number,
        colorStops: Array<[number, string]>,
        phaseShift: number,
        isCosine: boolean
      ) => {
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        colorStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const points: {x: number, y: number}[] = [];
        // Step size > 1 to reduce high frequency noise (jaggies)
        const step = 5; 

        for (let i = 0; i <= width; i += step) {
          const sliceWidth = bufferLength / width;
          const dataIndex = Math.floor(i * sliceWidth);
          // Clamp index to prevent out of bounds
          const safeIndex = Math.min(dataIndex, bufferLength - 1);
          
          const v = smoothedData[safeIndex] / 128.0; // 1.0 is center
          
          // Amplitude bell curve: 0 at ends, 1 at center
          const scaleFactor = Math.sin((i / width) * Math.PI);
          
          const amplitude = clamp((v - 1) * scaleFactor * amplitudeMult, -amplitudeMult, amplitudeMult);
          const y = centerY + amplitude * (height * heightMult);
          
          // Modulation
          let waveY = y;
          if (!isCosine) {
             // Increased amplitude (1.0 -> 1.8) and slightly reduced frequency (0.0015 -> 0.001) for larger, smoother arcs
             waveY += Math.sin(i * 0.001 + time * 0.2 + phaseShift) * 1.8 * scaleFactor 
                   + Math.sin(i * 0.004 - time * 0.2) * 0.8 * scaleFactor;
          } else {
             waveY += Math.cos(i * 0.0012 + time * 0.3 + phaseShift) * 1.8 * scaleFactor 
                   - Math.sin(i * 0.0015 + time * 0.2) * 0.8 * scaleFactor;
          }
          
          points.push({x: i, y: waveY});
        }

        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          
          // Use quadratic curves between points for smoothness
          for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          // Connect last point
          ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        }
        
        ctx.stroke();
      };

      // Wave 1
      drawWave(1.5, 1.2, [
        [0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`],
        [0.2, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`],
        [0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`],
        [0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`],
        [1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`]
      ], 0, false);

      // Wave 2
      drawWave(1.2, 1.0, [
        [0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`],
        [0.2, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`],
        [0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`],
        [0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`],
        [1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`]
      ], 0, true);
    };

    draw();

    const ro = new ResizeObserver(() => {
      rect = resize();
    });
    ro.observe(canvas);

    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      ro.disconnect();
    };
  }, [analyser, isPlaying, themeColor]);

  return (
    <div className="w-full h-24 flex items-center justify-center opacity-80 pointer-events-none">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full max-w-[66%] lg:max-w-2xl"
      />
    </div>
  );
};

export default AudioVisualizer;
