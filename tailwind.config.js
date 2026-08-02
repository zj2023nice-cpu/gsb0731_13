/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dim: "#94a3b8",
                gold: "#f59e0b",
            }
        },
    },
    plugins: [],
}
