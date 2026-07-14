import Link from "next/link";

export function PageHeader() {
  return (
    <header className="border-b border-slate-200 px-6 py-5 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          OmniCodeSMS
        </Link>
      </div>
    </header>
  );
}
