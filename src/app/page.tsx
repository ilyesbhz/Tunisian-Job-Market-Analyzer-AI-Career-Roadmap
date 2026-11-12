import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto mt-24 max-w-xl p-6">
      <h1 className="text-3xl font-bold">Tunisian Job Market Analyzer</h1>
      <p className="mt-2">Explore job offers in Tunisia and abroad.</p>
      <div className="mt-6 flex gap-4">
        <Link href="/login" className="underline">Log in</Link>
        <Link href="/signup" className="underline">Sign up</Link>
      </div>
    </main>
  );
}