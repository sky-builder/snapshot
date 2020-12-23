function updateTest() {
  axios
    .post("/test-update")
    .then((res) => {
      console.log({ res });
    })
    .catch((err) => {
      console.error(err);
    });
}

function runTest(env) {
  let envApiTable = {
    'test': '/test-test',
  }
  let api = envApiTable[env];
  axios.post(api)
  .then((res) => {
    console.log({ res });
  })
  .catch((err) => {
    console.error(err);
  });
}
var term = new Terminal({
  cols: 200,
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
  isLoading = false;
  updateButtonState();
});
