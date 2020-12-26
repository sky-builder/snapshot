const axios = require('axios')
const puppeteer = require("puppeteer");
const { toMatchImageSnapshot } = require("jest-image-snapshot");

const config = require("./config");
const reportList = require('./report-list.json');
const utils = require('../../utils');

let cookie;
let browser;

const loginApi = config.getLoginApi(config.userInfo.id);
const PAGE_TIMEOUT = 60 * 1000 * 5;

expect.extend({ toMatchImageSnapshot });

beforeAll(async (done) => {
  browser = await puppeteer.launch(
    {
      headless: false,
      args: [ 
        '--no-sandbox', 
        '--disable-dev-shm-usage'
      ]
    }
  );
  let res = await axios.get(loginApi);
  let token = res.data.data.token;
  cookie = {
    name: 'fxtoken',
    value: token,
    domain: '.haofenshu.com',
  }
  done();
});

let examDesc = `${config.examInfo.name}(${config.examInfo.id})`;
let userDesc = `${config.userInfo.name}(${config.userInfo.id})`;

describe(userDesc + examDesc, () => {
  // TODO: filter custom runner
  const list = reportList.filter(item => !item.isCustom);
  for(let i = 0; i < list.length; i += 1) {
    if (list[i].isSkip) continue;
    test(list[i].name, async () => {
      const options = Object.assign({}, list[i], {
        cookie,
        host: config.host,
        PAGE_TIMEOUT
      })
      let runner = list[i].runner;
      await utils[runner](browser, options);
    })
  }
});

afterAll(async (done) => {
  await browser.close();
  done();
});
