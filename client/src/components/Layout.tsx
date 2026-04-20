import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gamepad2,
  Sparkles,
  Palette,
  Brush,
  Trophy,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  KeyRound,
  Lock,
  X,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "./ui/Toast";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { MinimizeOverlay } from "./MinimizeOverlay";
import { APP } from "@qmul/shared";

type AuthUser = ReturnType<typeof useAuth>["user"];

const NAV = [
  { to: "/", label: "Home", icon: Gamepad2 },
  { to: "/wordle", label: "Wordle", icon: Sparkles },
  { to: "/gacha", label: "Gacha", icon: Palette },
  { to: "/scribble", label: "Scribble", icon: PenLine },
  { to: "/whiteboard", label: "Whiteboard", icon: Brush },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

/**
 * Shell layout.
 *
 * Desktop (lg+) uses a left-hand sidebar with the brand mark, nav rail, and
 * user controls. Mobile/iframe narrow widths fall back to a horizontal nav
 * pill under a compact header so Discord's compact activity view still works.
 */
export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="h-dvh flex overflow-hidden">
      <DesktopSidebar
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onOpenAdmin={() => setAdminOpen(true)}
        onLogout={logout}
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <MobileBar
          user={user}
          theme={theme}
          onToggleTheme={toggle}
          onOpenAdmin={() => setAdminOpen(true)}
          onLogout={logout}
        />

        <main className="container py-3 md:py-4 flex-1 w-full flex flex-col min-h-0 overflow-y-auto">
          <Outlet />
        </main>

        <footer className="container py-2 text-[10px] text-muted-foreground text-center">
          {/* User asked for a "made for 10 friends" vibe without stating the number.
             "A small table, always set" implies a fixed, intimate group. */}
          <p>Built for the Queen Mary lot · a small table, always set.</p>
        </footer>
      </div>

      <AnimatePresence>
        {adminOpen && <AdminDialog onClose={() => setAdminOpen(false)} />}
      </AnimatePresence>

      <MinimizeOverlay />
    </div>
  );
}

function BrandMark({ variant = "horizontal" }: { variant?: "horizontal" | "stacked" }) {
  return (
    <div className={cn("flex", variant === "stacked" ? "flex-col items-start gap-1" : "items-center gap-2.5")}>
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/qmul-logo.png"
          alt="QM minus"
          className="h-9 w-9 rounded-full shrink-0"
        />
        <span
          className="font-display text-lg md:text-xl font-extrabold tracking-[-0.01em] flex items-baseline"
          style={{ fontVariationSettings: '"wdth" 85' }}
          aria-label={APP.LONG_NAME}
        >
          <span>QM</span>
          <span
            aria-hidden="true"
            className="text-accent"
            style={{
              fontSize: "0.65em",
              lineHeight: 1,
              marginLeft: "0.04em",
              transform: "translateY(-0.55em)",
              display: "inline-block",
            }}
          >
            −
          </span>
        </span>
      </div>
      {variant === "stacked" && (
        <span className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground pl-1">
          arcade · est. 2026
        </span>
      )}
    </div>
  );
}

function SidebarNavLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Gamepad2;
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} className="relative block">
      {({ isActive }) => (
        <span
          data-active={isActive || undefined}
          className="sidebar-link"
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2.2} />
          <span className="flex-1">{label}</span>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 -z-10 rounded-lg bg-foreground/[0.07] border border-border"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
        </span>
      )}
    </NavLink>
  );
}

function DesktopSidebar({
  user,
  theme,
  onToggleTheme,
  onOpenAdmin,
  onLogout,
}: {
  user: AuthUser;
  theme: string;
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <aside
      className="hidden lg:flex w-60 shrink-0 flex-col gap-5 px-4 py-5 border-r border-border surface-glass"
      aria-label="Primary"
    >
      <NavLink to="/" className="active:scale-[0.98] transition-transform duration-150">
        <BrandMark variant="stacked" />
      </NavLink>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <SidebarNavLink key={to} to={to} label={label} icon={Icon} end={to === "/"} />
        ))}
        {user?.is_admin && (
          <SidebarNavLink to="/admin" label="Admin" icon={ShieldCheck} />
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-border bg-foreground/5">
            {user.avatar && (
              <img
                src={user.avatar}
                alt=""
                className="h-6 w-6 rounded-full shrink-0"
              />
            )}
            <span className="truncate text-xs font-medium flex-1">{user.username}</span>
            {user.is_admin && (
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="btn-ghost flex-1 justify-start gap-2 px-2 py-1.5"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="text-xs">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          {user && (
            <>
              <button
                onClick={onOpenAdmin}
                className={cn(
                  "btn-ghost p-2",
                  user.is_admin && "text-primary",
                )}
                aria-label={user.is_admin ? "Manage admin" : "Become admin"}
                title={user.is_admin ? "Admin active" : "Become admin"}
              >
                {user.is_admin ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
              </button>
              <button
                className="btn-ghost p-2"
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function MobileBar({
  user,
  theme,
  onToggleTheme,
  onOpenAdmin,
  onLogout,
}: {
  user: AuthUser;
  theme: string;
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <header className="lg:hidden sticky top-0 z-30 surface-glass border-b border-border">
      <div className="container flex items-center gap-3 py-2.5">
        <NavLink
          to="/"
          className="flex items-center active:scale-[0.97] transition-transform duration-150 shrink-0"
          style={{ transitionTimingFunction: "var(--ease-out-quint)" }}
          aria-label="Home"
        >
          <BrandMark />
        </NavLink>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="btn-ghost p-2"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {user && (
            <>
              <button
                onClick={onOpenAdmin}
                className={cn(
                  "btn-ghost p-2",
                  user.is_admin && "text-primary",
                )}
                aria-label={user.is_admin ? "Manage admin" : "Become admin"}
              >
                {user.is_admin ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
              </button>

              <div className="hidden sm:flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full border border-border bg-foreground/5 max-w-[9rem]">
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-6 w-6 rounded-full shrink-0"
                  />
                )}
                <span className="truncate text-xs font-medium">{user.username}</span>
              </div>

              <button
                className="btn-ghost p-2"
                onClick={onLogout}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      <nav
        aria-label="Primary mobile"
        className="container overflow-x-auto pb-2 flex gap-1 no-scrollbar"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "btn-ghost text-xs gap-1 px-2.5 py-1.5 shrink-0",
                isActive && "font-semibold bg-foreground/6 border border-border",
              )
            }
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "btn-ghost text-xs gap-1 px-2.5 py-1.5 shrink-0",
                isActive && "font-semibold bg-foreground/6 border border-border",
              )
            }
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
    </header>
  );
}

function AdminDialog({ onClose }: { onClose: () => void }) {
  const { user, claimAdmin, releaseAdmin } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function onClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      await claimAdmin(code.trim());
      toast.push({ title: "Admin mode active", tone: "success" });
      onClose();
    } catch (e: any) {
      toast.push({
        title: "Couldn't claim admin",
        description:
          e?.message === "invalid_code"
            ? "Wrong code."
            : e?.message === "admin_code_not_configured"
              ? "Ask the host to set ADMIN_CODE on Railway."
              : "Something went wrong.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  function onRelease() {
    releaseAdmin();
    toast.push({ title: "Admin mode off" });
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="card-elev w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Administrator access"
      >
        <button
          className="absolute top-3 right-3 btn-ghost p-1.5"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center text-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary grid place-items-center mb-2">
            {user?.is_admin ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <h3 className="font-display text-lg font-semibold">
            {user?.is_admin ? "Administrator mode" : "Become an administrator"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {user?.is_admin
              ? "You have access to backup, restore, and clear controls."
              : "Enter the admin code to unlock backup, restore, and clear controls."}
          </p>
        </div>
        {user?.is_admin ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Stay admin
            </Button>
            <Button variant="destructive" className="flex-1" onClick={onRelease}>
              Exit admin
            </Button>
          </div>
        ) : (
          <form onSubmit={onClaim} className="space-y-3">
            <Input
              type="password"
              autoFocus
              placeholder="Admin code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Admin code"
            />
            <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
              Unlock
            </Button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
