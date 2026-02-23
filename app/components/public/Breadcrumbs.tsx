import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="max-w-5xl mx-auto px-4">
      <ol className="flex flex-wrap items-center text-sm text-gray-500">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
            {item.to ? (
              <Link className="text-gray-600 transition-colors hover:text-gray-900" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-800 font-semibold">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
