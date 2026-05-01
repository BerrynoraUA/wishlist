export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initial: string;
  bg: string;
  color: string;
};

type TranslateFn = (message: string, options?: Record<string, unknown>) => string;

/**
 * Build the rotating testimonial list used on the login / register pages.
 */
export function getLoginTestimonials(t: TranslateFn): Testimonial[] {
  return [
    {
      quote: t('"Wishlane completely changed how our family does holidays!"', {
        $id: "login.testimonial.quote.1",
      }),
      name: t("Sarah Johnson", { $id: "login.testimonial.name.1" }),
      role: t("Mom of 3", { $id: "login.testimonial.role.1" }),
      initial: "S",
      bg: "#fde7f3",
      color: "#c0267e",
    },
    {
      quote: t('"I never forget a birthday gift anymore. This app is a lifesaver!"', {
        $id: "login.testimonial.quote.2",
      }),
      name: t("Marcus Chen", { $id: "login.testimonial.name.2" }),
      role: t("Gift enthusiast", { $id: "login.testimonial.role.2" }),
      initial: "M",
      bg: "#e0f2fe",
      color: "#2563eb",
    },
    {
      quote: t('"Sharing wishlists with friends made group gifting so much easier."', {
        $id: "login.testimonial.quote.3",
      }),
      name: t("Emily Park", { $id: "login.testimonial.name.3" }),
      role: t("Event planner", { $id: "login.testimonial.role.3" }),
      initial: "E",
      bg: "#fef3c7",
      color: "#d97706",
    },
  ];
}
