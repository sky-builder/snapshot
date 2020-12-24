const { spawn } = require('child_process');
const express = require('express')
const app = express();
const humanizeDuration = require('humanize-duration')
const fse = require('fs-extra');
const FileSync = require('lowdb/adapters/FileSync')
const low = require('lowdb')
const adapter = new FileSync('db.json')
const db = low(adapter)
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
  .take(5)
  .value()
  res.render('index', { humanizeDuration, currentResult: testResults && testResults.length ? testResults[0] : null, results: testResults})
  
})

let path = require('path');
let public = path.join(__dirname, 'public')
let test = path.join(__dirname, 'images')
app.use(express.static(public))
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

app.post('/test-update', async (req, res) => {
  let isOk = true;
  let startTime = new Date().getTime();
  let ls = spawn('npm.cmd', ['run', 'test-update'])
  
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
      endTime,
      startTime,
      status: isOk ? 'passed' : 'failed',
      id: id,
      imagesPath: `/images/${id}/`,
    } 
    const srcDir = 'test';
    const destDir = 'images/' + id;
    await fse.copy(srcDir, destDir)
    id += 1;
    db.get('TestResults').push(lastResult)
    .write();
    tellAll(clientList, 'end', lastResult)
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