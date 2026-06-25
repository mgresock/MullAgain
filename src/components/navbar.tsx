import Link from "next/link";
import { Flag, Search, Heart, LayoutDashboard } from "lucide-react";
import { getCurrentUser } from "@/lib/authz";
import { isAdmin } from "@/lib/authz";
import { Button } from "./ui/button";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-fairway-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-fairway-600 text-white">
            <Flag className="h-4 w-4" />
          </span>
          <span className="text-lg tracking-tight">MullAgain</span>
        </Link>

        <Link
          href="/marketplace"
          className="hidden items-center gap-2 rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-muted hover:border-fairway-400 md:flex"
        >
          <Search className="h-4 w-4" />
          Search clubs, bags, rangefinders…
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/marketplace" className="hidden px-3 py-2 hover:text-fairway-700 sm:block">
            Browse
          </Link>
          <Link href="/sell" className="hidden px-3 py-2 hover:text-fairway-700 sm:block">
            Sell
          </Link>
          {user ? (
            <>
              <Link href="/dashboard/watchlist" aria-label="Watchlist">
                <Button variant="ghost" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" aria-label="Dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
              {isAdmin(user) && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/seller/dashboard">
                <Button size="sm">Seller hub</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
