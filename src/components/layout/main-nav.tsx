import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/charities", label: "Charities" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
];

export function MainNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-900">
          Digital Heroes
        </Link>
        <ul className="flex items-center gap-4 text-sm font-medium text-slate-600">
          {links.map((link) => (
            <li key={link.href}>
              <Link className="transition-colors hover:text-slate-900" href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
