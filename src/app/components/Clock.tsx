import React, { useEffect, useState, useRef } from "react";
import { getClockInfo, ClockInfo } from "../../services/clock";

interface ClockProps {
  use12h: boolean;
  showSeconds: boolean;
  userName?: string;
  onRegisterDim?: (box: DOMRect | null) => void;
}

export const Clock: React.FC<ClockProps> = ({
  use12h,
  showSeconds,
  userName,
  onRegisterDim,
}) => {
  const [info, setInfo] = useState<ClockInfo>(() =>
    getClockInfo(use12h, showSeconds, userName)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setInfo(getClockInfo(use12h, showSeconds, userName));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [use12h, showSeconds, userName]);

  useEffect(() => {
    if (containerRef.current && onRegisterDim) {
      const rect = containerRef.current.getBoundingClientRect();
      onRegisterDim(rect);
    }
  }, [onRegisterDim]);

  return (
    <div ref={containerRef} className="clock-display">
      <div className="clock-greeting">{info.greeting}</div>
      <div className="clock-time">
        {info.timeStr}
        {showSeconds && (
          <span className="clock-seconds">{info.secondsStr}</span>
        )}
      </div>
      <div className="clock-subline">
        {info.dayStr} · {info.dateStr}
      </div>
    </div>
  );
};

