const bodyParser = require('body-parser');
const serveIndex = require('serve-index')
const express = require('express')
const app = express();

const humanizeDuration = require('humanize-duration')

const { spawn } = require('child_process');
const fse = require('fs-extra');
const path = require('path')

const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const low = require('lowdb');
const { runInContext } = require('vm');
const db = low(adapter)

db.defaults({ TestResults: []})
  .write()

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

app.get('/', function (req, res) {
  let testResults = db.get('TestResults')
    .orderBy('endTime', 'desc')
    .take(10)
    .value()
  let testCases = require('./sync.json')
  let payload = {
    humanizeDuration,
    results: testResults,
    testCases: testCases
  }
  res.render('index', payload)
})

let clientList = [];
function broadcast(clientList, eventName, data) {
  clientList.forEach(client => {
  client.write(`event: ${eventName}\n`);
  // TODO: simplify structure
    client.write(`data: ${JSON.stringify({msg: JSON.stringify(data)})}\n\n`);
  })
}

app.post('/test-test', (req, res) => {
  let ls = spawn('npm.cmd', ['run', 'test-test'])
  
  let isPassed = true;
  ls.stdout.on('data', (data) => {
    if (data.toString().includes('FAIL')) isPassed = false;
    console.log(`stdout: ${data}`);
    broadcast(clientList, 'notice', data)
  });

  ls.stderr.on('data', (data) => {
    if (data.toString().includes('FAIL')) isPassed = false;
    console.log(`stderr: ${data}`);
    broadcast(clientList, 'notice', data)
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    res.end('thank you')
    
    broadcast(clientList, 'end', 'thank you')
  })
})

// 将用户选择的测试范围用来更新 report-list.json
app.post('/sync', async(req, res) => {
  let { cases } = req.body;
  if (cases) {
    cases.forEach(c => {
      let userId = c.userId;
      c.examList.forEach(e => {
        let examId = e.examId;
        let reportListPath = path.join(__dirname, 'test', userId, examId, 'report-list.json');
        let reportList = fse.readFileSync(reportListPath);
        reportList = reportList.toString();
        reportList = JSON.parse(reportList);
        e.reportList.forEach(re => {
          let match = reportList.find(item => item.name === re.name);
          if (match) {
            match.isSkip = re.isSkip;
          }
        })
        fse.writeFileSync(reportListPath, JSON.stringify(reportList));
      })
    })
  }
  res.end('ok')
})

app.post('/test-update', async (req, res) => {
  let runningCase = 
    db.get('testResults')
      .find(item => item.status === 'running')
      .value()
  if (runningCase) {
    console.log({runningCase})
    res.end('there is running case, please wait.')
    return;
  }
  let ls = spawn('npm.cmd', ['run', 'test-update'])

  let isPassed = true;
  let currentTest = {
    id: id,
    status: 'running',
    startTime: new Date().getTime(),
  };

  broadcast(clientList, 'new', currentTest)
  db.get('TestResults')
    .push(currentTest)
    .write();
  
  ls.stdout.on('data', (data) => {
    // console.log(`stdout: ${data}`);
    if (data.toString().includes('FAIL')) isPassed = false;
    broadcast(clientList, 'notice', data)
  });

  ls.stderr.on('data', (data) => {
    // console.log(`stderr: ${data}`);
    if (data.toString().includes('FAIL')) isPassed = false;
    broadcast(clientList, 'notice', data)
  });
  
  ls.on('close', async (code) => {
    console.log(`child process exited with code ${code}`);

    let endTime = new Date().getTime();
    let tmp = {
      cmd: 'update',
      endTime,
      status: isPassed ? 'passed' : 'failed',
      imagesPath: `/images/${id}/`,
      htmlReport: `/reports/${id}.html`
    } 
    currentTest = Object.assign({}, currentTest, tmp);
    
    // TODO: find a better memory saving way
    const srcDir = 'test';
    const destDir = '/results/images/' + id;
    await fse.copy(srcDir, destDir)

    let srcHtml = 'public/test-report.html';
    let destHtml = `/results/reports/${id}.html`
    await fse.copy(srcHtml, destHtml)

    db.get('TestResults')
      .find({id})
      .assign(currentTest)
      .write();
    broadcast(clientList, 'end', currentTest)
    id += 1;
    res.end('ok')
  })
})

app.get('/connect', (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers)
  // TODO: remove client on need
  clientList.push(res);

})

app.listen(3000, () => {
  console.log('server listening on port: 3000.');
})