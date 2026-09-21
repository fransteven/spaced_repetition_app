"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { unwrapError } from "@/lib/api-envelope"

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Must be at least 8 characters"),
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
  if (score <= 1) return { level: 1, label: "Weak", color: "bg-error" }
  if (score === 2) return { level: 2, label: "Medium", color: "bg-state-intermediate" }
  if (score === 3) return { level: 3, label: "Strong", color: "bg-state-mastered" }
  return { level: 4, label: "Very strong", color: "bg-state-mastered" }
}

export default function SignUpPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const password = useWatch({ control, name: "password", defaultValue: "" })
  const confirmPassword = useWatch({ control, name: "confirmPassword", defaultValue: "" })
  const passwordsMatch = Boolean(
    password && confirmPassword && password === confirmPassword
  )
  const strength = getStrength(password)

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      })
      const json: unknown = await res.json()
      if (!res.ok) {
        setServerError(unwrapError(json, "Registration failed"))
        return
      }

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (signInResult?.error) {
        setServerError("Account created, but automatic sign-in failed. Please sign in.")
        return
      }
      router.push("/")
      router.refresh()
    } catch {
      setServerError("Unable to create your account. Please try again.")
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Start retaining knowledge for life with FSRS"
      showOnboardingSteps={true}
      footerPrompt={
        <div className="space-y-3">
          <p className="text-body-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in →
            </Link>
          </p>
          <p className="text-label-sm text-on-surface-variant/70 leading-relaxed">
            By creating an account, you agree to our standard terms and privacy policies.
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="name" className="text-label-md text-on-surface-variant">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Ada Lovelace"
            autoComplete="name"
            {...register("name")}
            className="h-10 text-body-md"
          />
          {errors.name && (
            <p className="flex items-center gap-1 text-label-sm text-error">
              <AlertCircle className="size-4 shrink-0" />
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="email" className="text-label-md text-on-surface-variant">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
            className="h-10 text-body-md"
          />
          {errors.email && (
            <p className="flex items-center gap-1 text-label-sm text-error">
              <AlertCircle className="size-4 shrink-0" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="password" className="text-label-md text-on-surface-variant">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
            className="h-10 text-body-md"
          />
          {password && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1">
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
              </div>
              <span className="text-label-sm text-on-surface-variant uppercase font-semibold">
                {strength.label}
              </span>
            </div>
          )}
          {errors.password && (
            <p className="flex items-center gap-1 text-label-sm text-error">
              <AlertCircle className="size-4 shrink-0" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="confirmPassword" className="text-label-md text-on-surface-variant">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className="h-10 pr-10 text-body-md"
            />
            {passwordsMatch && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-state-mastered animate-pop-in">
                <CheckCircle2 className="size-4" />
              </span>
            )}
          </div>
          {errors.confirmPassword && (
            <p className="flex items-center gap-1 text-label-sm text-error">
              <AlertCircle className="size-4 shrink-0" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="rounded-lg bg-error-container p-2.5 text-on-error-container">
            <p className="flex items-center gap-1.5 text-body-sm">
              <AlertCircle className="size-4 shrink-0 text-error" />
              {serverError}
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
