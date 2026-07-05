/**
 * Idempotent seed: first admin account, the clinic's doctors with their
 * public schedules, the treatment menu from the marketing site, starter
 * product catalogue and default settings.
 *
 * Prices, salaries and commission percentages are starter values meant
 * to be edited from the admin dashboard; they are not published claims.
 */
import { PrismaClient, CategoryKind, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EGP = (pounds: number) => Math.round(pounds * 100);

// Clinic hours: Sat–Thu 10:00–23:00, Friday 12:00–22:00 (0 = Sunday)
const FULL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  startMinute: weekday === 5 ? 12 * 60 : 10 * 60,
  endMinute: weekday === 5 ? 22 * 60 : 23 * 60,
}));

const DOCTORS = [
  {
    slug: "dr-ghada",
    name: "Dr. Ghada",
    specialty: "Health, Nutrition & Body Wellness",
    bio: "Guides the wellness side of Soie: nutrition, weight management and the body treatments that make aesthetic results last.",
    photoUrl: "/assets/images/doctor-dr-ghada.jpg",
    instagramUrl: "https://www.instagram.com/drghada.health",
    sortOrder: 1,
  },
  {
    slug: "dr-ghada-metwally",
    name: "Dr. Ghada Metwally",
    specialty: "Medical Facials & Skin Treatments",
    bio: "Medical facials, HydraFacial, Dermapen, OxyGeneo, peels and laser skin treatments in New Cairo.",
    photoUrl: "/assets/images/doctor-dr-ghada-metwally.jpg",
    instagramUrl: "https://www.instagram.com/dr_ghada_metwally_facials",
    sortOrder: 2,
  },
  {
    slug: "dr-nada-salama",
    name: "Dr. Nada Salama",
    specialty: "Soie Clinic Medical Team",
    bio: "Part of the Soie Clinic medical team across New Cairo and Mohandseen.",
    photoUrl: "/assets/images/doctor-dr-nada-salama.jpg",
    instagramUrl: "https://www.instagram.com/dr.nadasalama",
    sortOrder: 3,
  },
];

const SERVICE_CATEGORIES = [
  { slug: "injectables", name: "Injectables" },
  { slug: "skin", name: "Skin & Facials" },
  { slug: "body", name: "Body" },
  { slug: "dental", name: "Dental" },
];

const SERVICES: Array<{
  slug: string;
  name: string;
  category: string;
  durationMin: number;
  price: number; // EGP, starter value
  description: string;
}> = [
  { slug: "botox", name: "Botox", category: "injectables", durationMin: 30, price: 3500, description: "Softens fine lines and expression wrinkles for a smooth, well rested look that is never frozen." },
  { slug: "dermal-filler", name: "Dermal Filler", category: "injectables", durationMin: 45, price: 4500, description: "Restores volume and contour to lips, cheeks, jawline and under-eyes with balanced precision." },
  { slug: "skin-boosters", name: "Skin Boosters", category: "injectables", durationMin: 45, price: 3000, description: "Micro-injections of hydrating actives that restore luminosity, bounce and lasting radiance." },
  { slug: "exosomes", name: "Exosomes", category: "injectables", durationMin: 60, price: 5000, description: "Next-generation regenerative therapy that supports skin and hair renewal at a cellular level." },
  { slug: "facial", name: "Medical Facials", category: "skin", durationMin: 60, price: 1200, description: "Bespoke facials that cleanse, nourish and rebalance the skin for an immediate, healthy glow." },
  { slug: "hydrafacial", name: "Hydrafacial", category: "skin", durationMin: 60, price: 1800, description: "Deep cleansing, gentle exfoliation and intense hydration in one signature glass-skin treatment." },
  { slug: "peeling", name: "Chemical Peeling", category: "skin", durationMin: 45, price: 1500, description: "Medical chemical peels that resurface dull skin, refine texture and even out tone." },
  { slug: "laser", name: "Laser", category: "skin", durationMin: 45, price: 1000, description: "Advanced laser for hair reduction, pigmentation and skin renewal. Smooth, even, luminous." },
  { slug: "body-contouring", name: "Body Contouring", category: "body", durationMin: 60, price: 2000, description: "Non-invasive sculpting and firming with the advanced INDIBA radiofrequency device." },
  { slug: "dentistry", name: "Dentistry", category: "dental", durationMin: 60, price: 800, description: "Aesthetic dental care for a healthy, confident smile, from whitening to full smile design." },
  { slug: "veneers", name: "Veneers", category: "dental", durationMin: 90, price: 6000, description: "Custom porcelain veneers that transform your smile with natural shape, colour and shine." },
];

const PRODUCT_CATEGORIES = [
  { slug: "cleansers", name: "Cleansers" },
  { slug: "serums", name: "Serums" },
  { slug: "spf", name: "Sun Protection" },
  { slug: "recovery", name: "Post-Treatment Care" },
];

const PRODUCTS = [
  { slug: "gentle-cleanser", name: "Gentle pH Cleanser", category: "cleansers", price: 450, stock: 24, sku: "SO-CL-001" },
  { slug: "vitamin-c-serum", name: "Vitamin C Antioxidant Serum", category: "serums", price: 950, stock: 15, sku: "SO-SE-001" },
  { slug: "ha-serum", name: "Hyaluronic Hydration Serum", category: "serums", price: 850, stock: 4, sku: "SO-SE-002" },
  { slug: "spf50", name: "Broad Spectrum SPF 50+", category: "spf", price: 600, stock: 30, sku: "SO-SP-001" },
  { slug: "recovery-balm", name: "Barrier Recovery Balm", category: "recovery", price: 700, stock: 12, sku: "SO-RC-001" },
];

async function main() {
  // ---- admin account -------------------------------------------------
  const email = process.env.SEED_ADMIN_EMAIL || "admin@soieclinic.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!Soie2026";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN },
    create: { email, passwordHash, name: "Soie Admin", role: Role.ADMIN, emailVerifiedAt: new Date() },
  });
  console.log(`[seed] admin ready: ${email}`);

  // ---- doctors + schedules -------------------------------------------
  for (const d of DOCTORS) {
    const doctor = await prisma.doctor.upsert({
      where: { slug: d.slug },
      update: { name: d.name, specialty: d.specialty, photoUrl: d.photoUrl },
      create: {
        slug: d.slug,
        name: d.name,
        specialty: d.specialty,
        bio: d.bio,
        photoUrl: d.photoUrl,
        instagramUrl: d.instagramUrl,
        sortOrder: d.sortOrder,
        monthlySalaryCents: EGP(20000),
        commissionPct: 10,
      },
    });
    for (const s of FULL_WEEK) {
      await prisma.doctorSchedule.upsert({
        where: { doctorId_weekday: { doctorId: doctor.id, weekday: s.weekday } },
        update: { startMinute: s.startMinute, endMinute: s.endMinute },
        create: { doctorId: doctor.id, ...s },
      });
    }
  }
  console.log(`[seed] ${DOCTORS.length} doctors with weekly schedules`);

  // ---- categories, services, products --------------------------------
  const catId: Record<string, string> = {};
  for (const c of SERVICE_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, kind: CategoryKind.SERVICE },
    });
    catId[c.slug] = row.id;
  }
  for (const c of PRODUCT_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, kind: CategoryKind.PRODUCT },
    });
    catId[c.slug] = row.id;
  }

  let order = 0;
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: { priceCents: EGP(s.price), durationMin: s.durationMin },
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        priceCents: EGP(s.price),
        categoryId: catId[s.category],
        sortOrder: order++,
      },
    });
  }
  console.log(`[seed] ${SERVICES.length} services`);

  // Every doctor can take every service by default; the admin refines
  // real specialisations from the dashboard.
  const doctors = await prisma.doctor.findMany({ select: { id: true } });
  const services = await prisma.service.findMany({ select: { id: true } });
  for (const doc of doctors) {
    for (const svc of services) {
      await prisma.serviceDoctor.upsert({
        where: { serviceId_doctorId: { serviceId: svc.id, doctorId: doc.id } },
        update: {},
        create: { serviceId: svc.id, doctorId: doc.id },
      });
    }
  }

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { priceCents: EGP(p.price) },
      create: {
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        priceCents: EGP(p.price),
        stockQty: p.stock,
        categoryId: catId[p.category],
      },
    });
  }
  console.log(`[seed] ${PRODUCTS.length} products`);

  // ---- settings -------------------------------------------------------
  await prisma.setting.upsert({
    where: { key: "default_commission_pct" },
    update: {},
    create: { key: "default_commission_pct", value: "10" },
  });
  await prisma.setting.upsert({
    where: { key: "slot_step_minutes" },
    update: {},
    create: { key: "slot_step_minutes", value: "30" },
  });

  console.log("[seed] done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
