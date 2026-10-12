import type {ReactNode} from "react";
import {Link} from "react-router-dom";


export const authInputClass =
  "h-12 w-full rounded-full border border-white/10 bg-[#101010] px-5 text-sm text-[#E1E0CC] outline-none transition-colors placeholder:text-gray-500 focus:border-primary/60";

export const authPrimaryButtonClass =
  "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-black transition-all hover:gap-3 disabled:cursor-not-allowed disabled:opacity-50";

export function GoogleButton({label, disabled, onClick}: {label: string; disabled: boolean; onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/15 text-sm text-[#E1E0CC] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg aria-hidden viewBox="10 10 20 20" width="16" height="16">
        <path d="M29.6 20.2273C29.6 19.5182 29.5364 18.8364 29.4182 18.1818H20V22.05H25.3818C25.15 23.3 24.4455 24.3591 23.3864 25.0682V27.5773H26.6182C28.5091 25.8364 29.6 23.2727 29.6 20.2273Z" fill="#4285F4" />
        <path d="M20 30C22.7 30 24.9636 29.1045 26.6181 27.5773L23.3863 25.0682C22.4909 25.6682 21.3454 26.0227 20 26.0227C17.3954 26.0227 15.1909 24.2636 14.4045 21.9H11.0636V24.4909C12.7091 27.7591 16.0909 30 20 30Z" fill="#34A853" />
        <path d="M14.4045 21.9C14.2045 21.3 14.0909 20.6591 14.0909 20C14.0909 19.3409 14.2045 18.7 14.4045 18.1V15.5091H11.0636C10.3864 16.8591 10 18.3864 10 20C10 21.6136 10.3864 23.1409 11.0636 24.4909L14.4045 21.9Z" fill="#FBBC04" />
        <path d="M20 13.9773C21.4681 13.9773 22.7863 14.4818 23.8227 15.4727L26.6909 12.6045C24.9591 10.9909 22.6954 10 20 10C16.0909 10 12.7091 12.2409 11.0636 15.5091L14.4045 18.1C15.1909 15.7364 17.3954 13.9773 20 13.9773Z" fill="#E94235" />
      </svg>
      {label}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span aria-hidden className="h-px flex-1 bg-white/10" />
      or
      <span aria-hidden className="h-px flex-1 bg-white/10" />
    </div>
  );
}

export function AuthError({message}: {message: string | null}) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p>;
}

export function AuthShell({title, children}: {title: string; children: ReactNode}) {
  return (
    <main className="grid min-h-screen bg-black md:grid-cols-2">
      <aside className="hidden p-6 md:block">
        <div className="relative h-full overflow-hidden rounded-[2rem]">
          <img className="absolute inset-0 h-full w-full object-cover" src="/images/lotus-lake.webp" alt="" />
          <div className="noise-overlay pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
          <Link to="/" aria-label="LotusBuild home" className="absolute bottom-8 left-8"><img src="/images/lotusbuild-logo.png" alt="LotusBuild" className="h-9 w-auto invert" /></Link>
        </div>
      </aside>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-sm flex-col gap-5">
          <Link to="/" className="text-sm text-primary/70 hover:text-primary md:hidden">LotusBuild</Link>
          <h1 className="text-balance text-3xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-4xl" style={{color: "#E1E0CC"}}>
            {title}
          </h1>
          {children}
        </div>
      </section>
    </main>
  );
}
