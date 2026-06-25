/* eslint-disable no-console */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

function img(seed: string) {
  // Deterministic placeholder images (works without S3 configured).
  return `https://picsum.photos/seed/${seed}/800/800`;
}

async function main() {
  console.log("Seeding MullAgain…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const now = new Date();

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@mullagain.test" },
    update: {},
    create: {
      email: "admin@mullagain.test",
      name: "Ada Admin",
      username: "admin",
      passwordHash,
      role: "SUPER_ADMIN",
      emailVerified: now,
      phoneVerified: now,
      verification: { create: { emailVerifiedAt: now, phoneVerifiedAt: now, identityStatus: "VERIFIED" } },
    },
  });

  const verifiedSeller = await prisma.user.upsert({
    where: { email: "seller@mullagain.test" },
    update: {},
    create: {
      email: "seller@mullagain.test",
      name: "Vijay Verified",
      username: "vijay_clubs",
      passwordHash,
      emailVerified: now,
      phoneVerified: now,
      verification: { create: { emailVerifiedAt: now, phoneVerifiedAt: now, sellerStatus: "ACTIVE", identityStatus: "VERIFIED" } },
      sellerProfile: {
        create: {
          displayName: "Vijay's Pro Shop",
          bio: "PGA pro reselling tour-quality gear. Fast shipping, honest grading.",
          locationCity: "Scottsdale",
          locationState: "AZ",
          stripeConnectedAccountId: "acct_seed_verified",
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
          onboardingComplete: true,
          sellerTier: "TRUSTED",
          totalSales: 42,
          averageRating: 4.9,
          ratingCount: 38,
        },
      },
    },
    include: { sellerProfile: true },
  });

  const newSeller = await prisma.user.upsert({
    where: { email: "newseller@mullagain.test" },
    update: {},
    create: {
      email: "newseller@mullagain.test",
      name: "Nina Newbie",
      username: "nina_golf",
      passwordHash,
      emailVerified: now,
      phoneVerified: now,
      verification: { create: { emailVerifiedAt: now, phoneVerifiedAt: now, sellerStatus: "ACTIVE" } },
      sellerProfile: {
        create: {
          displayName: "Nina's Garage Clubs",
          locationCity: "Austin",
          locationState: "TX",
          stripeConnectedAccountId: "acct_seed_new",
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
          onboardingComplete: true,
          sellerTier: "NEW",
        },
      },
    },
    include: { sellerProfile: true },
  });

  await prisma.user.upsert({
    where: { email: "suspended@mullagain.test" },
    update: {},
    create: {
      email: "suspended@mullagain.test",
      name: "Sam Suspended",
      username: "sam_x",
      passwordHash,
      emailVerified: now,
      accountStatus: "SUSPENDED",
      verification: { create: { emailVerifiedAt: now, sellerStatus: "RESTRICTED", riskLevel: "HIGH" } },
    },
  });

  await prisma.user.upsert({
    where: { email: "buyer@mullagain.test" },
    update: {},
    create: {
      email: "buyer@mullagain.test",
      name: "Bianca Buyer",
      username: "bianca",
      passwordHash,
      emailVerified: now,
      phoneVerified: now,
      verification: { create: { emailVerifiedAt: now, phoneVerifiedAt: now } },
      addresses: {
        create: {
          name: "Bianca Buyer",
          line1: "100 Fairway Dr",
          city: "Denver",
          state: "CO",
          postalCode: "80202",
          country: "US",
          isDefaultShipping: true,
        },
      },
    },
  });

  // ── Listings ────────────────────────────────────────────────────────────────
  type Seed = {
    seller: typeof verifiedSeller;
    title: string;
    category: Prisma.ListingCreateInput["category"];
    brand: string;
    model?: string;
    condition: Prisma.ListingCreateInput["condition"];
    priceCents: number;
    originalPriceCents?: number;
    description: string;
    status?: Prisma.ListingCreateInput["status"];
    specs?: Prisma.GolfClubSpecsCreateWithoutListingInput;
    imgSeeds: string[];
  };

  const listings: Seed[] = [
    {
      seller: verifiedSeller,
      title: "TaylorMade Stealth Driver 10.5° — Excellent Condition",
      category: "DRIVERS",
      brand: "TaylorMade",
      model: "Stealth",
      condition: "EXCELLENT",
      priceCents: 28900,
      originalPriceCents: 59999,
      description:
        "TaylorMade Stealth driver with 60X Carbon Twist Face. Minor sky marks, plays like new. Includes headcover and adjustable wrench. Stiff flex Ventus Red shaft.",
      specs: { clubType: "DRIVER", handedness: "RIGHT", shaftFlex: "STIFF", shaftMaterial: "GRAPHITE", loft: "10.5°", headcoverIncluded: true },
      imgSeeds: ["stealth1", "stealth2", "stealth3"],
    },
    {
      seller: verifiedSeller,
      title: "Titleist Vokey SM9 Wedge 56° — Like New",
      category: "WEDGES",
      brand: "Titleist",
      model: "Vokey SM9",
      condition: "LIKE_NEW",
      priceCents: 11900,
      originalPriceCents: 18900,
      description:
        "Vokey SM9 56.10 S-grind. Crisp grooves, barely used. Tour Chrome finish. Perfect for full shots and bunker play. Right handed, stiff steel.",
      specs: { clubType: "WEDGE", handedness: "RIGHT", shaftFlex: "STIFF", shaftMaterial: "STEEL", loft: "56°", length: '35.25"' },
      imgSeeds: ["vokey1", "vokey2", "vokey3"],
    },
    {
      seller: verifiedSeller,
      title: "Scotty Cameron Newport 2 Putter 34\" — Excellent",
      category: "PUTTERS",
      brand: "Scotty Cameron",
      model: "Newport 2",
      condition: "EXCELLENT",
      priceCents: 32500,
      originalPriceCents: 44900,
      description:
        "Iconic Scotty Cameron Newport 2 blade putter. 34 inches, right handed. Includes original headcover. Light bag chatter, true roll.",
      specs: { clubType: "PUTTER", handedness: "RIGHT", length: '34"', headcoverIncluded: true },
      imgSeeds: ["scotty1", "scotty2", "scotty3"],
    },
    {
      seller: verifiedSeller,
      title: "Ping Hoofer Stand Bag — Good Condition",
      category: "BAGS",
      brand: "Ping",
      model: "Hoofer",
      condition: "GOOD",
      priceCents: 9900,
      description:
        "Ping Hoofer carry stand bag. 4-way top, dual straps, plenty of storage. Some wear on the base but fully functional. Black/grey.",
      imgSeeds: ["hoofer1", "hoofer2", "hoofer3"],
    },
    {
      seller: verifiedSeller,
      title: "Garmin Approach Z82 Rangefinder with GPS",
      category: "RANGEFINDERS",
      brand: "Garmin",
      model: "Approach Z82",
      condition: "LIKE_NEW",
      priceCents: 39900,
      originalPriceCents: 59999,
      description:
        "Garmin Approach Z82 laser rangefinder with built-in GPS and course maps. Accurate to within 10 inches. Includes case and charging cable.",
      imgSeeds: ["garmin1", "garmin2", "garmin3"],
    },
    {
      seller: newSeller,
      title: "Mizuno JPX 921 Iron Set 5-PW — Good Condition",
      category: "IRONS",
      brand: "Mizuno",
      model: "JPX 921 Forged",
      condition: "GOOD",
      priceCents: 49900,
      originalPriceCents: 89999,
      // NEW seller + high value → demonstrates the admin review queue.
      status: "PENDING_REVIEW",
      description:
        "Mizuno JPX 921 Forged irons, 5 through PW (6 clubs). Buttery forged feel. Regular flex steel. Normal wear, fresh grips installed last month.",
      specs: { clubType: "IRON_SET", handedness: "RIGHT", shaftFlex: "REGULAR", shaftMaterial: "STEEL", setComposition: "5-PW (6 clubs)" },
      imgSeeds: ["mizuno1", "mizuno2", "mizuno3"],
    },
    {
      seller: newSeller,
      title: "FootJoy Pro SL Golf Shoes — Size 10.5 — Excellent",
      category: "SHOES",
      brand: "FootJoy",
      model: "Pro SL",
      condition: "EXCELLENT",
      priceCents: 6500,
      originalPriceCents: 16999,
      description:
        "FootJoy Pro SL spikeless golf shoes, men's size 10.5, white. Worn a handful of rounds. Excellent grip and comfort.",
      specs: { size: "10.5 US" },
      imgSeeds: ["fj1", "fj2", "fj3"],
    },
    {
      seller: newSeller,
      title: "Callaway Chrome Soft Golf Balls — 3 Dozen (New)",
      category: "BALLS",
      brand: "Callaway",
      model: "Chrome Soft",
      condition: "NEW",
      priceCents: 9500,
      originalPriceCents: 14999,
      description:
        "Three dozen brand-new Callaway Chrome Soft golf balls. White, 2024 model. Sealed boxes. Tour-level distance with soft feel.",
      imgSeeds: ["chrome1", "chrome2", "chrome3"],
    },
  ];

  // Clear existing seeded listings to keep the seed idempotent.
  await prisma.listing.deleteMany({ where: { slug: { startsWith: "seed-" } } });

  let i = 0;
  for (const l of listings) {
    i++;
    const slug = `seed-${l.brand.toLowerCase().replace(/\s+/g, "-")}-${i}`;
    const status = l.status ?? "ACTIVE";
    await prisma.listing.create({
      data: {
        slug,
        sellerId: l.seller.id,
        title: l.title,
        description: l.description,
        category: l.category,
        brand: l.brand,
        model: l.model,
        condition: l.condition,
        priceCents: l.priceCents,
        originalPriceCents: l.originalPriceCents,
        status,
        publishedAt: status === "ACTIVE" ? now : null,
        shippingPriceCents: 1500,
        locationCity: l.seller.sellerProfile?.locationCity,
        locationState: l.seller.sellerProfile?.locationState,
        searchText: `${l.title} ${l.brand} ${l.model ?? ""} ${l.category} ${l.description}`.slice(0, 2000),
        golfSpecs: l.specs ? { create: l.specs } : undefined,
        images: {
          create: l.imgSeeds.map((s, idx) => ({
            s3Key: `listings/${slug}/${s}.jpg`,
            publicUrl: img(s),
            sortOrder: idx,
            status: "ACTIVE",
            uploadedByUserId: l.seller.id,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${listings.length} listings.`);
  console.log("\nAccounts (password for all): " + PASSWORD);
  console.log("  admin@mullagain.test       — SUPER_ADMIN");
  console.log("  seller@mullagain.test      — verified TRUSTED seller");
  console.log("  newseller@mullagain.test   — NEW seller (limited)");
  console.log("  suspended@mullagain.test   — suspended account");
  console.log("  buyer@mullagain.test       — buyer with shipping address");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
