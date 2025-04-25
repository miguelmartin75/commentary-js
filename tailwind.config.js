/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["src/index.html"],
  purge: {
    enabled: true,
    content: ["src/*.html"],
  },
  theme: {
    extend: {},
  },
  plugins: [],
}

