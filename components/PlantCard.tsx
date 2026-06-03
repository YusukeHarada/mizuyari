'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plant, WateringSchedule } from '@/types';
import { formatNextWatering } from '@/lib/watering-calculator';
import { getPlantType } from '@/lib/plant-types';
import WateringButton from './WateringButton';

const URGENCY_STYLES = {
  overdue: { border: 'border-red-400 bg-red-50',      badge: 'bg-red-100 text-red-700',      label: '遅れ' },
  today:   { border: 'border-amber-400 bg-amber-50',  badge: 'bg-amber-100 text-amber-700',  label: '今日' },
  soon:    { border: 'border-yellow-400 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', label: '明日' },
  ok:      { border: 'border-gray-200 bg-white',       badge: 'bg-green-100 text-green-700',  label: '' },
};

interface Props {
  plant: Plant;
  schedule: WateringSchedule;
  onWatered: (plantId: string) => void;
}

export default function PlantCard({ plant, schedule, onWatered }: Props) {
  const plantType = getPlantType(plant.type_id);
  const style = URGENCY_STYLES[schedule.urgency];
  const nextLabel = formatNextWatering(schedule);

  return (
    <div className={`rounded-2xl border-2 ${style.border} p-4 flex items-center gap-3`}>
      <Link href={`/plants/${plant.id}`} className="flex-shrink-0">
        <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-3xl overflow-hidden relative">
          {plant.image_url ? (
            <Image src={plant.image_url} alt={plant.name} fill className="object-cover" unoptimized />
          ) : (
            plantType.emoji
          )}
        </div>
      </Link>

      <Link href={`/plants/${plant.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800 truncate">{plant.name}</h3>
          {style.label && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
              {style.label}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{plantType.name_ja}</p>
        <p className={`text-sm font-medium mt-0.5 ${
          schedule.urgency === 'overdue' ? 'text-red-600' :
          schedule.urgency === 'today'   ? 'text-amber-600' :
          'text-gray-600'
        }`}>
          {schedule.urgency === 'overdue' || schedule.urgency === 'today'
            ? `水やりが必要です（${nextLabel}）`
            : `次回: ${nextLabel}`}
        </p>
      </Link>

      <WateringButton plantId={plant.id} householdId={plant.householdId} onWatered={onWatered} />
    </div>
  );
}
