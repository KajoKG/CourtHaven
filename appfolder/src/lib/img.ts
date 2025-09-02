// Pomoć: automatski dodaj ?width=...&quality=85 za Supabase Storage fotke
export function fitImg(url: string | null | undefined, width: number): string {
  if (!url) return "/images/courts/placeholder.jpg";
  try {
    const u = new URL(url, typeof window === "undefined" ? "http://local" : window.location.origin);
    // Supabase Storage prepoznaje ove queryje
    if (u.hostname.endsWith(".supabase.co")) {
      u.searchParams.set("width", String(width));
      u.searchParams.set("quality", "85");
      return u.toString();
    }
    return url;
  } catch {
    return url!;
  }
}
