import { OpportunityType } from "@founderos/db";
import { LIFECYCLE_ORDER } from "@founderos/core";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
          FounderOS
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Foundation is live.</h1>
        <p className="mt-3 text-slate-400">
          Milestone 1 (Foundation &amp; Data Model) has landed: monorepo, data
          model, and the AI decision contract. Auth and the dashboard ship in
          Milestone 2.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">
          Opportunity types
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {Object.values(OpportunityType).map((type) => (
            <li
              key={type}
              className="rounded-full border border-slate-800 px-3 py-1 text-sm text-slate-300"
            >
              {type}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">
          Universal lifecycle
        </h2>
        <ol className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          {LIFECYCLE_ORDER.map((stage, i) => (
            <li key={stage} className="flex items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1">{stage}</span>
              {i < LIFECYCLE_ORDER.length - 1 && <span className="text-slate-600">&rarr;</span>}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
