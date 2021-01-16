var isLoading = false;

async function runTest() {
  if (!isLoading) {
  await parseCases();
  let select = document.querySelector('select')
  let value = select.value;
  let envApiTable = {
    'dev': '/test-dev',
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
} else {
  axios.post('/cancel')
  .then(res => {
    console.log(res)
  })
}
}
var term = new Terminal({
  cols: 120,
  theme: {
    foreground: '#222',
    background: '#fdf6e3'
  }
});

function findInput(target) {
  // may be li
  // may be label
  // may be input
  let name = target.nodeName.toLowerCase()
  let result;
  if (name === 'input') result = target;
  if (name === 'label') result = target.nextElementSibling.nextElementSibling
  if (name === 'li') result = target.querySelector('input');
  return result;
}
function findLi(target) {
  let name = target.nodeName.toLowerCase();
  let result;
  if (name === 'input') result = target.parentElement;
  if (name === 'label') result = target.parentElement
  if (name === 'li') result = target;
  return result;
}
window.onload = () => {
  let runningTest = document.querySelector('.test__result--running');
  console.log('running', runningTest)
  if (runningTest) {
    isLoading = true;
    this.updateButtonState()
  }
  let arrows = document.querySelectorAll('.arrow')
  arrows = Array.from(arrows);
  arrows.forEach(arrow => {

  arrow.addEventListener('click', (e) => {
    let target = e.target;
    let li = target
    while(li.nodeName.toLowerCase() !== 'li') {
      li = li.parentElement;
    }
    if (li.classList.contains('collapse')) {
      li.classList.remove('collapse')
    } else {
      li.classList.add('collapse')
    }
  })
})

  let ul = document.querySelector('.test-cases');
  console.log('ye')
  ul.addEventListener('click', (e) => {
    let target = e.target;
    // label will also trigger input's click, if the are bounding together by id.
    if (!['input', 'li'].includes(target.nodeName.toLowerCase())) {
      console.log('pity')
      return;
    }
    let input = findInput(target);
    let li = findLi(target);
    let checked = input.checked;
    let userId = li.getAttribute('data-user-id');
    let examId = li.getAttribute('data-exam-id')
    let testId = li.getAttribute('data-test-id')
    function toggleTarget(target, checked) {
      if (checked) {
        target.checked = true;
      } else {
        target.checked = false;
        // target.removeAttribute('checked')
      }
    }
    function toggleParent(li) {
      let parentLi = li.parentElement.parentElement;
      let inputChildren = parentLi.querySelectorAll('ul input')
      let parentInput = parentLi.querySelector('input');
      inputChildren = Array.from(inputChildren);
      inputChildren = inputChildren.filter(item => item !== parentInput);
      let isAllChecked = inputChildren.every(item => item.checked)
      let isAllUnchecked = inputChildren.every(item => !item.checked);
      if (isAllChecked) {
        parentInput.checked = true;
      }
      if (isAllUnchecked) {
        parentInput.checked = false;
      }
      if (parentLi.getAttribute('data-exam-id')) {
        toggleParent(parentLi);
      }
    }
    if (testId) {
      // let target = document.querySelector(`[data-user-id="${userId}"] [data-exam-id="${examId}"] [data-test-id="${testId}"] input`)
      // toggleTarget(target, checked);
      toggleParent(li);
    } else if (examId) {
      let self = li.querySelector('input')
      let targets = document.querySelectorAll(`[data-user-id="${userId}"] [data-exam-id="${examId}"] input`);
      targets = Array.from(targets);
      targets.forEach(target => {
        if (target === self) return;
        toggleTarget(target, checked);
      })
      toggleParent(li);
    } else if (userId) {
      let self = li.querySelector('input')
      let targets = document.querySelectorAll(`[data-user-id="${userId}"] input`);
      targets = Array.from(targets);
      targets.forEach(target => {
        if (target === self) return;
        console.log(target, checked)
        toggleTarget(target, checked);
      })
    }
  })
}

term.open(document.getElementById("terminal"));

const event = new EventSource("/connect");
const btnUpdateTest = document.getElementById("btn-update-test");

function updateButtonState() {
  let button = document.querySelector('.test-button')
  console.log(button)
  if (isLoading) {
    if (!button.classList.contains('is-danger')) {
      button.classList.add('is-danger')
    }
    button.innerHTML = '取消'
  } else {
    if (button.classList.contains('is-danger')) {
      button.classList.remove('is-danger')
    }
    button.innerHTML = '运行'
  }
}
event.addEventListener('stat', (e) => {
  let payload = JSON.parse(e.data);
  let data = payload;
  if (payload && payload.type && payload.type.toLowerCase() === "buffer") {
    data = new Uint8Array(payload.data);
    data = new TextDecoder("utf-8").decode(data);
    data = data.split("\n");
  }
  data = data.split('\n')
  data[0] = data[0].replace('Memory Usage', '内存使用率')
  data[1] = data[1].replace('Disk Usage', '磁盘使用率')
  data[2] = data[2].replace('CPU Load', 'CPU 负载')
  let mu = document.getElementById('memory-usage');
  mu.innerHTML = data[0];
  let du = document.getElementById('disk-usage');
  du.innerHTML = data[1];
  let cl = document.getElementById('cpu-load');
  cl.innerHTML = data[2];
})
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
  li.classList.add('test__result--' + data.status)
  li.classList.remove('test__result--running')

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
  isLoading = true;

  let li = document.createElement('li')
  li.setAttribute('data-id', data.id)
  li.classList.add('test__result')
  li.classList.add('test__result--running')
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