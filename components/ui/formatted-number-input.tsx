"use client"

import { useRef, useState } from "react"
import { formatNumber, parseFormattedNumber } from "@/lib/format-number"

type FormattedNumberInputProps = {
  name: string
  defaultValue: number | string
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  step?: number | "any"
  className?: string
  onValueChange?: (value: string) => void
}

export function FormattedNumberInput({
  name,
  defaultValue,
  required,
  disabled,
  min,
  max,
  step,
  className,
  onValueChange,
}: FormattedNumberInputProps) {
  const [value, setValue] = useState(String(defaultValue))
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const parsedValue = parseFormattedNumber(value)
  const displayValue = focused || parsedValue === "" ? parsedValue : formatNumber(Number(parsedValue))

  function validateValue(nextValue: string) {
    if (!nextValue || !/^\d+(\.\d+)?$/.test(nextValue)) {
      return nextValue ? "Ingresa un número válido." : ""
    }

    const numericValue = Number(nextValue)
    if (min !== undefined && numericValue < min) return `El valor debe ser al menos ${formatNumber(min)}.`
    if (max !== undefined && numericValue > max) return `El valor no puede exceder ${formatNumber(max)}.`
    if (step !== undefined && step !== "any") {
      const base = min ?? 0
      const steps = (numericValue - base) / step
      if (Math.abs(steps - Math.round(steps)) > 1e-8) return `El valor debe avanzar en incrementos de ${formatNumber(step)}.`
    }
    return ""
  }

  return (
    <>
      <input type="hidden" name={name} value={parsedValue} />
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        ref={inputRef}
        required={required}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const nextValue = parseFormattedNumber(event.target.value)
          if (/^\d*\.?\d*$/.test(nextValue)) {
            setValue(nextValue)
            onValueChange?.(nextValue)
            inputRef.current?.setCustomValidity(validateValue(nextValue))
          }
        }}
        onInvalid={() => inputRef.current?.setCustomValidity(validateValue(parsedValue))}
        className={className}
      />
    </>
  )
}
