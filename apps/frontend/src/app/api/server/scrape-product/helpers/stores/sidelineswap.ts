import { emptyProduct, type ProductData } from "../types";

type ProductJsonLd = {
  name?: unknown;
  description?: unknown;
  image?: unknown;
  offers?: {
    price?: unknown;
    priceCurrency?: unknown;
  };
};

export function scrapeSidelineSwap(html: string): ProductData {
  const match = html.match(/"children":"((?:\\.|[^"\\])*)","id":"structured-data-\d+"/);
  if (!match) return emptyProduct();

  try {
    const encodedJsonLd = JSON.parse(`"${match[1]}"`) as string;
    const product = JSON.parse(encodedJsonLd) as ProductJsonLd;
    const offer = product.offers;

    return {
      ...emptyProduct(),
      title: typeof product.name === "string" ? product.name : null,
      description: typeof product.description === "string" ? product.description : null,
      image: typeof product.image === "string" ? product.image : null,
      price: offer?.price == null ? null : String(offer.price),
      currency: typeof offer?.priceCurrency === "string" ? offer.priceCurrency : null,
    };
  } catch {
    return emptyProduct();
  }
}
