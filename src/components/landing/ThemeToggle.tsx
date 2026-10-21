import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "@/components/Icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group inline-flex min-h-9 items-center gap-2 border border-[var(--c-line)] px-2 py-1.5 text-[var(--c-ink-2)] transition-colors hover:border-[var(--c-line-strong)] hover:text-[var(--c-ink)] ${className}`}
      aria-label={`${theme === "dark" ? "Dark" : "Light"} theme — switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <span className="relative block h-4 w-4">
        <Sun
          size={16}
          className={`absolute inset-0 transition-opacity duration-200 ${
            theme === "light" ? "opacity-100" : "opacity-0"
          }`}
        />
        <Moon
          size={16}
          className={`absolute inset-0 transition-opacity duration-200 ${
            theme === "dark" ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
      <span className="mono hidden text-[11px] font-medium uppercase tracking-[0.08em] sm:inline">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
