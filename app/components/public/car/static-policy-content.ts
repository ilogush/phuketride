import type { CarIncludedItem, CarRuleItem } from "~/components/public/car/types";

export const STATIC_INCLUDED_ITEMS: CarIncludedItem[] = [
  {
    id: 1,
    category: "Convenience",
    title: "Skip the rental counter",
    description: "Use app instructions for pickup and return",
    iconKey: "clock",
  },
  {
    id: 2,
    category: "Convenience",
    title: "Additional drivers for free",
    description: null,
    iconKey: "users",
  },
  {
    id: 3,
    category: "Convenience",
    title: "30-minute return grace period",
    description: "No need to extend unless delay is longer than 30 min",
    iconKey: "clock",
  },
  {
    id: 4,
    category: "Peace of mind",
    title: "Keep the vehicle tidy",
    description: "Please return the vehicle in a clean condition.",
    iconKey: "sparkles",
  },
  {
    id: 5,
    category: "Peace of mind",
    title: "24/7 customer support",
    description: null,
    iconKey: "support",
  },
];

export const STATIC_RULES: CarRuleItem[] = [
  {
    id: 1,
    title: "No smoking allowed",
    description: "Smoking in any Turo vehicle will result in a $150 fine.",
    iconKey: "no_smoking",
  },
  {
    id: 2,
    title: "Keep the vehicle tidy",
    description: "Unreasonably dirty vehicles may result in a $150 fine.",
    iconKey: "tidy",
  },
  {
    id: 3,
    title: "Refuel the vehicle",
    description: "Missing fuel may result in an additional fee.",
    iconKey: "fuel",
  },
  {
    id: 4,
    title: "No off-roading",
    description: "Vehicle may have a device that collects driving and location data. Data may be shared with third parties for vehicle recovery or protection purposes.",
    iconKey: "offroad",
  },
];
