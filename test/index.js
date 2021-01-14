const axios = require("axios");
const puppeteer = require("puppeteer");
const { toMatchImageSnapshot } = require("jest-image-snapshot");
const configObject = require("./test-cases");

const config = require("./config");
const utils = require("./utils");

let cookie;
let browser;

expect.extend({ toMatchImageSnapshot });
let userIds = Object.keys(configObject);
// TODO: add isSkip file to user
function judgeHasTests(u) {
  let idExamMap = u.idExamMap;
  let examIds = Object.keys(idExamMap);
  for(let i = 0, len = examIds.length; i < len; i += 1) {
    let examId = examIds[i];
    let tcs = u.idExamMap[examId].testCases;
    console.log({tcs})
    if (tcs.some(item => !item.isSkip)) {
      return true;
    }
  }
  return false;
}
userIds.forEach(userId => {
let user = configObject[userId];
describe(user.name, () => {
let hasTests = judgeHasTests(user);
beforeAll(async (done) => {
      if (!hasTests) {
        done();
        return;
      }
      browser = await puppeteer.launch({
        // headless: false,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
        const loginApi = config.getLoginApi(userId);
        let res = await axios.get(loginApi);
      let token = res.data.data.token;
      cookie = {
        name: "fxtoken",
        value: token,
        domain: ".haofenshu.com",
      };
      done();
    });
    afterAll(async (done) => {
      if (!hasTests) {
        done();
        return;
      }
      await browser.close();
      done();
    });
    let examIds = Object.keys(user.idExamMap);
    examIds.forEach(examId => {
      let exam = user.idExamMap[examId];
      describe(exam.name, () => {
      let testCases = exam.testCases;
        testCases.forEach(tc => {
      if (tc.isSkip) {
            test.todo(tc.name);
            return;
          }
          let {
            name,
            runner,
            isPdf
          } = tc;
          if (isPdf) {
            test(name, async () => {
              const options = Object.assign({}, config, tc, { cookie });
              let { page, clipList } = await utils[runner](browser, options);
              for (let i = 0; i < clipList.length; i += 1) {
                let image = await page.screenshot({
                  clip: clipList[i],
                });
                expect(image).toMatchImageSnapshot();
              }
              await page.close();
            })
          } else {
            test(`${name}`, async () => {
              const options = Object.assign({}, config, tc, { cookie });
              await utils[runner](browser, options);
            })
          }
        })
      })
    })

  })
})

