export const normalizeAssetUrl = (value: string, requestUrl: string) => {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (!value.startsWith("/assets/")) return value;

  // Keep app-relative asset paths so /assets/* is served by app/routes/assets.$.tsx
  // in both local preview/dev and production.
  void requestUrl;
  return value;
};
