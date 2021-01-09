module.exports = {
  testMatch: ['**/test/**/*.js'],
  // testPathIgnorePatterns : ['config', '1500/', 'bjssyxxadmin/', 'fdsjxxadmin/', '43257/', 'utils.js', '1167458/', '1185269/'],
  testPathIgnorePatterns : ['config', '1500/', '43257/', 'utils.js', '1167458/', '1185269/'],
  testTimeout: 60 * 1000 * 30,
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