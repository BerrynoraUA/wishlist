import createMetascraper from "metascraper";
import metascraperTitle from "metascraper-title";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";

// One shared instance, reused across requests.
const metascraper = createMetascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
]);

export interface MetadataResult {
  title: string | null;
  description: string | null;
  image: string | null;
}

/**
 * Metadata-first extraction: reads OpenGraph / <meta> (with metascraper's
 * built-in fallbacks) for the descriptive fields. This is the ban-resistant
 * path — it only reads what a link-preview bot reads.
 *
 * It deliberately does NOT extract price: metascraper has no price rule, so
 * price/currency/discount stay with the JSON-LD and store extractors.
 */
export async function extractMetadata(html: string, url: string): Promise<MetadataResult> {
  try {
    const meta = await metascraper({ html, url });
    return {
      title: meta.title?.trim() || null,
      description: meta.description?.trim() || null,
      image: meta.image?.trim() || null,
    };
  } catch (error) {
    console.error("metascraper failed:", error);
    return { title: null, description: null, image: null };
  }
}
