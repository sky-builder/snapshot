const { spawn } = require('child_process');
const express = require('express')
const app = express();
app.set('view engine', 'pug')
app.set('views', './views')
app.get('/', function (req, res) {
  res.render('index', { title: 'Hey', message: 'Hello there!' })
})
let path = require('path')
let public = path.join(__dirname, 'public')
app.use(express.static(public))
let clientList = [];
function tellAll(clientList, data) {
 
  clientList.forEach(client => {
    client.write(`event: notice\n`);
    client.write(`data: ${JSON.stringify({msg: JSON.stringify(data)})}\n\n`);
  })
}
app.post('/test', (req, res) => {
  let ls = spawn('npm.cmd', ['run', 'test-update'])
  
  ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    tellAll(clientList, data)
  });

  ls.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
    tellAll(clientList, data)
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    res.end('thank you')
    tellAll(clientList, 'thank you')
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