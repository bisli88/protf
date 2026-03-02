import { useEffect, useRef } from "react";

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: ChartData[];
  isPrivate: boolean;
}

export function PieChart({ data, isPrivate }: PieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (data.length === 0) return;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2; // Start from top

    // Draw pie slices
    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      
      // Draw slice border
      ctx.strokeStyle = "#161618"; // Matching card-bg
      ctx.lineWidth = 3;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Draw center circle for donut effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = "#161618"; // Dark center
    ctx.fill();
    ctx.strokeStyle = "#3f3f46"; // zinc-700
    ctx.lineWidth = 1;
    ctx.stroke();

    // If private mode is on, we blur the entire canvas
    if (isPrivate) {
      canvas.style.filter = "blur(12px)";
      canvas.style.opacity = "0.5";
    } else {
      canvas.style.filter = "none";
      canvas.style.opacity = "1";
    }

  }, [data, isPrivate]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-zinc-900/40 rounded-3xl p-2">
      <div className="flex flex-col items-center">
        <div className="relative mb-8">
          <canvas
            ref={canvasRef}
            className="w-56 h-56 transition-all duration-500"
            style={{ width: "224px", height: "224px" }}
          />
        </div>
        
        <div className="w-full space-y-4 px-2">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider">{item.label}</span>
                </div>
                <div className={`text-right flex flex-col items-end transition-all duration-500 ${isPrivate ? 'blur-md opacity-40 select-none' : ''}`}>
                  <div className="text-xl font-black text-[#D4AF37] leading-none mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                    {percentage}%
                  </div>
                  <div className="font-bold text-zinc-300 text-sm tracking-tight">
                    <span className="text-zinc-500 text-[10px] ml-1">₪</span>
                    {item.value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
