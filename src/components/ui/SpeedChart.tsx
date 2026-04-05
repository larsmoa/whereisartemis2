import type { TrajectoryDataPoint } from "@/types";
import type { UnitSystem } from "@/lib/format";

interface SpeedChartProps {
  data: TrajectoryDataPoint[];
  unitSystem: UnitSystem;
}

export function SpeedChart({ data, unitSystem }: SpeedChartProps): React.JSX.Element | null {
  if (!data || data.length < 2) return null;

  // Map speed to Y and time to X.
  const speeds = data.map((d) => (unitSystem === "us" ? d.speedKms * 0.621371 : d.speedKms));

  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);
  const range = maxSpeed - minSpeed || 1; // avoid division by zero

  const width = 100;
  const height = 24;

  // Map points to SVG coordinates
  const points = speeds.map((speed, i) => {
    const x = (i / (speeds.length - 1)) * width;
    const y = height - ((speed - minSpeed) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  // Get the coordinates for the final "Now" point
  const lastPoint = points[points.length - 1];
  const [lastX, lastY] = lastPoint ? lastPoint.split(",") : ["0", "0"];

  return (
    <div className="absolute inset-x-0 bottom-0 h-10 opacity-60 pointer-events-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="history-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#history-fade)" opacity="0.2" />
        <path
          d={pathD}
          stroke="url(#history-fade)"
          className="fill-none"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {/* "Now" indicator dot */}
        <circle
          cx={lastX}
          cy={lastY}
          r="1.5"
          className="fill-white"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
