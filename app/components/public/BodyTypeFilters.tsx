interface BodyTypeFiltersProps {
  bodyTypes: string[];
  activeType: string;
  onTypeChange: (type: string) => void;
}

export default function BodyTypeFilters({ bodyTypes, activeType, onTypeChange }: BodyTypeFiltersProps) {
  return (
    <section aria-label="Body type filters">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-3">
          {bodyTypes.map((type) => {
            const isActive = activeType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                aria-pressed={isActive}
                className={[
                  "inline-flex h-10 min-w-[88px] items-center justify-center rounded-2xl border px-5 text-sm font-semibold transition-colors duration-200 whitespace-nowrap",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:bg-slate-50",
                ].join(" ")}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
