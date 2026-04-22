This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Typography

All text uses the unified scale defined in [`src/styles/typography.scss`](src/styles/typography.scss). Two ways to consume it:

1. **Primitives** — `<Heading>`, `<Text>`, `<Label>`, `<Eyebrow>` from `@/components/ui/Typography`. Prefer these in `.tsx`.
2. **Tokens / mixins** — `var(--fs-*)`, `var(--fw-*)`, `var(--lh-*)`, or the SCSS mixins `t-title`, `t-subtitle`, `t-body`, `t-label`, `t-caption`, `t-eyebrow`. Use in `.module.scss` when primitives don't fit (e.g. styling a third-party element or pseudo-content).

**Do not** declare raw `font-size: \d+px` or `font-weight: \d{3}` in `.module.scss`. Exceptions: marketing/landing display sizes (`app/(landing)/*`, `DiscoverHeader.module.scss`).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
