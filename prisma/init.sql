-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'REQUIRES_ACTION');

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('NOT_SELLER', 'PENDING', 'ACTIVE', 'RESTRICTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SellerTier" AS ENUM ('NEW', 'VERIFIED', 'TRUSTED', 'POWER_SELLER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'RESERVED', 'SOLD', 'REMOVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShippingType" AS ENUM ('SHIPPING', 'LOCAL_PICKUP', 'BOTH');

-- CreateEnum
CREATE TYPE "ClubType" AS ENUM ('DRIVER', 'FAIRWAY_WOOD', 'HYBRID', 'IRON_SET', 'WEDGE', 'PUTTER', 'COMPLETE_SET', 'OTHER');

-- CreateEnum
CREATE TYPE "Handedness" AS ENUM ('RIGHT', 'LEFT', 'BOTH');

-- CreateEnum
CREATE TYPE "ShaftFlex" AS ENUM ('LADIES', 'SENIOR', 'REGULAR', 'STIFF', 'EXTRA_STIFF', 'OTHER');

-- CreateEnum
CREATE TYPE "ShaftMaterial" AS ENUM ('STEEL', 'GRAPHITE', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingImageStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'AWAITING_PAYMENT', 'PAID', 'SELLER_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('NOT_SHIPPED', 'LABEL_CREATED', 'IN_TRANSIT', 'DELIVERED', 'LOST', 'RETURNED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('ITEM_NOT_RECEIVED', 'ITEM_NOT_AS_DESCRIBED', 'DAMAGED', 'COUNTERFEIT', 'WRONG_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'NEEDS_SELLER_RESPONSE', 'NEEDS_BUYER_RESPONSE', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'REFUNDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeEvidenceType" AS ENUM ('IMAGE', 'TEXT', 'TRACKING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ListingCategory" AS ENUM ('DRIVERS', 'FAIRWAY_WOODS', 'HYBRIDS', 'IRONS', 'WEDGES', 'PUTTERS', 'COMPLETE_SETS', 'BAGS', 'RANGEFINDERS', 'APPAREL', 'SHOES', 'BALLS', 'ACCESSORIES', 'TRAINING_AIDS', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('NEW', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'FOR_PARTS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "phone" TEXT,
    "phoneVerified" TIMESTAMP(3),
    "name" TEXT,
    "username" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "identityStatus" "IdentityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "sellerStatus" "SellerStatus" NOT NULL DEFAULT 'NOT_SELLER',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "locationCity" TEXT,
    "locationState" TEXT,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalListings" INTEGER NOT NULL DEFAULT 0,
    "stripeConnectedAccountId" TEXT,
    "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "sellerTier" "SellerTier" NOT NULL DEFAULT 'NEW',
    "returnPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "phone" TEXT,
    "isDefaultShipping" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultReturn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ListingCategory" NOT NULL,
    "subcategory" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "condition" "ListingCondition" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "originalPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "allowOffers" BOOLEAN NOT NULL DEFAULT true,
    "minOfferCents" INTEGER,
    "shippingType" "ShippingType" NOT NULL DEFAULT 'SHIPPING',
    "shippingPriceCents" INTEGER NOT NULL DEFAULT 0,
    "locationCity" TEXT,
    "locationState" TEXT,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "watchCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "searchText" TEXT,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfClubSpecs" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "clubType" "ClubType",
    "handedness" "Handedness",
    "shaftFlex" "ShaftFlex",
    "shaftMaterial" "ShaftMaterial",
    "loft" TEXT,
    "length" TEXT,
    "lieAngle" TEXT,
    "setComposition" TEXT,
    "gripCondition" TEXT,
    "headcoverIncluded" BOOLEAN NOT NULL DEFAULT false,
    "size" TEXT,
    "notes" TEXT,

    CONSTRAINT "GolfClubSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "publicUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "status" "ListingImageStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "parentOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "offerId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "itemPriceCents" INTEGER NOT NULL,
    "shippingPriceCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "platformFeeCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "sellerProceedsCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "stripeRefundId" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "autoCompleteAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "shippingLabelUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'NOT_SHIPPED',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "adminNotes" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeEvidence" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evidenceType" "DisputeEvidenceType" NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "listingId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetListingId" TEXT,
    "targetOrderId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserVerification_userId_key" ON "UserVerification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_stripeConnectedAccountId_key" ON "SellerProfile"("stripeConnectedAccountId");

-- CreateIndex
CREATE INDEX "SellerProfile_sellerTier_idx" ON "SellerProfile"("sellerTier");

-- CreateIndex
CREATE INDEX "SellerProfile_onboardingComplete_idx" ON "SellerProfile"("onboardingComplete");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_category_idx" ON "Listing"("category");

-- CreateIndex
CREATE INDEX "Listing_brand_idx" ON "Listing"("brand");

-- CreateIndex
CREATE INDEX "Listing_priceCents_idx" ON "Listing"("priceCents");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Listing_createdAt_idx" ON "Listing"("createdAt");

-- CreateIndex
CREATE INDEX "Listing_status_category_idx" ON "Listing"("status", "category");

-- CreateIndex
CREATE INDEX "Listing_status_priceCents_idx" ON "Listing"("status", "priceCents");

-- CreateIndex
CREATE UNIQUE INDEX "GolfClubSpecs_listingId_key" ON "GolfClubSpecs"("listingId");

-- CreateIndex
CREATE INDEX "GolfClubSpecs_clubType_idx" ON "GolfClubSpecs"("clubType");

-- CreateIndex
CREATE INDEX "GolfClubSpecs_handedness_idx" ON "GolfClubSpecs"("handedness");

-- CreateIndex
CREATE INDEX "GolfClubSpecs_shaftFlex_idx" ON "GolfClubSpecs"("shaftFlex");

-- CreateIndex
CREATE UNIQUE INDEX "ListingImage_s3Key_key" ON "ListingImage"("s3Key");

-- CreateIndex
CREATE INDEX "ListingImage_listingId_idx" ON "ListingImage"("listingId");

-- CreateIndex
CREATE INDEX "ListingImage_status_idx" ON "ListingImage"("status");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_listingId_idx" ON "WatchlistItem"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_listingId_key" ON "WatchlistItem"("userId", "listingId");

-- CreateIndex
CREATE INDEX "Offer_listingId_idx" ON "Offer"("listingId");

-- CreateIndex
CREATE INDEX "Offer_buyerId_idx" ON "Offer"("buyerId");

-- CreateIndex
CREATE INDEX "Offer_sellerId_idx" ON "Offer"("sellerId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- CreateIndex
CREATE INDEX "Order_sellerId_idx" ON "Order"("sellerId");

-- CreateIndex
CREATE INDEX "Order_listingId_idx" ON "Order"("listingId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_stripeEventId_key" ON "PaymentEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");

-- CreateIndex
CREATE INDEX "PaymentEvent_type_idx" ON "PaymentEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "MessageThread_buyerId_idx" ON "MessageThread"("buyerId");

-- CreateIndex
CREATE INDEX "MessageThread_sellerId_idx" ON "MessageThread"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThread_listingId_buyerId_sellerId_key" ON "MessageThread"("listingId", "buyerId", "sellerId");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Review_revieweeId_idx" ON "Review"("revieweeId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_reviewerId_key" ON "Review"("orderId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_orderId_key" ON "Dispute"("orderId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "DisputeEvidence_disputeId_idx" ON "DisputeEvidence"("disputeId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAction_adminUserId_idx" ON "AdminAction"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");

-- CreateIndex
CREATE INDEX "PhoneOtp_userId_idx" ON "PhoneOtp"("userId");

-- AddForeignKey
ALTER TABLE "UserVerification" ADD CONSTRAINT "UserVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfClubSpecs" ADD CONSTRAINT "GolfClubSpecs_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_parentOfferId_fkey" FOREIGN KEY ("parentOfferId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneOtp" ADD CONSTRAINT "PhoneOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
