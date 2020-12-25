const { spawn } = require('child_process');
const express = require('express')
const app = express();
const humanizeDuration = require('humanize-duration')
const fse = require('fs-extra');
const FileSync = require('lowdb/adapters/FileSync')
const low = require('lowdb')
const adapter = new FileSync('db.json')
const db = low(adapter)
const bodyParser = require('body-parser');
db.defaults({ TestResults: []})
  .write()
let tests = db.get('TestResults')
        .orderBy('id', 'desc')
        .take(1)
        .value()

let id = 1;
if (tests && tests.length) {
  id = tests[0].id + 1;
}

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.set('view engine', 'pug')
app.set('views', './views')
var serveIndex = require('serve-index')
let lastResult = {
  startTime: '',
  endTime: '',
  status: '',
}
app.get('/', function (req, res) {
  let testResults = db.get('TestResults')
  .orderBy('endTime', 'desc')
  .take(5)
  .value()
  let testCases = require('./sync.json')
  res.render('index', { humanizeDuration, currentResult: testResults && testResults.length ? testResults[0] : null, results: testResults, testCases})
  
})

let path = require('path');
let public = path.join(__dirname, 'public')
let reports = path.join(__dirname, 'reports')
let test = path.join(__dirname, 'images')
app.use(express.static(public))
app.use('/reports', express.static(reports))
app.use('/images', express.static(test), serveIndex(test, {'icons': true}))
let clientList = [];
function tellAll(clientList, eventName, data) {
  clientList.forEach(client => {
  client.write(`event: ${eventName}\n`);
    client.write(`data: ${JSON.stringify({msg: JSON.stringify(data)})}\n\n`);
  })
}
app.post('/test-test', (req, res) => {
  let ls = spawn('npm.cmd', ['run', 'test-test'])
  
  let isOk = true;
  ls.stdout.on('data', (data) => {
    if (data.toString().includes('FAIL')) isOk = false;
    console.log(`stdout: ${data}`);
    tellAll(clientList, 'notice', data)
  });

  ls.stderr.on('data', (data) => {
    if (data.toString().includes('FAIL')) isOk = false;
    console.log(`stderr: ${data}`);
    tellAll(clientList, 'notice', data)
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    res.end('thank you')
    
    tellAll(clientList, 'end', 'thank you')
  })
})
app.post('/sync', async(req, res) => {
  let cases = req.body.cases;
  console.log(req.body);
  console.log({cases})
  if (cases) {
    cases.forEach(c => {
      let userId = c.userId;
      c.examList.forEach(e => {
        let examId = e.examId;
        let p = path.join(__dirname, 'test', userId, examId, 'report-list.json');
        let j = fse.readFileSync(p);
        j = j.toString();
        j = JSON.parse(j);
        console.log({j})
        console.log({e})
        e.reportList.forEach(re => {
          let match = j.find(item => item.name === re.name);
          console.log({match})
          match.isSkip = re.isSkip;
        })
        fse.writeFileSync(path.join(__dirname, 'test', userId, examId, 'report-list.json'), JSON.stringify(j));
      })
    })
  }
  res.end('hi')
})
app.post('/test-update', async (req, res) => {
  let isOk = true;
 
  let ls = spawn('npm.cmd', ['run', 'test-update'])
  // TODO: find has running and reject if running = true
  let t = {
    id: id,
    status: 'running',
    startTime: new Date().getTime(),
  }
  tellAll(clientList, 'new', t)
  db.get('TestResults')
  .push(t)
  .write();
  
  ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    if (data.toString().includes('FAIL')) isOk = false;
    tellAll(clientList, 'notice', data)
  });

  ls.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
    if (data.toString().includes('FAIL')) isOk = false;
    tellAll(clientList, 'notice', data)
  });
  
  ls.on('close', async (code) => {
    console.log(`child process exited with code ${code}`);
    res.end('thank you')
    let endTime = new Date().getTime();
    lastResult = {
      cmd: 'update',
      endTime,
      status: isOk ? 'passed' : 'failed',
      imagesPath: `/images/${id}/`,
      htmlReport: `/reports/${id}.html`
    } 
    t = Object.assign({}, t, lastResult);
    const srcDir = 'test';
    const destDir = 'images/' + id;
    await fse.copy(srcDir, destDir)
    let srcHtml = 'public/test-report.html';
    let destHtml = `reports/${id}.html`
    await fse.copy(srcHtml, destHtml)
    db.get('TestResults').find({id: id})
    .assign(t)
    .write();
    id += 1;
    tellAll(clientList, 'end', t)
  })
})

app.get('/connect', (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers)
  clientList.push(res);

})

app.listen(3000, () => {
  console.log('listening');
})