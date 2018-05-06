module.exports = {
  "env": {
    "node": true,
    "es6": true
  },
  "parserOptions": {
    "ecmaVersion": 2017
  },
  "extends": ["eslint:recommended", "google"],
  "rules": {
    // Additional, per-project rules...
    "semi": ["error", "never"],
    "indent": ["error", 2],
    "new-cap": ["error", { "capIsNew": false }],
    "max-len": ["error", { "code": 100, "tabWidth": 2 }],
    "require-jsdoc": ["off"],
    "no-console": ["off"],
  }
}
