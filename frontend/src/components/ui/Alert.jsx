import * as React from "react"

export function Alert({ children, variant = "default", className = "" }) {
  const baseStyles = "relative w-full rounded-xl border p-3.5 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 text-xs font-medium"
  const variants = {
    default: "bg-slate-50 text-slate-800 border-slate-200 [&>svg]:text-slate-600",
    destructive: "border-red-200 text-red-600 bg-red-50 [&>svg]:text-red-500"
  }
  return (
    <div role="alert" className={`${baseStyles} ${variants[variant]} ${className} animate-[fadeIn_0.2s_ease-out]`}>
      {children}
    </div>
  )
}

export function AlertTitle({ children, className = "" }) {
  return (
    <h5 className={`mb-1 font-semibold leading-none tracking-tight text-slate-950 dark:text-white ${className}`}>
      {children}
    </h5>
  )
}

export function AlertDescription({ children, className = "" }) {
  return (
    <div className={`text-[11px] leading-relaxed opacity-90 ${className}`}>
      {children}
    </div>
  )
}
