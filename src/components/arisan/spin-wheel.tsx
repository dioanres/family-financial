"use client";

import { useEffect, useRef, useState } from "react";
import { wheelStopAngle } from "@/lib/arisan";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444"];

interface Member {
  id: string;
  name: string | null;
}

interface SpinWheelProps {
  members: Member[];
  winnerId: string | null;
  onSpinEnd?: () => void;
}

export function SpinWheel({ members, winnerId, onSpinEnd }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const onSpinEndRef = useRef(onSpinEnd);
  onSpinEndRef.current = onSpinEnd;
  const memberIds = members.map((m) => m.id).join(",");

  useEffect(() => {
    if (!winnerId || members.length === 0) return;
    const index = members.findIndex((m) => m.id === winnerId);
    if (index === -1) return;
    const angle = wheelStopAngle(index, members.length, 5);
    // wheelStopAngle returns an angle relative to 0; accumulate on top of
    // the wheel's current rotation so each spin turns forward, never crawls
    // backwards from where the previous spin left off.
    setRotation((prev) => prev - (prev % 360) + angle);
    const timeout = setTimeout(() => onSpinEndRef.current?.(), 5000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerId, memberIds]);

  if (members.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Tidak ada peserta tersisa</p>;
  }

  const segmentSize = 360 / members.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-64 w-64">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
          <div className="h-0 w-0 border-x-8 border-t-[14px] border-x-transparent border-t-foreground" />
        </div>
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: "transform 5s cubic-bezier(0.17,0.67,0.12,0.99)",
          }}
        >
          {members.map((m, i) => {
            const startAngle = (i * segmentSize - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * segmentSize - 90) * (Math.PI / 180);
            const x1 = 100 + 100 * Math.cos(startAngle);
            const y1 = 100 + 100 * Math.sin(startAngle);
            const x2 = 100 + 100 * Math.cos(endAngle);
            const y2 = 100 + 100 * Math.sin(endAngle);
            const largeArc = segmentSize > 180 ? 1 : 0;
            return (
              <path
                key={m.id}
                d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc} 1 ${x2},${y2} Z`}
                fill={COLORS[i % COLORS.length]}
              />
            );
          })}
          {members.map((m, i) => {
            // Label runs radially outward from near the hub along the
            // segment's center angle. On the wheel's left half the raw
            // angle would render the text upside-down, so it's rotated an
            // extra 180° and anchored from the opposite end — same radial
            // position, right-side up.
            const centerAngle = (i + 0.5) * segmentSize - 90;
            const normalized = ((centerAngle % 360) + 360) % 360;
            const flip = normalized > 90 && normalized < 270;
            const radius = 35;
            const name = m.name ?? "";
            const label = name.length > 12 ? `${name.slice(0, 11)}…` : name;
            return (
              <text
                key={m.id}
                x={flip ? 100 - radius : 100 + radius}
                y={100}
                fill="#ffffff"
                fontSize="10"
                fontWeight={600}
                textAnchor={flip ? "end" : "start"}
                dominantBaseline="middle"
                transform={`rotate(${flip ? centerAngle + 180 : centerAngle} 100 100)`}
                style={{ pointerEvents: "none" }}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        {members.map((m, i) => (
          <span key={m.id} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {m.name}
          </span>
        ))}
      </div>
    </div>
  );
}
