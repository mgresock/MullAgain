import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "MullAgain — Buy & sell used golf gear",
  description:
    "MullAgain is the trusted marketplace for second-hand golf clubs, bags, rangefinders, apparel and more. Buyer protection, verified sellers, secure payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <footer className="mt-20 border-t border-[var(--border)] bg-fairway-50">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-10 text-sm text-muted sm:flex-row sm:justify-between">
              <p>© {new Date().getFullYear()} MullAgain. Play it again.</p>
              <div className="flex gap-4">
                <a href="/buyer-protection" className="hover:text-fairway-700">
                  Buyer protection
                </a>
                <a href="/about" className="hover:text-fairway-700">
                  About
                </a>
                <a href="/sell" className="hover:text-fairway-700">
                  Start selling
                </a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
