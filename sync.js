/**
 * 将 test 文件夹里的测试用例转成 JSON 格式, 用于前端展示和选择测试范围
 */
const fs = require("fs");
const path = require("path");
const ignoreFiles = ['config.js', 'index.js'];

function filterFiles(files) {
  let result = files.filter((u) => !ignoreFiles.includes(u));
  return result;
}

function main() {
  let result = [];
  let rootDir = path.join(__dirname, "test");
  let users = fs.readdirSync(rootDir);
  users = filterFiles(users);
  for (let i = 0; i < users.length; i += 1) {
    let userDir = path.join(rootDir, users[i]);
    let exams = fs.readdirSync(userDir);
    exams = filterFiles(exams);
    let u = {};
    u.userId = users[i];
    u.examList = [];
    for (let j = 0; j < exams.length; j += 1) {
      let e = {};
      e.examId = exams[j];
      let examReportListPath = path.join(rootDir, users[i], exams[j], "report-list.json");
      let examReportList = require(examReportListPath);
      e.reportList = examReportList;
      u.examList.push(e);
    }
    result.push(u);
  }
  fs.writeFileSync("sync.json", JSON.stringify(result));
}

main();
