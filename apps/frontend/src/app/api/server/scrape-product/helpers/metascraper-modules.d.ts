// metascraper and its rule bundles ship no TypeScript types. Declare the small
// surface we use so the scraper stays type-checked.
declare module "metascraper" {
  export type MetascraperRule = unknown;
  export type Metascraper = (input: {
    html: string;
    url: string;
  }) => Promise<Record<string, string | undefined>>;
  export default function createMetascraper(rules: MetascraperRule[]): Metascraper;
}

declare module "metascraper-title" {
  export default function metascraperTitle(): unknown;
}

declare module "metascraper-description" {
  export default function metascraperDescription(): unknown;
}

declare module "metascraper-image" {
  export default function metascraperImage(): unknown;
}
