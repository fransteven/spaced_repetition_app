"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})
type FormData = z.infer<typeof schema>

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    if (res?.error) {
      setServerError("Invalid email or password")
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center justify-center">
      <main className="w-full max-w-[400px] px-6 py-12">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <AppLogo size="lg" href="/" />
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
                  <AlertCircle className="h-4.5 w-4.5" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4.5 w-4.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <p className="text-xs font-medium text-error flex items-center gap-1">
                <AlertCircle className="h-4.5 w-4.5" />
                {serverError}
              </p>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-[0px_12px_32px_rgba(25,28,29,0.04)] disabled:opacity-60"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>

            </div>
          </form>
        </section>

        <footer className="mt-8 text-center">
          <p className="text-sm text-on-surface-variant">
            Don&apos;t have an account?
            <Link href="/register" className="text-primary font-semibold hover:underline ml-1">
              Sign up →
            </Link>
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
            <Link
              key={link}
              href="/login"
              className="text-xs font-medium tracking-wide uppercase text-on-surface-variant hover:text-primary transition-colors"
            >
              {link}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
