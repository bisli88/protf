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

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (data.length === 0) return;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;

    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      
      ctx.strokeStyle = "#161618";
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = "#161618";
    ctx.fill();
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isPrivate) {
      canvas.style.filter = "blur(8px)";
      canvas.style.opacity = "0.5";
    } else {
      canvas.style.filter = "none";
      canvas.style.opacity = "1";
    }

  }, [data, isPrivate]);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const showScroll = data.length > 4;

  return (
    <div className="bg-zinc-900/40 rounded-3xl p-3 flex flex-col items-center gap-4 max-h-[320px]">
      <div className="relative shrink-0">
        <canvas
          ref={canvasRef}
          className="w-32 h-32 transition-all duration-500"
          style={{ width: "128px", height: "128px" }}
        />
      </div>
      
      <div className={`w-full px-1 overflow-y-auto pr-2 custom-scrollbar ${showScroll ? 'h-36' : ''}`}>
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center justify-between border-b border-zinc-800/50 pb-2 last:border-0">
                <div className="flex items-center gap-2 max-w-[50%]">
                  <div
                    className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider truncate">{item.label}</span>
                </div>
                <div className={`text-right flex flex-col items-end transition-all duration-500 ${isPrivate ? 'blur-md opacity-40 select-none' : ''}`}>
                  <div className="text-sm font-black text-[#D4AF37] leading-none mb-0.5">
                    {percentage}%
                  </div>
                  <div className="font-bold text-zinc-400 text-[10px] tracking-tight">
                    <span className="text-zinc-600 text-[8px] ml-0.5">₪</span>
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
