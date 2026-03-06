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
  policyLinks?: Array<{ href: string; label: string }>;
  footerNote?: string | null;
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  no_smoking: NoSymbolIcon,
  tidy: SparklesIcon,
  fuel: BeakerIcon,
  offroad: ExclamationTriangleIcon,
};

export default function CarRulesSection({ rules, policyLinks = [], footerNote = null }: CarRulesSectionProps) {
  if (!rules.length) {
    return null;
  }

  return (
    <section className="space-y-4 border-b border-gray-200 pb-4">
      <h2 className="text-xl font-semibold text-gray-800">Rules of the road</h2>
      {policyLinks.length ? (
        <div className="text-sm text-gray-500 flex flex-wrap gap-3">
          {policyLinks.map((link) => (
            <a key={`${link.href}-${link.label}`} href={link.href} className="underline hover:text-gray-700">
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      <div className="space-y-4 text-gray-800">
        {rules.map((rule) => {
          const Icon = iconMap[rule.iconKey] || ExclamationTriangleIcon;
          return (
            <div key={rule.id} className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <p className="font-medium text-sm">{rule.title}</p>
                {rule.description ? <p className="text-sm text-gray-500">{rule.description}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
      {footerNote ? (
        <p className="text-sm text-gray-500">{footerNote}</p>
      ) : null}
    </section>
  );
}
