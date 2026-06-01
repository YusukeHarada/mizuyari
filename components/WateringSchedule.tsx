import { WateringSchedule as WateringScheduleType } from '@/types';

interface Props {
  schedule: WateringScheduleType;
}

export default function WateringScheduleInfo({ schedule }: Props) {
  const { next_watering_date, explanation, urgency, adjusted_interval_days } = schedule;

  const dateStr = next_watering_date.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  const urgencyColor =
    urgency === 'overdue' ? 'text-red-600 bg-red-50 border-red-200' :
    urgency === 'today'   ? 'text-amber-700 bg-amber-50 border-amber-200' :
    urgency === 'soon'    ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                            'text-green-700 bg-green-50 border-green-200';

  return (
    <div className={`rounded-2xl border p-4 ${urgencyColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">次回の水やり</p>
          <p className="text-lg font-bold mt-0.5">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{adjusted_interval_days}日</p>
          <p className="text-xs opacity-70">ごとに水やり</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-current border-opacity-20">
        <p className="text-xs font-medium opacity-70 mb-1">計算根拠</p>
        <p className="text-sm font-medium">{explanation}</p>
      </div>
    </div>
  );
}
