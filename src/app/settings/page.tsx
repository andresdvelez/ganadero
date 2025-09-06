export default function SettingsIndex() {
  if (typeof window !== "undefined") {
    window.location.replace("/settings/billing");
  }
  return null;
}


