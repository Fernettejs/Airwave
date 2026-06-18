import { Link } from 'react-router-dom';

export default function Landing() {
  const steps = [
    { n: '1', t: 'Sign up free', d: 'Email and password. No credit card.' },
    { n: '2', t: 'Fill in your card', d: 'Name, photo, links, colors. Live preview as you type.' },
    { n: '3', t: 'Share it', d: 'Send the link, show the QR code, or write it to a tap card.' },
  ];
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="text-base font-bold text-slate-900">CardStand</span>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
            <Link to="/signup" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            One link that holds your whole business card.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Build a digital card people can save, call, text, and book from. Share it as a link, a QR
            code, or a tap card. Free to make and free to share.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/signup" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white">
              Create your free card
            </Link>
            <Link to="/login" className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700">
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid gap-5 pb-20 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-6 text-sm text-slate-400">CardStand</div>
      </footer>
    </div>
  );
}
