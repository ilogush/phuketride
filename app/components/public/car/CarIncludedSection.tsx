import type { ComponentType } from "react";
import {
  ClockIcon,
  TruckIcon,
  UserGroupIcon,
  SparklesIcon,
  LifebuoyIcon,
} from "@heroicons/react/24/outline";
import type { CarIncludedItem } from "~/components/public/car/types";

interface CarIncludedSectionProps {
  items: CarIncludedItem[];
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  truck: TruckIcon,
  users: UserGroupIcon,
  clock: ClockIcon,
  sparkles: SparklesIcon,
  support: LifebuoyIcon,
};

export default function CarIncludedSection({ items }: CarIncludedSectionProps) {
  if (!items.length) {
    return null;
  }

  const categories = Array.from(new Set(items.map((item) => item.category || "General")));

  return (
    <section className="rounded-2xl border border-gray-200 p-4 space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Included in the price</h2>
      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800">{category}</h3>
          {items
            .filter((item) => item.category === category)
            .map((item) => {
              const Icon = iconMap[item.iconKey] || SparklesIcon;
              return (
                <div key={item.id} className="flex items-start gap-3 text-gray-800">
                  <Icon className="w-6 h-6 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description ? <p className="text-sm text-gray-500">{item.description}</p> : null}
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </section>
  );
}
