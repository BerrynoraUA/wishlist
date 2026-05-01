import type { Testimonial } from "../login/helpers";

type TranslateFn = (message: string, options?: Record<string, unknown>) => string;

/**
 * Testimonials shown on the register page (different from the login page).
 */
export function getRegisterTestimonials(t: TranslateFn): Testimonial[] {
  return [
    {
      quote: t(
        '"The link scraping feature is magic. Just paste a URL and everything fills in automatically!"',
        { $id: "register.testimonial.quote.1" },
      ),
      name: t("Jake Rivera", { $id: "register.testimonial.name.1" }),
      role: t("Tech Enthusiast", { $id: "register.testimonial.role.1" }),
      initial: "J",
      bg: "#e0f2fe",
      color: "#2563eb",
    },
    {
      quote: t('"Setting up my first wishlist took less than a minute. So intuitive!"', {
        $id: "register.testimonial.quote.2",
      }),
      name: t("Olivia Kim", { $id: "register.testimonial.name.2" }),
      role: t("Design Student", { $id: "register.testimonial.role.2" }),
      initial: "O",
      bg: "#fde7f3",
      color: "#c0267e",
    },
    {
      quote: t('"Perfect for coordinating gifts with family across different countries."', {
        $id: "register.testimonial.quote.3",
      }),
      name: t("Daniel Müller", { $id: "register.testimonial.name.3" }),
      role: t("Frequent traveler", { $id: "register.testimonial.role.3" }),
      initial: "D",
      bg: "#f0fdf4",
      color: "#16a34a",
    },
  ];
}
