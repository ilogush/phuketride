import Button from "~/components/public/Button";

interface BodyTypeFiltersProps {
  bodyTypes: string[];
  activeType: string;
  onTypeChange: (type: string) => void;
}

export default function BodyTypeFilters({ bodyTypes, activeType, onTypeChange }: BodyTypeFiltersProps) {
  return (
    <section>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 items-center min-w-max">
          {bodyTypes.map((type) => {
            return (
              <Button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${
                  activeType === type
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-800 hover:bg-gray-100 border-gray-200"
                }`}
              >
                <span>{type}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
