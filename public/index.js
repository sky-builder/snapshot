async function runTest() {
  await parseCases();
  let select = document.querySelector('select')
  let value = select.value;
  let envApiTable = {
    'test': '/test-test',
    'update': '/test-update',
    'gray': '/test-gray',
    'release': '/test-release'
  }
  let api = envApiTable[value];
  axios.post(api)
  .then((res) => {
    console.log({ res });
  })
  .catch((err) => {
    console.error(err);
  });
}
var term = new Terminal({
  cols: 80,
  theme: {
    foreground: '#222',
    background: '#fdf6e3'
  }
});

term.open(document.getElementById("terminal"));
term.write("Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ");

const event = new EventSource("/connect");
let isLoading = false;
const btnUpdateTest = document.getElementById("btn-update-test");

function updateButtonState() {
  let buttonList = document.querySelectorAll('.test-button')
  buttonList = Array.from(buttonList)
  let method = isLoading ? 'add' : 'remove';
  buttonList.forEach(button => {
    button.classList[method]("is-loading");
  })
}
event.addEventListener("notice", (e) => {
  if (!isLoading) {
    isLoading = true;
    updateButtonState();
  }
  // let data = JSON.parse(e.data);
  let data = e.data;
  data = JSON.parse(data);
  let msg = data.msg;
  msg = JSON.parse(msg);
  if (typeof msg === "object") {
    let data = new Uint8Array(msg.data);
    data = new TextDecoder("utf-8").decode(data);
    data = data.split("\n");
    data.forEach((line) => {
      console.log(line);
      term.write(line + "\n\r");
    });
  } else {
    console.log(data);
    term.write(data + "\n\r");
  }
});
event.addEventListener("end", (e) => {
  let data = e.data;
  let json = JSON.parse(data);
  let msg = json.msg;
  let msgJson = JSON.parse(msg);
  let li = document.querySelector(`[data-id='${msgJson.id}']`);
  let status = li.querySelector('.test__status')
  status.innerHTML = msgJson.status;

  let cmd = document.createElement('div');
  cmd.innerHTML = `命令: ${msgJson.cmd}`;

  let started = document.createElement('div')
  started.innerHTML = `'开始时间: ' + ${new Date(msgJson.startTime).toLocaleString()}`

  let finished = document.createElement('div');
  finished.innerHTML = `'结束时间: ' + ${new Date(msgJson.endTime).toLocaleString()}`

  let duration = msgJson.endTime - msgJson.startTime;
  duration = humanizeDuration(duration);

  let d = document.createElement('div')
  d.innerHTML = `持续时间: ${duration}`;

  let htmlReport = document.createElement('a');
  htmlReport.href = msgJson.htmlReport;
  htmlReport.innerHTML = '查看运行报告'

  let checkImages = document.createElement('a');
  checkImages.href= msgJson.imagesPath;
  checkImages.innerHTML = '查看图片'
  if (msgJson.status === 'passed') {
    li.classList.add('test__result--passed')
  } else {
    li.classList.add('test__result--failed')
  }

  li.appendChild(cmd)
  li.appendChild(started)
  li.appendChild(finished)
  li.appendChild(d)
  li.appendChild(htmlReport)
  li.appendChild(document.createElement('br'))
  li.appendChild(checkImages)

  isLoading = false;
  updateButtonState();
});

event.addEventListener("new", (e) => {
  let data = e.data;
  let json = JSON.parse(data);
  let msg = json.msg;
  let msgJson = JSON.parse(msg);
  isLoading = false;

  let li = document.createElement('li')
  li.setAttribute('data-id', msgJson.id)
  li.classList.add('test__result')
  let id = document.createElement('div')
  id.innerHTML = '#' + msgJson.id;
  let status = document.createElement('div');
  status.classList.add('test__status')
  status.innerHTML = msgJson.status;
  li.appendChild(id);
  li.appendChild(status);
  console.log(li)
  let ul = document.querySelector('.test__result-list');
  ul.insertBefore(li, ul.firstElementChild)

  updateButtonState();
});

async function parseCases() {
  return new Promise((resolve, reject) => {

    let users = document.querySelectorAll('.test__user-id');
    
    users = Array.from(users);
    let result = [];
    users.forEach(u => {
      let o = {};
      o.userId = u.getAttribute('data-id');
      o.examList = [];
      let exams = u.querySelectorAll('.test__exam-id');
      exams.forEach(e => {
        let oo = {};
        oo.reportList = [];
        oo.examId = e.getAttribute('data-id');
        let reports = e.querySelectorAll('.test__report-name')
        reports = Array.from(reports);
        reports.forEach(re => {
          let ooo = {};
          ooo.name = re.getAttribute('data-id');
          console.log(re.querySelector('input'))
          let input = re.querySelector('input').checked
          ooo.isSkip = !input;
          oo.reportList.push(ooo);
        })
        o.examList.push(oo);
      })
      result.push(o);
    })
    console.log(result);
    axios.post('/sync', {cases: result})
    .then(res => {
      console.log({res})
      resolve();
    })
    .catch(err => {
      console.error(err)
      reject(err)
    })
  })
}