import { icons, type NavItem } from "@/components/Shell";

export const accountNav: NavItem[] = [
  { href: "/account", label: "My appointments", icon: icons.calendar },
  { href: "/account/book", label: "Book a visit", icon: icons.plus },
  { href: "/account/profile", label: "My profile", icon: icons.user },
];
