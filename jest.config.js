module.exports = {
  testMatch: ['**/test/**/*.js'],
  testPathIgnorePatterns : ['config', '1500/', '43257/', 'utils.js',],
  testTimeout: 60 * 1000 * 10,
  bail: 1,
  "reporters": [
    "default",
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "Test Report",
      includeConsoleLog: true,
      outputPath: './tmp/test-report.html'
    }]
  ]
}