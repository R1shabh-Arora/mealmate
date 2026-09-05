import DayDetailClient from "./day-client";

/** Monday to Sunday, prerendered for the static export. */
export function generateStaticParams() {
  return Array.from({ length: 7 }, (_, day) => ({ id: String(day) }));
}

export default function DayDetailPage() {
  return <DayDetailClient />;
}
