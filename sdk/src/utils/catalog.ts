/** Parse JSON stored in on-chain Metadata.value for catalog display. */
export function catalogFromMetadata(value: string): {
  name: string;
  description: string;
  images: string[];
  category: string;
} {
  try {
    const o = JSON.parse(value) as Record<string, unknown>;
    const images = o.images;
    return {
      name: String(o.name ?? ""),
      description: String(o.description ?? ""),
      category: String(o.category ?? ""),
      images: Array.isArray(images)
        ? (images as unknown[]).map((x) => String(x))
        : [],
    };
  } catch {
    return { name: "", description: "", images: [], category: "" };
  }
}
