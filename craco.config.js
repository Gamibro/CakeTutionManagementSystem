module.exports = {
  style: {
    postcss: {
      plugins: [
        require('@tailwindcss/postcss')({
          tailwindcss: {},
          autoprefixer: {},
        })
      ],
    },
  },
}