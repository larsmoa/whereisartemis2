const config = {
  "**/*.{ts,tsx}": ["prettier --write", "eslint --max-warnings 0"],
  "**/*.{json,css,md}": ["prettier --write"],
};

export default config;
