import type { ReactNode } from 'react';

// A label exactly as the program shows it (a button, a field, a tab), so it is easy to spot.
export function Ui({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-md border border-fd-border bg-fd-card px-1.5 py-px text-[0.92em] font-semibold whitespace-nowrap text-fd-foreground shadow-[0_1px_0_var(--color-fd-border)] max-md:whitespace-normal">
      {children}
    </span>
  );
}

// A key of the computer's keyboard.
export function Key({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-b-2 border-fd-border bg-fd-muted px-1.5 py-px font-sans text-[0.85em] font-semibold text-fd-foreground">{children}</kbd>;
}

// Where to click, left to right: <Path>Parduotuvės → Visos parduotuvės</Path>.
export function Path({ children }: { children: string }) {
  const parts = children.split(/\s*→\s*/);
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-baseline">
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-fd-muted-foreground">→</span>}
          <Ui>{part}</Ui>
        </span>
      ))}
    </span>
  );
}
