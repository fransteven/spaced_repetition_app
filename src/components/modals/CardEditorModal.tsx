"use client"

import { useState, KeyboardEvent } from "react"

interface Props {
  onClose: () => void
}

const INITIAL_TAGS = ["phrasal-verb", "B2", "verb"]

export default function CardEditorModal({ onClose }: Props) {
  const [tags, setTags] = useState<string[]>(INITIAL_TAGS)
  const [tagInput, setTagInput] = useState("")
  const [frontChars, setFrontChars] = useState(7) // "Give up"
  const [backChars, setBackChars] = useState(38)
  const [hasImage, setHasImage] = useState(true)

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/60 backdrop-blur-[8px]">
      <section className="bg-surface-container-lowest w-full max-w-[680px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-6 flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant/10 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-on-surface leading-none">New Card</h2>
            <span className="bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
              Phrasal Verbs
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </header>

        {/* Body */}
        <div className="px-8 pb-8 flex-1 overflow-y-auto no-scrollbar pt-6">
          {/* Front / Back */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Front — error state */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
                Front — Question
              </label>
              <div className="relative">
                <textarea
                  defaultValue="Give up"
                  rows={5}
                  onChange={(e) => setFrontChars(e.target.value.length)}
                  placeholder="Enter question or term..."
                  className="w-full bg-surface-container-low border border-error focus:ring-2 focus:ring-error/20 focus:border-error rounded-lg p-4 text-sm resize-none transition-all placeholder:text-outline outline-none"
                />
                <span className="absolute bottom-3 right-3 text-[11px] text-error font-medium">
                  {frontChars} / 500
                </span>
              </div>
              <p className="text-error text-xs mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                Question is required
              </p>
            </div>

            {/* Back */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
                Back — Answer
              </label>
              <div className="relative">
                <textarea
                  defaultValue="To stop doing something that you do regularly."
                  rows={5}
                  onChange={(e) => setBackChars(e.target.value.length)}
                  placeholder="Enter answer or explanation..."
                  className="w-full bg-surface-container-low border border-transparent focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg p-4 text-sm resize-none transition-all placeholder:text-outline outline-none"
                />
                <span className="absolute bottom-3 right-3 text-[11px] text-on-surface-variant">
                  {backChars} / 500
                </span>
              </div>
            </div>
          </div>

          {/* Contextual images */}
          <div className="flex flex-col gap-3 mb-8">
            <label className="text-sm font-semibold text-on-surface">
              Contextual Images{" "}
              <span className="font-normal text-on-surface-variant">(optional — max 2)</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Upload zone */}
              <div className="border-2 border-dashed border-outline-variant/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors cursor-pointer group">
                <div className="bg-surface-container-low group-hover:bg-surface-container p-2 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-primary">upload</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-on-surface">Click or drag image</p>
                  <p className="text-[11px] text-on-surface-variant">JPG, PNG · max 5MB</p>
                </div>
              </div>

              {/* Uploaded preview */}
              {hasImage ? (
                <div className="relative min-h-[140px] rounded-xl overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBQok6nwE6LU5ohULw69pZtNn3kwvY5dO4ohkSeaJDsDL6xYcW49O90drLHLfbOAH8Uh2Q_M_Ns70nia1BxfVCWfuYJLjEgKxTffWtPLSPobn6WEs-hg5NUffpbsVGjC2yB2w4y_QHUHuy3_EF9BLUKF74emBHdgDpmdRilpMq-gj9vI61igXZOVJUieavsj_xAJ5bFPkH_B5s0otDvU6taTRyLENk4fpb-Ix9flb3mljSfVpnQfKVsrMXNXPx3zOJuFPIPXT4envx"
                    alt="Card contextual image"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="bg-surface-container-lowest px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface flex items-center gap-1 hover:bg-white transition-colors">
                      <span className="material-symbols-outlined text-base">refresh</span>
                      Replace
                    </button>
                    <button
                      onClick={() => setHasImage(false)}
                      className="bg-error text-on-error p-1.5 rounded-lg hover:opacity-90 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setHasImage(true)}
                  className="border-2 border-dashed border-outline-variant/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors cursor-pointer group"
                >
                  <div className="bg-surface-container-low group-hover:bg-surface-container p-2 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-primary">add_photo_alternate</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">Add another image</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-on-surface">Tags</label>
            <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-lg border border-transparent focus-within:border-primary/20 transition-all">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="bg-surface-variant/50 text-on-surface-variant px-2.5 py-1 rounded-md text-sm flex items-center gap-1.5 font-medium"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-error transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Add tag..."
                className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-outline outline-none min-w-[80px]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-8 py-6 bg-surface-container-low flex items-center justify-between border-t border-outline-variant/10">
          <button className="text-on-surface-variant hover:text-on-surface font-medium text-sm px-4 py-2 transition-colors">
            Save and add another
          </button>
          <button className="bg-primary text-on-primary font-semibold text-sm px-6 h-10 rounded-lg hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">save</span>
            Save card
          </button>
        </footer>
      </section>
    </div>
  )
}
