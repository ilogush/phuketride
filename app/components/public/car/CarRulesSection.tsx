import type { ComponentType } from "react";
import {
  BeakerIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { CarRuleItem } from "~/components/public/car/types";

interface CarRulesSectionProps {
  rules: CarRuleItem[];
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  no_smoking: NoSymbolIcon,
  tidy: SparklesIcon,
  fuel: BeakerIcon,
  offroad: ExclamationTriangleIcon,
};

export default function CarRulesSection({ rules }: CarRulesSectionProps) {
  if (!rules.length) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Rules of the road</h2>
      <div className="space-y-4 text-gray-800">
        {rules.map((rule) => {
          const Icon = iconMap[rule.iconKey] || ExclamationTriangleIcon;
          return (
            <div key={rule.id} className="flex items-start gap-3">
              <Icon className="w-6 h-6 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{rule.title}</p>
                {rule.description ? <p className="text-sm text-gray-500">{rule.description}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
