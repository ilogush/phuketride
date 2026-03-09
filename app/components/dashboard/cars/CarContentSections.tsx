import { Form } from "react-router";
import Card from '~/components/shared/ui/Card';
import Button from '~/components/shared/ui/Button';
import DeleteButton from '~/components/shared/ui/DeleteButton';
import { inputBaseStyles } from "~/lib/styles/input";

type Item = Record<string, unknown>;

type CarContentSectionsProps = {
  includedItems: Item[];
  rules: Item[];
  features: Item[];
  reviews: Item[];
};

type FormInputConfig = {
  ariaLabel: string;
  name: string;
  placeholder: string;
};

type ContentCardProps = {
  title: string;
  intent: string;
  inputs?: FormInputConfig[];
  items: Item[];
  renderBody: (item: Item) => React.ReactNode;
  emptyState?: React.ReactNode;
};

function ContentCardSection({ title, intent, inputs = [], items, renderBody, emptyState }: ContentCardProps) {
  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {inputs.length > 0 ? (
        <Form method="post" className="space-y-2 mb-4">
          <input type="hidden" name="intent" value={intent} />
          {inputs.map((field) => (
            <input
              key={field.name}
              aria-label={field.ariaLabel}
              name={field.name}
              placeholder={field.placeholder}
              className={inputBaseStyles}
            />
          ))}
          <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button>
        </Form>
      ) : null}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
            {renderBody(item)}
            <Form method="post" className="mt-2 flex justify-end">
              <input type="hidden" name="intent" value={`delete_${intent.replace(/^add_/, "")}`} />
              <input type="hidden" name="id" value={String(item.id)} />
              <DeleteButton type="submit" size="sm" title="Delete" />
            </Form>
          </div>
        ))}
        {items.length === 0 ? emptyState : null}
      </div>
    </Card>
  );
}

export default function CarContentSections({ includedItems, rules, features, reviews }: CarContentSectionsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ContentCardSection
          title="Included in the price"
          intent="add_included"
          inputs={[
            { ariaLabel: "Included item category", name: "category", placeholder: "Category" },
            { ariaLabel: "Included item title", name: "title", placeholder: "Title" },
            { ariaLabel: "Included item description", name: "description", placeholder: "Description" },
            { ariaLabel: "Included item icon key", name: "iconKey", placeholder: "Icon key (truck, users, clock...)" },
          ]}
          items={includedItems}
          renderBody={(item) => (
            <>
              <p className="font-medium text-sm">{String(item.category)} • {String(item.title)}</p>
              <p className="text-xs text-gray-600">{String(item.description || "")}</p>
            </>
          )}
        />

        <ContentCardSection
          title="Rules of the road"
          intent="add_rule"
          inputs={[
            { ariaLabel: "Rule title", name: "title", placeholder: "Title" },
            { ariaLabel: "Rule description", name: "description", placeholder: "Description" },
            { ariaLabel: "Rule icon key", name: "iconKey", placeholder: "Icon key (no_smoking, tidy...)" },
          ]}
          items={rules}
          renderBody={(item) => (
            <>
              <p className="font-medium text-sm">{String(item.title)}</p>
              <p className="text-xs text-gray-600">{String(item.description || "")}</p>
            </>
          )}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ContentCardSection
          title="Features"
          intent="add_feature"
          inputs={[
            { ariaLabel: "Feature category", name: "category", placeholder: "Category" },
            { ariaLabel: "Feature name", name: "name", placeholder: "Feature name" },
          ]}
          items={features}
          renderBody={(item) => (
            <p className="font-medium text-sm">{String(item.category)} • {String(item.name)}</p>
          )}
        />

        <ContentCardSection
          title="Reviews"
          intent="review"
          items={reviews}
          renderBody={(item) => (
            <>
              <p className="font-medium text-sm">
                {String(item.reviewerName)} • {String(item.rating)}/5 • Contract #{String(item.contractId || "n/a")}
              </p>
              <p className="text-xs text-gray-600">{String(item.reviewText || "")}</p>
            </>
          )}
          emptyState={<p className="text-sm text-gray-500">No reviews yet</p>}
        />
      </div>
    </>
  );
}
