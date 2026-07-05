import { icons, type NavItem } from "@/components/Shell";

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: icons.home },
  { href: "/admin/appointments", label: "Appointments", icon: icons.calendar },
  { href: "/admin/doctors", label: "Doctors", icon: icons.doctors },
  { href: "/admin/services", label: "Services", icon: icons.sparkle },
  { href: "/admin/products", label: "Products", icon: icons.box },
  { href: "/admin/finance", label: "Finance", icon: icons.money },
  { href: "/admin/inbox", label: "Inbox", icon: icons.inbox },
  { href: "/admin/audit", label: "Audit log", icon: icons.shield },
];
