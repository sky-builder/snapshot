module.exports = {
  testMatch: ['**/test/**/*.js'],
  testPathIgnorePatterns : ['config', '1500/'],
  testTimeout: 60 * 1000 * 5,
  bail: 1,
  "reporters": [
    "default",
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "Test Report",
      includeConsoleLog: true,
      outputPath: './public/test-report.html'
    }]
  ]
}