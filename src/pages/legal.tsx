import {motion} from "framer-motion";
import {useEffect, useState} from "react";

import {MarketingShell} from "@/components/marketing-shell";
import type {LegalDocument} from "@/content/legal";
import {publicEnv} from "@/lib/env";
import {EASE, reveal} from "@/lib/motion";

export function LegalPage({document: doc}: {document: LegalDocument}) {
  const [active, setActive] = useState(doc.sections[0]?.id);
  const contact = publicEnv("LEGAL_CONTACT_EMAIL");

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, {rootMargin: "-20% 0px -65% 0px"});
    doc.sections.forEach(section => { const el = window.document.getElementById(section.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [doc]);

  return (
    <MarketingShell>
      <section className="relative overflow-hidden px-6 pb-16 pt-40 sm:pt-48">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(225,224,204,0.10),transparent)]" />
        <motion.div className="relative mx-auto max-w-3xl text-center" initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.8, ease: EASE}}>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{doc.eyebrow}</p>
          <h1 className="mt-5 text-balance text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">{doc.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-gray-400">{doc.summary}</p>
          <p className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-gray-400">Last updated {doc.updated}</p>
        </motion.div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-28 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ol className="sticky top-32 flex flex-col gap-1 border-l border-white/10">
            {doc.sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}
                  className={`-ml-px flex gap-3 border-l py-1.5 pl-4 text-[13px] transition-colors duration-300 ${active === section.id ? "border-primary text-[#E1E0CC]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                  <span className="tabular-nums text-gray-600">{String(index + 1).padStart(2, "0")}</span>{section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="flex flex-col gap-4">
          {doc.sections.map((section, index) => (
            <motion.section key={section.id} id={section.id} {...reveal(0)}
              className="scroll-mt-32 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
              <p className="text-xs tabular-nums text-gray-600">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-xl tracking-[-0.01em] sm:text-2xl">{section.heading}</h2>
              <div className="mt-4 flex flex-col gap-3 text-[15px] leading-7 text-gray-400">
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {section.points && (
                  <ul className="mt-1 flex flex-col gap-2">
                    {section.points.map(point => (
                      <li key={point} className="flex gap-3"><span aria-hidden className="mt-[0.7rem] h-1 w-1 shrink-0 rounded-full bg-primary/60" />{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.section>
          ))}
          <motion.section {...reveal(0)} id="contact" className="scroll-mt-32 rounded-2xl border border-primary/15 bg-primary/[0.04] p-6 sm:p-8">
            <h2 className="text-xl tracking-[-0.01em] sm:text-2xl">Contact</h2>
            <p className="mt-3 text-[15px] leading-7 text-gray-400">
              {contact
                ? <>Questions about this policy or your data? Email <a className="text-primary underline underline-offset-4" href={`mailto:${contact}`}>{contact}</a>.</>
                : "Questions about this policy or your data? Contact us from your LotusBuild account."}
            </p>
          </motion.section>
        </article>
      </div>
    </MarketingShell>
  );
}
