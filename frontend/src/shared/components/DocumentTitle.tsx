const APP_NAME = "KeepItBalance";

export function DocumentTitle({ title }: { title?: string }) {
  return <title>{title ? `${title} · ${APP_NAME}` : APP_NAME}</title>;
}
