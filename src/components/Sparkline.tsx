import React from 'react';

interface SparklineProps {
  itemId: string;
  transactions: any[];
  isUnderAlert: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  itemId,
  transactions,
  isUnderAlert,
}) => {
  // Extract transactions for this item
  const itemTx = transactions
    .filter(t => t.itemId === itemId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Generate mock history or calculate real rolling running balance
  const points: number[] = [];
  let balance = 100; // default initial seed balance

  if (itemTx.length === 0) {
    // Generate deterministic trend points based on itemId
    const hash = itemId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    for (let i = 0; i < 10; i++) {
      points.push(40 + Math.sin(hash + i) * 20 + i * 2);
    }
  } else {
    points.push(balance);
    itemTx.forEach(t => {
      if (t.type === 'INFLOW') {
        balance += t.quantity;
      } else if (t.type === 'OUTFLOW') {
        balance -= t.quantity;
      }
      points.push(balance);
    });
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  // Render specifications
  const width = 80;
  const height = 20;
  const padding = 1;

  const svgPoints = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = svgPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const strokeColor = isUnderAlert ? '#ef4444' : '#10b981';

  return (
    <div className="w-[80px] h-[20px]" title={`Rolling stock trend range: ${min} ➔ ${max}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Endpoint marker dot */}
        {svgPoints.length > 0 && (
          <circle
            cx={svgPoints[svgPoints.length - 1].x}
            cy={svgPoints[svgPoints.length - 1].y}
            r="1.5"
            fill={strokeColor}
          />
        )}
      </svg>
    </div>
  );
};
