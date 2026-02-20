import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "rgb(var(--primary-50) / <alpha-value>)",
                    100: "rgb(var(--primary-100) / <alpha-value>)",
                    200: "rgb(var(--primary-200) / <alpha-value>)",
                    300: "rgb(var(--primary-300) / <alpha-value>)",
                    400: "rgb(var(--primary-400) / <alpha-value>)",
                    500: "rgb(var(--primary-500) / <alpha-value>)",
                    600: "rgb(var(--primary-600) / <alpha-value>)",
                    700: "rgb(var(--primary-700) / <alpha-value>)",
                    800: "rgb(var(--primary-800) / <alpha-value>)",
                    900: "rgb(var(--primary-900) / <alpha-value>)",
                    950: "rgb(var(--primary-950) / <alpha-value>)",
                },
                accent: {
                    50: "#f0fdf4",
                    100: "#dcfce7",
                    200: "#bbf7d0",
                    300: "#86efac",
                    400: "#4ade80",
                    500: "#22c55e",
                    600: "#16a34a",
                    700: "#15803d",
                    800: "#166534",
                    900: "#14532d",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};

export default config;
