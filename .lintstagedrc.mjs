const config = {
  "**/*.{ts,tsx}": ["eslint --max-warnings 0", "prettier --check"],
  "**/*.{json,css,md}": ["prettier --check"],
};

export default config;
