/**
 * 1. read test dir
 * 2. filter .js
 * 3. get userIds
 * 4. read user dir
 * 5. get examIds
 * 6. read exam dir
 * 7. get exam name and testcases
 */
const fs = require('fs');
const path = require('path')

let obj = {};

let userIds = fs.readdirSync(path.join(__dirname, 'test'))

userIds.forEach(userId => {
  if (/\.js$/.test(userId) || userId === '__image_snapshots__') return;
  let userVal = {
    idExamMap: {}
  };
  let userDir = path.join(__dirname, 'test', userId);
  let examIds = fs.readdirSync(userDir);
  let userConfigPath = path.join(__dirname, 'test', userId, 'config.js');
  let userConfig = require(userConfigPath);
  userVal.name = userConfig.userInfo.name;
  examIds.forEach(examId => {
    if (/\.js$/.test(examId) || examId === '__image_snapshots__') return;
    let examVal = {};
    let examConfigPath = path.join(__dirname, 'test', userId, examId, 'config.js');
    let examConfig = require(examConfigPath);
    examVal.name = examConfig.examInfo.name;
    let examTestCasesPath = path.join(__dirname, 'test', userId, examId, 'report-list.json');
    let testCases = require(examTestCasesPath);
    examVal.testCases = testCases;
    userVal.idExamMap[examId] = examVal;
  })
  obj[userId] = userVal;
})

fs.writeFileSync('out.json', JSON.stringify(obj));