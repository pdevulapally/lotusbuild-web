import {motion} from "framer-motion";
import {Link} from "react-router-dom";

import {MarketingShell} from "@/components/marketing-shell";
import {EASE} from "@/lib/motion";

export default function NotFoundPage() {
  return (
    <MarketingShell>
      <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 pt-32 text-center">
        <motion.div initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.7, ease: EASE}}>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="mt-5 text-4xl tracking-[-0.02em] sm:text-5xl">This page doesn't exist.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-400">The link may be old, or the address may have a typo.</p>
          <Link to="/" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90">Back to home</Link>
        </motion.div>
      </section>
    </MarketingShell>
  );
}
