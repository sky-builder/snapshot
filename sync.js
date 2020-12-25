const fs = require('fs')
const path = require('path')

let result = [];

let root = path.join(__dirname, 'test')

let users = fs.readdirSync(root)
users = users.filter(u => u !== 'config.js' && u !== 'index.js')
for(let i = 0; i < users.length; i += 1) {
  let p =  path.join(root, users[i]);
  let exams = fs.readdirSync(p);
  exams = exams.filter(u => u !== 'config.js' && u !== 'index.js')
  let k = {};
  k.userId = users[i];
  k.examList = [];
  for(let j = 0; j < exams.length; j += 1) {
    let r = {};
    r.examId = exams[j];
    let f = path.join(root, users[i], exams[j], 'report-list.json');
    let config = require(f)
    // config = config.toString();
    // config = JSON.parse(config);
    r.reportList = config;
    k.examList.push(r)
  }
  result.push(k);
}
fs.writeFileSync('sync.json', JSON.stringify(result))

