const axios = require('axios')
const puppeteer = require("puppeteer");
const { toMatchImageSnapshot } = require("jest-image-snapshot");

const config = require("./config");
const reportList = require('./report-list.json');
const utils = require('../../utils');

let cookie;
let browser;

const loginApi = config.getLoginApi(config.userInfo.id);

expect.extend({ toMatchImageSnapshot });

beforeAll(async (done) => {
  browser = await puppeteer.launch(
    {
      // headless: false,
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
  reportList.forEach(item => {
    if (item.isSkip) {
      test.todo(item.name)
      return;
    }
    let {
      name,
      runner,
      isPdf
    } = item;
    if (isPdf) {
      test(`${name}-PDF`, async () => {
        const options = Object.assign({}, config, item, { cookie });
        let { page, clipList } = await utils[runner](browser, options);
        for (let i = 0; i < clipList.length; i += 1) {
          let image = await page.screenshot({
            clip: clipList[i],
          });
          expect(image).toMatchImageSnapshot();
        }
      })
    } else {
      test(`${name}`, async () => {
        const options = Object.assign({}, config, item, { cookie });
        await utils[runner](browser, options);
      })
    }
  })
});

afterAll(async (done) => {
  await browser.close();
  done();
});
