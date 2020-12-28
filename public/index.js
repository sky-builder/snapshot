async function runTest() {
  await parseCases();
  let select = document.querySelector('select')
  let value = select.value;
  let envApiTable = {
    'test': '/test-test',
    'update': '/test-update',
    'gray': '/test-gray',
    'prod': '/test-prod'
  }
  let api = envApiTable[value];
  axios.post(api)
  .catch((err) => {
    console.error(err);
  });
}
var term = new Terminal({
  cols: 120,
  theme: {
    foreground: '#222',
    background: '#fdf6e3'
  }
});

term.open(document.getElementById("terminal"));

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
  let payload = JSON.parse(e.data);
  if (payload && payload.type.toLowerCase() === "buffer") {
    let data = new Uint8Array(payload.data);
    data = new TextDecoder("utf-8").decode(data);
    data = data.split("\n");
    data.forEach((line) => {
      term.write(line + "\n\r");
    });
  } else {
    term.write(data + "\n\r");
  }
});
event.addEventListener("end", (e) => {
  let data = JSON.parse(e.data);
  let li = document.querySelector(`[data-id='${data.id}']`);
  let status = li.querySelector('.test__status')
  status.innerHTML = data.status;

  let cmd = document.createElement('div');
  cmd.innerHTML = `命令: ${data.cmd}`;

  let started = document.createElement('div')
  started.innerHTML = `开始时间: ${new Date(data.startTime).toLocaleString()}`

  let finished = document.createElement('div');
  finished.innerHTML = `结束时间: ${new Date(data.endTime).toLocaleString()}`

  let duration = data.endTime - data.startTime;
  duration = humanizeDuration(duration);

  let d = document.createElement('div')
  d.innerHTML = `持续时间: ${duration}`;

  let htmlReport = document.createElement('a');
  htmlReport.href = data.htmlReport;
  htmlReport.innerHTML = '查看运行报告'

  let checkImages = document.createElement('a');
  checkImages.href= data.imagesPath;
  checkImages.innerHTML = '查看图片'
  if (data.status === 'passed') {
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
  let data = JSON.parse(e.data);
  isLoading = false;

  let li = document.createElement('li')
  li.setAttribute('data-id', data.id)
  li.classList.add('test__result')
  let id = document.createElement('div')
  id.innerHTML = '#' + data.id;
  let status = document.createElement('div');
  status.classList.add('test__status')
  status.innerHTML = data.status;
  li.appendChild(id);
  li.appendChild(status);
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
          let input = re.querySelector('input').checked
          ooo.isSkip = !input;
          oo.reportList.push(ooo);
        })
        o.examList.push(oo);
      })
      result.push(o);
    })
    axios.post('/sync', {cases: result})
    .then(res => {
      resolve(res);
    })
    .catch(err => {
      console.error(err)
      reject(err)
    })
  })
}