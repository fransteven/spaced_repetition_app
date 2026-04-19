"use client"

import { RATINGS, CARD } from "@/components/study/question-view"

export function AnswerView({ onRate }: { onRate: (rating: string) => void }) {
  return (
    <div className="w-full max-w-[640px] flex flex-col gap-8">
      {/* Answer card */}
      <section
        className="bg-surface-container-lowest rounded-xl p-8 lg:p-12 border border-outline-variant/15"
        style={{ boxShadow: "0px 12px 32px rgba(25, 28, 29, 0.04)" }}
      >
        <div className="flex flex-col gap-6">
          {/* Original term */}
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant">
              {CARD.type}
            </span>
            <h2 className="text-base text-on-surface-variant mt-2">{CARD.term}</h2>
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-container-high w-full" />

          {/* Answer */}
          <div className="space-y-4">
            <p className="text-xl font-medium leading-relaxed text-on-surface">
              {CARD.answer}
            </p>
            <p className="text-lg italic text-on-surface-variant/80">{CARD.example}</p>
          </div>

          {/* Contextual images */}
          <div className="flex gap-4 pt-4">
            {[
              {
                src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAqyDGDBYkJ8ybTtcDEfbPXYpPogF7-GV8xUnglpUlSvjcP0d16tctWel8ezTICodwYeX2XdVDfxTUAVdo39s1F4cpoeQ7k-zEsgfheXhiMnSjR7VkArogDA17DK1JAQexoaR39EWktrTGQI8ikuV09T3NffsxeP2ia0gHUdNCkSP4HP-vplLP1qBHStkT78SjI7EQTWrUyjLncdCNsYWGZkd2oUR1CKynd_YdM5KnOTGasL0XPgGxrOK2oriZol6mcM_zqP4Q08Xon",
                alt: "Discarded cigarettes on white table — giving up smoking",
              },
              {
                src: "https://lh3.googleusercontent.com/aida-public/AB6AXuACle6lne2LCS43JqYVvRVxesoOZtLeVGF2oMqujeJsR40Q81-93uLZUdCj9VFDH6JxHecQYollV_P0sJ3cPGD9ed5U9PG9kDCjCHYLPNIi_zx-LotFhKvbFgiSEU3VRbK1rrOvwCtOZpEPWeSJjwjZJJBms2Nq10KYck6TT2GEHgYZXBqszaPdgUVG-vqQMUTB-h9zNSpU4GK6xywAAgbHa1Q8zby1Rp7qSZk1mV0H4xAGptlmB-qH2BJP5GngrIQL51mtEnxFLN2X",
                alt: "Person with hands raised — surrendering, letting go",
              },
            ].map((img) => (
              <div
                key={img.alt}
                className="relative flex-1 aspect-[4/3] bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant/10 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                />
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold bg-surface-container-lowest/80 px-2 py-1 rounded whitespace-nowrap">
                  contextual image
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rating controls */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3">
          {RATINGS.map((r) => (
            <button
              key={r.label}
              onClick={() => onRate(r.label)}
              className={`h-12 flex items-center justify-center rounded-lg font-semibold transition-transform active:scale-95 shadow-sm ${r.active}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Interval hints */}
        <div className="flex justify-between px-2">
          {RATINGS.map((r) => (
            <div key={r.label} className="text-xs text-on-surface-variant text-center flex-1">
              <span className="block font-medium">{r.interval}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-on-surface-variant/60 italic mt-2">
          Select a rating to schedule next review
        </p>
      </div>
    </div>
  )
}
