// Clock, date, greeting, and ASCII digit rendering utilities

export interface ClockInfo {
  timeStr: string;
  secondsStr: string;
  dayStr: string;
  dateStr: string;
  greeting: string;
  asciiDigits: string[];
}

// 5-line high ASCII banner digits for terminal aesthetic
const DIGITS_3X5: Record<string, string[]> = {
  "0": [" _ ", "| |", "|_|"],
  "1": ["   ", "  |", "  |"],
  "2": [" _ ", " _|", "|_ "],
  "3": [" _ ", " _|", " _|"],
  "4": ["   ", "|_|", "  |"],
  "5": [" _ ", "|_ ", " _|"],
  "6": [" _ ", "|_ ", "|_|"],
  "7": [" _ ", "  |", "  |"],
  "8": [" _ ", "|_|", "|_|"],
  "9": [" _ ", "|_|", " _|"],
  ":": ["   ", " . ", " . "],
  " ": ["   ", "   ", "   "],
};

export function renderAsciiDigitalTime(timeStr: string): string[] {
  const lines = ["", "", ""];
  for (let i = 0; i < timeStr.length; i++) {
    const ch = timeStr[i];
    const glyph = DIGITS_3X5[ch] || DIGITS_3X5[" "];
    for (let row = 0; row < 3; row++) {
      lines[row] += glyph[row] + " ";
    }
  }
  return lines;
}

export function getGreeting(hour: number, name?: string): string {
  let phrase = "Good morning";
  if (hour >= 12 && hour < 17) phrase = "Good afternoon";
  else if (hour >= 17 && hour < 22) phrase = "Good evening";
  else if (hour >= 22 || hour < 4) phrase = "Good night";

  return name?.trim() ? `${phrase}, ${name.trim()}` : phrase;
}

export function getClockInfo(
  use12h: boolean = false,
  showSeconds: boolean = false,
  userName?: string
): ClockInfo {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  let h = hours;
  let ampm = "";
  if (use12h) {
    ampm = h >= 12 ? " PM" : " AM";
    h = h % 12 || 12;
  }

  const hStr = String(h).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  const sStr = String(seconds).padStart(2, "0");

  const timeStr = `${hStr}:${mStr}${use12h ? ampm : ""}`;
  const secondsStr = showSeconds ? `:${sStr}` : "";

  const dayStr = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const dateStr = now.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  const greeting = getGreeting(hours, userName);
  const asciiDigits = renderAsciiDigitalTime(`${hStr}:${mStr}`);

  return {
    timeStr,
    secondsStr,
    dayStr,
    dateStr,
    greeting,
    asciiDigits,
  };
}

