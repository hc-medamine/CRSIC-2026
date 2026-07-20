export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16 font-sans">
      <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC · Step 4</p>
      <h1 className="text-3xl font-semibold text-zinc-900">Internal content management</h1>
      <p className="text-zinc-600">
        Local Next.js CMS scaffold. Auth, roles, and editorial workflows come next.
      </p>
      <p className="text-sm text-zinc-500">
        DB health:{" "}
        <a className="underline" href="/api/health/db">
          /api/health/db
        </a>
      </p>
    </main>
  );
}
