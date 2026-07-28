import type { DailyWritingStat } from "@/lib/stats-queries";

function sumLastNDays(daily: DailyWritingStat[], n: number, today: string) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (n - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return daily.filter((d) => d.day >= cutoffStr).reduce((sum, d) => sum + d.chars, 0);
}

export function WritingStats({ daily }: { daily: DailyWritingStat[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayChars = daily.find((d) => d.day === today)?.chars ?? 0;
  const weekChars = sumLastNDays(daily, 7, today);
  const monthChars = sumLastNDays(daily, 30, today);

  // Last 14 days, oldest first, filled in for days with no activity.
  const days: DailyWritingStat[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, chars: daily.find((x) => x.day === key)?.chars ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.chars));

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-semibold">{todayChars.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">오늘</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{weekChars.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">최근 7일</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{monthChars.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">최근 30일</p>
        </div>
      </div>
      <div className="flex h-16 items-end gap-1">
        {days.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.chars}자`}>
            <div
              className="w-full rounded-sm bg-foreground/70"
              style={{ height: `${Math.max(2, (d.chars / max) * 56)}px` }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60">
        공백 제외 글자 수 기준 · 에디터로 저장한 기록부터 집계돼요
      </p>
    </div>
  );
}
