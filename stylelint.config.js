module.exports = {
  "extends": [
    "stylelint-config-standard",
    "stylelint-config-prettier",
    "stylelint-config-idiomatic-order",
  ],
  "plugins": [
    "stylelint-order",
    "stylelint-no-unsupported-browser-features",
  ],
  // Without these, .scss/.less files are parsed as plain CSS: a `//` comment
  // becomes a fatal CssSyntaxError and the whole file is skipped unlinted.
  "overrides": [
    {
      "files": ["**/*.scss", "**/*.sass"],
      "customSyntax": "postcss-scss",
    },
    {
      "files": ["**/*.less"],
      "customSyntax": "postcss-less",
    },
  ],
  "rules": {
    "plugin/no-unsupported-browser-features": [
      true,
      {
        "severity": "warning"
      }
    ],
    "declaration-block-no-redundant-longhand-properties": null,
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,

    "at-rule-no-unknown": null,
    "color-hex-length": "long",
    "selector-pseudo-element-colon-notation": "single",
    "property-no-vendor-prefix": true,
    "max-empty-lines": [
      2,
      {
        "ignore": [
          "comments"
        ]
      }
    ],
    "rule-empty-line-before": [
      "always-multi-line",
      {
        "except": [
          "after-single-line-comment",
          "first-nested"
        ]
      }
    ],

    // CSS Modules syntax that stylelint does not know natively.
    "selector-pseudo-class-no-unknown": [
      true,
      {
        "ignorePseudoClasses": [
          "global",
          "local",
          "export"
        ]
      }
    ],
    "property-no-unknown": [
      true,
      {
        "ignoreProperties": [
          "composes"
        ]
      }
    ],

    // SCSS/Less built-ins (`darken`, ...) are resolved by the preprocessor,
    // not by stylelint.
    "function-no-unknown": null,

    // Design tokens are camelCase by convention (`--fontSize-m`,
    // `--mobileNavHeight`); renaming them would touch every consumer.
    "custom-property-pattern": "^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$",

    // Cannot distinguish CSS keywords from case-sensitive identifiers
    // (font family names, `currentColor`, SCSS `@keyframes` names) in v14.
    "value-keyword-case": null,

    // Convention is kept visible, but it neither fails the gate nor lets
    // `lint:css:fix` reshuffle unrelated files out from under a feature branch.
    "order/properties-order": [
      require("stylelint-config-idiomatic-order").rules["order/properties-order"][0],
      {
        ...require("stylelint-config-idiomatic-order").rules["order/properties-order"][1],
        "severity": "warning",
        "disableFix": true
      }
    ],

    // vvv remove later to make codebase better vvv
    "no-descending-specificity": null,
  }
}
