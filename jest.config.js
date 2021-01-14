module.exports = {
  testMatch: ['**/test/**/*.js'],
  testPathIgnorePatterns : ['config', 'test-cases', '15160567158/', '1500/', '18539809767/', 'bjssyxxadmin/', 'fdsjxxadmin/',  'utils.js', 'hzxd1zxadmin/', '63777admin/', '68646admin/'],
  // testPathIgnorePatterns : ['config', '1500/', '43257/', 'utils.js', '1167458/'],
  testTimeout: 60 * 1000 * 30,
  // bail: 1,
  "reporters": [
    "default",
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "Test Report",
      includeConsoleLog: true,
      outputPath: './tmp/test-report.html'
    }]
  ]
}