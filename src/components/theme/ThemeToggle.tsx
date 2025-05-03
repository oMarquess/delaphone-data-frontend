"use client"

import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { SunOutlined, MoonOutlined } from "@ant-design/icons"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <SunOutlined className="text-gray-800" style={{ fontSize: '18px' }} />
      ) : (
        <MoonOutlined className="text-gray-800" style={{ fontSize: '18px' }} />
      )}
    </button>
  )
} 