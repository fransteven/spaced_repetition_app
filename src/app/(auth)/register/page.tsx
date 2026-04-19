"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof schema>

function getStrength(pwd: string): { level: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pwd) return { level: 0, label: "", color: "" }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  const map = [
    { level: 1 as const, label: "Weak", color: "bg-error" },
    { level: 2 as const, label: "Medium", color: "bg-secondary" },
    { level: 3 as const, label: "Strong", color: "bg-tertiary" },
    { level: 4 as const, label: "Very strong", color: "bg-tertiary" },
  ]
  return map[Math.min(score, 3)]
}

export default function SignUpPage() {
  const [password, setPassword] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = (data: FormData) => console.log("sign-up", data)
  const strength = getStrength(password)

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(25,28,29,0.04)] p-10 flex flex-col gap-8">
          {/* Branding */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg">
                <span
                  className="material-symbols-outlined text-on-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  psychology
                </span>
              </div>
              <span className="text-xl font-extrabold text-primary tracking-tighter">
                The Cognitive Atelier
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              Create your account
            </h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Start learning with spaced repetition
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Frankly"
                {...register("name")}
                className="w-full h-10 px-4 rounded-lg bg-surface-container-high border-none text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              {errors.name && (
                <p className="text-xs text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className="w-full h-10 px-4 rounded-lg bg-surface-container-high border-none text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              {errors.email && (
                <p className="text-xs text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password + strength */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register("password", {
                  onChange: (e) => setPassword(e.target.value),
                })}
                className="w-full h-10 px-4 rounded-lg bg-surface-container-high border-none text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              {password && (
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 w-5 rounded-full transition-colors ${
                        step <= strength.level
                          ? strength.color
                          : "bg-surface-container-high"
                      }`}
                    />
                  ))}
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 leading-none">
                    {strength.label}
                  </span>
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className="w-full h-10 px-4 rounded-lg bg-surface-container-high border-none text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-tertiary text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-6 mt-2">
              <button
                type="submit"
                className="w-full h-11 bg-primary text-on-primary font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center"
              >
                Create account
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-grow h-px bg-outline-variant/30" />
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                  — or —
                </span>
                <div className="flex-grow h-px bg-outline-variant/30" />
              </div>

              <button
                type="button"
                className="w-full h-11 bg-surface-container-lowest border border-outline-variant/50 text-on-surface font-semibold rounded-lg hover:bg-surface-bright transition-all flex items-center justify-center gap-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7SeKakjwSG69AX-o6DOU9wNzQwcK7acyB5UuEnco-h3d4YqSZOKkxpITBKj7_GryA7I8HYwJEiPdtjx8mu878NSYUhlvkzBxWqA7PEs-QKxwrwU2sYZw0W3B1qzNPyd-U58zjlIQaBkTFGfgZAWNlMELh2XaheR8wA6UfIY1XXht_mFDpbF9LRJaeXJ4i2BZP7s4c-V-njmHKbyw0XmbYeAKMAG2BLi6q8RiFk51LhaEgjGdxU6ezoKdUh1XHDcNOegZQ077mqrSj"
                  alt="Google logo"
                  className="w-5 h-5"
                />
                Continue with Google
              </button>
            </div>
          </form>

          {/* Footer links */}
          <div className="flex flex-col items-center gap-6 pt-2 border-t border-outline-variant/10">
            <a
              href="/sign-in"
              className="text-sm font-semibold text-primary hover:text-on-primary-fixed-variant transition-colors flex items-center gap-1"
            >
              Already have an account? Sign in
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
            <p className="text-[11px] leading-relaxed text-on-surface-variant text-center max-w-[280px]">
              By signing up you agree to our{" "}
              <a className="underline hover:text-primary" href="#">
                Terms of Service
              </a>{" "}
              and{" "}
              <a className="underline hover:text-primary" href="#">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Global footer */}
      <footer className="w-full py-12 flex flex-col items-center gap-4 bg-surface-container-low">
        <p className="text-sm font-bold text-on-surface">The Cognitive Atelier</p>
        <div className="flex gap-6">
          {["Privacy", "Terms", "Support"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-xs font-medium tracking-wide uppercase text-on-surface-variant hover:text-primary transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
        <p className="text-xs font-medium tracking-wide uppercase text-on-surface-variant">
          © 2024 The Cognitive Atelier. Designed for intellectual rigor.
        </p>
      </footer>
    </div>
  )
}
