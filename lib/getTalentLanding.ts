export async function getTalentLanding(userId?: string): Promise<string> {
  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await fetch(`/api/talent/landing${query}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return "/talent/dashboard";

    const data = await res.json().catch(() => ({})) as { destination?: string };
    if (typeof data.destination === "string" && data.destination.startsWith("/")) {
      return data.destination;
    }
  } catch {
    // Fall back to the default dashboard if the helper route is unavailable.
  }

  return "/talent/dashboard";
}
