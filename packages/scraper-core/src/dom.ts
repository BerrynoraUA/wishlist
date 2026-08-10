/**
 * Replacement for the `lxml` layer of the Python scraper. Runs against a real
 * DOM (`WebView` page or `DOMParser` document), so every XPath from
 * `app/extractors/**` ports over unchanged.
 */
import { cleanText } from "./normalization";

/** lxml returns plain strings for attribute/text steps; we do the same. */
export type XPathValue = string | Element;

export function parseHtml(htmlText: string): Document {
  const parser = new DOMParser();
  try {
    return parser.parseFromString(htmlText || "<html></html>", "text/html");
  } catch {
    return parser.parseFromString("<html></html>", "text/html");
  }
}

function ownerDocument(context: Document | Element): Document {
  return context.nodeType === 9 ? (context as Document) : (context as Element).ownerDocument!;
}

export function xpathAll(
  context: Document | Element,
  expression: string,
  limit = Number.POSITIVE_INFINITY,
): XPathValue[] {
  const document = ownerDocument(context);
  if (!document || typeof document.evaluate !== "function") return [];

  let result: XPathResult;
  try {
    result = document.evaluate(expression, context, null, 0 /* ANY_TYPE */, null);
  } catch {
    return [];
  }

  // String / number / boolean expressions (e.g. `string(//h1)`, `count(...)`).
  if (result.resultType === 2 /* STRING_TYPE */) {
    return result.stringValue ? [result.stringValue] : [];
  }
  if (result.resultType === 1 /* NUMBER_TYPE */) {
    return [String(result.numberValue)];
  }
  if (result.resultType === 3 /* BOOLEAN_TYPE */) {
    return [String(result.booleanValue)];
  }

  const values: XPathValue[] = [];
  let node = result.iterateNext();
  while (node && values.length < limit) {
    // Attribute and text steps behave like lxml's "smart strings".
    if (
      node.nodeType === 2 /* ATTRIBUTE_NODE */ ||
      node.nodeType === 3 /* TEXT_NODE */ ||
      node.nodeType === 4 /* CDATA_SECTION_NODE */
    ) {
      const value = node.nodeValue ?? "";
      if (value) values.push(value);
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      values.push(node as Element);
    }
    node = result.iterateNext();
  }
  return values;
}

export function xpathFirst(context: Document | Element, expression: string): XPathValue | null {
  return xpathAll(context, expression, 1)[0] ?? null;
}

function valueText(value: XPathValue | null): string | null {
  if (value === null) return null;
  return cleanText(typeof value === "string" ? value : value.textContent);
}

function valueAttribute(value: XPathValue | null, attribute: string): string | null {
  if (value === null || typeof value === "string") return null;
  return cleanText(value.getAttribute(attribute));
}

/** Port of `generic.py::_first_text`. */
export function firstText(
  context: Document | Element,
  expressions: readonly string[],
): string | null {
  for (const expression of expressions) {
    const value = xpathFirst(context, expression);
    const text = valueText(value);
    if (text) return text;
  }
  return null;
}

/** Port of `generic.py::_first_attribute`. */
export function firstAttribute(
  context: Document | Element,
  expressions: readonly string[],
  attributes: readonly string[],
): string | null {
  for (const expression of expressions) {
    const value = xpathFirst(context, expression);
    if (value === null) continue;
    for (const attribute of attributes) {
      const attributeValue = valueAttribute(value, attribute);
      if (attributeValue) return attributeValue;
    }
  }
  return null;
}

/** Port of `generic.py::_first_attribute_or_text`. */
export function firstAttributeOrText(
  context: Document | Element,
  expressions: readonly string[],
  ...attributes: string[]
): string | null {
  return firstAttribute(context, expressions, attributes) ?? firstText(context, expressions);
}

/**
 * Port of `registry.py::_select` — an attribute wins over text content, and
 * a string XPath result is taken verbatim.
 */
export function selectValue(
  context: Document | Element,
  expressions: readonly string[],
  attributes: readonly string[],
): string | null {
  for (const expression of expressions) {
    const node = xpathFirst(context, expression);
    if (node === null) continue;
    if (typeof node === "string") {
      const text = cleanText(node);
      if (text) return text;
      continue;
    }
    for (const attribute of attributes) {
      const value = cleanText(node.getAttribute(attribute));
      if (value) return value;
    }
    const text = cleanText(node.textContent);
    if (text) return text;
  }
  return null;
}

/** Escapes a literal for embedding into an XPath 1.0 expression. */
export function xpathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat('${value.split("'").join("',\"'\",'")}')`;
}

/** Text content of every `<script>` in the document, including JSON-LD. */
export function scriptTexts(context: Document | Element): string[] {
  const scripts = (context as Document | Element).querySelectorAll?.("script") ?? [];
  const values: string[] = [];
  scripts.forEach((script) => {
    const text = script.textContent;
    if (text && text.trim()) values.push(text);
  });
  return values;
}
