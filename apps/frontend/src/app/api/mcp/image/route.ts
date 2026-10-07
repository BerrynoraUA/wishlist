import { proxiedImage } from "@/mcp/image-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const image = await proxiedImage(params.get("url") ?? "", params.get("sig") ?? "").catch(
    () => null,
  );
  if (!image) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      // Signed URLs never change meaning, so the CDN can keep them.
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
