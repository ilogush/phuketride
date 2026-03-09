import { Form } from "react-router";
import Card from '~/components/shared/ui/Card';
import Button from '~/components/shared/ui/Button';
import DeleteButton from '~/components/shared/ui/DeleteButton';

type Item = Record<string, unknown>;

type CarContentSectionsProps = {
  includedItems: Item[];
  rules: Item[];
  features: Item[];
  reviews: Item[];
};

export default function CarContentSections({ includedItems, rules, features, reviews }: CarContentSectionsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Included in the price</h2>
          <Form method="post" className="space-y-2 mb-4">
            <input type="hidden" name="intent" value="add_included" />
            <input aria-label="Included item category" name="category" placeholder="Category" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input aria-label="Included item title" name="title" placeholder="Title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input aria-label="Included item description" name="description" placeholder="Description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input aria-label="Included item icon key" name="iconKey" placeholder="Icon key (truck, users, clock...)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button>
          </Form>
          <div className="space-y-2">
            {includedItems.map((item) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">{String(item.category)} • {String(item.title)}</p>
                <p className="text-xs text-gray-600">{String(item.description || "")}</p>
                <Form method="post" className="mt-2 flex justify-end">
                  <input type="hidden" name="intent" value="delete_included" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <DeleteButton type="submit" size="sm" title="Delete" />
                </Form>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Rules of the road</h2>
          <Form method="post" className="space-y-2 mb-4">
            <input type="hidden" name="intent" value="add_rule" />
            <input aria-label="Rule title" name="title" placeholder="Title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input aria-label="Rule description" name="description" placeholder="Description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input aria-label="Rule icon key" name="iconKey" placeholder="Icon key (no_smoking, tidy...)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button>
          </Form>
          <div className="space-y-2">
            {rules.map((item) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">{String(item.title)}</p>
                <p className="text-xs text-gray-600">{String(item.description || "")}</p>
                <Form method="post" className="mt-2 flex justify-end">
                  <input type="hidden" name="intent" value="delete_rule" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <DeleteButton type="submit" size="sm" title="Delete" />
                </Form>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Features</h2>
          <Form method="post" className="space-y-2 mb-4">
            <input type="hidden" name="intent" value="add_feature" />
            <input aria-label="Feature category" name="category" placeholder="Category" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input aria-label="Feature name" name="name" placeholder="Feature name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button>
          </Form>
          <div className="space-y-2">
            {features.map((item) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">{String(item.category)} • {String(item.name)}</p>
                <Form method="post" className="mt-2 flex justify-end">
                  <input type="hidden" name="intent" value="delete_feature" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <DeleteButton type="submit" size="sm" title="Delete" />
                </Form>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Reviews</h2>
          <div className="space-y-2">
            {reviews.map((item) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">
                  {String(item.reviewerName)} • {String(item.rating)}/5 • Contract #{String(item.contractId || "n/a")}
                </p>
                <p className="text-xs text-gray-600">{String(item.reviewText || "")}</p>
                <Form method="post" className="mt-2 flex justify-end">
                  <input type="hidden" name="intent" value="delete_review" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <DeleteButton type="submit" size="sm" title="Delete" />
                </Form>
              </div>
            ))}
            {reviews.length === 0 ? <p className="text-sm text-gray-500">No reviews yet</p> : null}
          </div>
        </Card>
      </div>
    </>
  );
}
