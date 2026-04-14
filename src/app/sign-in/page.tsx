"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})
type FormData = z.infer<typeof schema>

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = (data: FormData) => console.log("sign-in", data)

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center justify-center">
      <main className="w-full max-w-[400px] px-6 py-12">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 shadow-[0px_12px_32px_rgba(25,28,29,0.04)]">
            <span className="material-symbols-outlined text-on-primary text-3xl">neurology</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tighter text-on-surface">NeuroCards</h1>
        </div>

        {/* Login card */}
        <section className="bg-surface-container-lowest rounded-xl p-10 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] border border-outline-variant/15 w-full">
          <header className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface leading-tight">
              Welcome back
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Continue your learning streak
            </p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className="w-full h-10 px-4 rounded-lg bg-surface-container-low border-transparent focus:border-transparent focus:ring-2 focus:ring-primary/20 text-on-surface text-sm transition-all outline-none"
              />
              {errors.email && (
                <p className="text-xs font-medium text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-primary hover:text-on-primary-fixed-variant transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full h-10 px-4 pr-10 rounded-lg bg-surface-container-low border-transparent focus:border-transparent focus:ring-2 focus:ring-primary/20 text-on-surface text-sm transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-4">
              <button
                type="submit"
                className="w-full h-11 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-[0px_12px_32px_rgba(25,28,29,0.04)]"
              >
                Sign in
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-surface-container-high" />
                <span className="text-xs font-medium text-on-surface-variant">— or —</span>
                <div className="h-px flex-1 bg-surface-container-high" />
              </div>

              <button
                type="button"
                className="w-full h-11 bg-surface-container-lowest text-on-surface font-semibold rounded-lg border border-outline-variant/30 flex items-center justify-center gap-3 hover:bg-surface-container-low transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM5w3b5mXZqJFlX3Khf-dAS7WxTwjTf1eaTMQ50-CrM2tkiyYmHQOSQ7I62oTqjafdLHgFSiv0hbCgynl2L86EBm2hzYtDt6qjUhRgU4I5oXKOQGN1OSOy2ex2bBi7Wk-WraWjaTun-ztosCUMu-CgtXoUlVUw9VEccZ5-veCkRnO6L-vw2wMRIr9uRVqJc1XdkdNSNt5zfX6gnIXQlESJsS4FILqyEgBqw_TUu2zPj-18P9dOuKAJMyBjqPYtFCFfcAH-g-mNoGVr"
                  alt="Google"
                  className="w-5 h-5"
                />
                Continue with Google
              </button>
            </div>
          </form>
        </section>

        <footer className="mt-8 text-center">
          <p className="text-sm text-on-surface-variant">
            Don&apos;t have an account?
            <a href="/sign-up" className="text-primary font-semibold hover:underline ml-1">
              Sign up →
            </a>
          </p>
        </footer>
      </main>

      {/* Global footer */}
      <footer className="w-full py-12 flex flex-col items-center gap-4 mt-auto bg-surface-container-low">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-on-surface">The Cognitive Atelier</p>
          <p className="text-xs font-medium tracking-wide uppercase text-on-surface-variant">
            © 2024 The Cognitive Atelier. Designed for intellectual rigor.
          </p>
        </div>
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
      </footer>
    </div>
  )
}
