"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          className={cn(
            "flex h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-white transition-all duration-200",
            "border-white/10 focus:border-neon-cyan/50 focus:outline-none focus:ring-2 focus:ring-neon-cyan/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "appearance-none cursor-pointer",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" className="bg-dark-500 text-gray-400">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-dark-500 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
