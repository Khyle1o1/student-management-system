"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
	const { theme, setTheme, systemTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const currentTheme = theme === "system" ? systemTheme : theme

	if (!mounted) {
		return (
			<Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Toggle theme">
				<Sun className="h-4 w-4" />
			</Button>
		)
	}

	return (
		<Button
			variant="ghost"
			size="sm"
			className="h-9 w-9 p-0"
			aria-label="Toggle theme"
			onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
			title={currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
		>
			<Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
		</Button>
	)
}


