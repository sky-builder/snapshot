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
userIds.forEach(userId => {
  let user = configObject[userId];
  describe(user.name, () => {
    beforeAll(async (done) => {
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

