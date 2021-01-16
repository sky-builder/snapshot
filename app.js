const bodyParser = require('body-parser');
const serveIndex = require('serve-index')
const express = require('express')
const app = express();
var kill = require('tree-kill');

const humanizeDuration = require('humanize-duration')

const { spawn, exec } = require('child_process');
const fse = require('fs-extra');
const path = require('path')

const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const low = require('lowdb');
const db = low(adapter)
db.defaults({ TestResults: []})
  .write()

const isWindows = process.platform === "win32";
const getId = () => {
  let result = 1;
  let tests = db.get('TestResults')
        .orderBy('id', 'desc')
        .take(1)
        .value()

  if (tests && tests.length) {
    result = tests[0].id + 1;
  }
  return result;
}
let id = getId();

app.set('view engine', 'pug')
app.set('views', './views')

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

let public = path.join(__dirname, 'public')
let reports = path.join(__dirname, 'results/reports')
let images = path.join(__dirname, 'results/images')

app.use(express.static(public))
app.use('/reports', express.static(reports))
app.use('/images', express.static(images), serveIndex(images, {'icons': true}))

function format(configObject) {
  let result = [];
  let userIds = Object.keys(configObject);
  userIds.forEach(userId => {
    let user = configObject[userId];
    let username = user.name;
    let obj = {
      userId,
      username,
    }
    let examList = [];
    obj['examList'] = examList
    let examIds = Object.keys(user.idExamMap);
    examIds.forEach(examId => {
      let exam = user.idExamMap[examId];
      let examName = exam.name;
      let examObj = {
        examId,
        examName,
        testCases: exam.testCases
      }
      examList.push(examObj);
    }) 
    result.push(obj);
  })
  return result;
}

app.get('/', function (req, res) {
  let testResults = db.get('TestResults')
    .orderBy('endTime', 'desc')
    .take(10)
    .value()
  let testCases = fse.readFileSync('./test/test-cases.json')
  testCases = testCases.toString();
  testCases = JSON.parse(testCases);
  let testCases2 = format(testCases);
  let payload = {
    humanizeDuration,
    testResults: testResults,
    testCases: testCases2
  }
  res.render('index', payload)
})

function logServerStats() {
  if (isWindows) return;
  exec('sh server-stat.sh',  (error, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    if (!error) {
        broadcast(clientList, 'stat', stdout);
        setTimeout(() => {
          logServerStats()
        }, 1000 * 10);
    }
  })
}
logServerStats();

let clientList = [];
function broadcast(clientList, eventName, data) {
  clientList.forEach(client => {
  client.res.write(`event: ${eventName}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  })
}

app.post('/test-test', (req, res) => {
  run(req, res, 'test-test')
})

// 将用户选择的测试范围用来更新 report-list.json
app.post('/sync', async(req, res) => {
  let { cases } = req.body;
    if (cases) {
      let reportListPath = path.join(__dirname, 'test', 'test-cases.json');
      let reportList = fse.readFileSync(reportListPath);
      reportList = reportList.toString();
      reportList = JSON.parse(reportList);
      cases.forEach(c => {
      let userId = c.userId;
      c.examList.forEach(e => {
        let examId = e.examId;
        e.reportList.forEach(re => {
          let match = reportList[userId].idExamMap[examId].testCases.find(item => item.name === re.name);
          if (match) {
            match.isSkip = re.isSkip;
          }
        })
      })
    })
    fse.writeFileSync(reportListPath, JSON.stringify(reportList));
  }
  res.end('ok')
})

app.post('/test-gray', (req, res) => {
  run(req, res, 'test-gray')
})

app.post('/test-dev', (req, res) => {
  run(req, res, 'test-dev')
})

app.post('/test-prod', (req, res) => {
  run(req, res, 'test-prod')
})

app.post('/test-update', async (req, res) => {
  console.log('run test-update')
  run(req, res, 'test-update')
})

app.get('/connect', (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers)
  let clientId = Date.now()
  clientList.push({
    id: clientId,
    res: res
  });
  req.on('close', () => {
    clientList = clientList.filter(client => client.id !== clientId);
  })
})
app.post('/cancel', cancel);

app.listen(3000, () => {
  console.log('server listening on port: 3000.');
})
let ls;
function cancel(req, res) {
  let runningCase = 
  db.get('TestResults')
    .find(item => item.status === 'running')
    .value()
  if (runningCase) {
    // ls.stdin.pause();
    // let k = ls.kill('SIGKILL');
    let r = kill(ls.pid);

    let endTime = new Date().getTime();
    runningCase.endTime = endTime;
    runningCase.status = 'cancel';
    db.get('TestResults')
      .find({id: runningCase.id})
      .assign(runningCase)
      .write();
    broadcast(clientList, 'end', runningCase)
    id += 1; 
  }
  res.end('ok')
}

function run(req, res, cmd) {
  let runningCase = 
  db.get('TestResults')
    .find(item => item.status === 'running')
    .value()
if (runningCase) {
  res.end('there is running case, please wait.')
  return;
}
res.end(cmd, 'is running');

let npm = isWindows ? 'npm.cmd' : 'npm';
ls = spawn(npm, ['run', cmd])

let isPassed = true;
let currentTest = {
  id: id,
  cmd: cmd,
  status: 'running',
  startTime: new Date().getTime(),
};
let _id = id;
broadcast(clientList, 'new', currentTest)
db.get('TestResults')
  .push(currentTest)
  .write();

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
  if (data.toString().includes('FAIL')) isPassed = false;
  broadcast(clientList, 'notice', data)
});


ls.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
  if (data.toString().includes('FAIL')) isPassed = false;
  broadcast(clientList, 'notice', data)
});

ls.on('close', async (code) => {
  console.log(`child process exited with code ${code}`);
  if (_id !== id) {
    console.log('last test was updated other place.')
    return;
  }
  let endTime = new Date().getTime();
  let tmp = {
    endTime,
    status: isPassed ? 'passed' : 'failed',
    imagesPath: `/images/${id}/`,
    htmlReport: `/reports/${id}.html`
  } 
  currentTest = Object.assign({}, currentTest, tmp);
  
  // TODO: find a better memory saving way
  const srcDir = 'test';
  const destDir = 'results/images/' + id;
  console.log({srcDir}, destDir);
  await fse.copy(srcDir, destDir)

  let srcHtml = 'tmp/test-report.html';
  let destHtml = `results/reports/${id}.html`
  let r = await fse.copy(srcHtml, destHtml)
  console.log({r})

  db.get('TestResults')
    .find({id})
    .assign(currentTest)
    .write();
  broadcast(clientList, 'end', currentTest)
  id += 1;
})
}