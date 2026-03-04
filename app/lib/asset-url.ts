const WORKERS_ASSET_ORIGIN = "https://react-router-app.ilogush.workers.dev";

export const normalizeAssetUrl = (value: string, requestUrl: string) => {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (!value.startsWith("/assets/")) return value;

  const url = new URL(requestUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!isLocal) return value;

  return `${WORKERS_ASSET_ORIGIN}${value}`;
};
