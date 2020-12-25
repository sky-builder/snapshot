const { toMatchImageSnapshot } = require("jest-image-snapshot");
const puppeteer = require("puppeteer");
const config = require("./config");
let browser;

expect.extend({ toMatchImageSnapshot });

beforeAll(async (done) => {
  browser = await puppeteer.launch();
  done();
});

describe("账号：北京市11学校超级管理员", () => {
  describe("考试：1500", () => {
    describe('命题质量报表', () => {
      test('报表视图', async () => {
        const page = await browser.newPage();
        await page.setCookie(config.cookie);
        await page.goto(
          "http://localhost:8080/question?examid=1131343-84&grade=%E9%AB%98%E4%B8%89&org=0",
          {
            // 等待页面加载, 直到 500ms 内没有网络请求
            // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
            waitUntil: "networkidle0",
          }
        );
        // 到此, 应该所有接口都已经请求完毕, 预留渲染时间
        await page.waitForTimeout(1000 * 3);
        const image = await page.screenshot({
          fullPage: true,
        });
        expect(image).toMatchImageSnapshot();
      })
      test('PDF 视图', async () => {
        const page = await browser.newPage();
        await page.setCookie(config.cookie);
        await page.goto(
          "http://localhost:8080/export/pdf?export=true&report=question&examid=1131343-84&org=0&pindex=4356892",
          {
            // 等待页面加载, 直到 500ms 内没有网络请求
            waitUntil: "networkidle0",
          }
        );
        // 到此, 应该所有接口都已经请求完毕, 预留渲染时间
        await page.waitForTimeout(1000 * 3);
        const image = await page.screenshot({
          fullPage: true,
        });
        expect(image).toMatchImageSnapshot();
      })
    })
    describe("常用综合报表", () => {
      describe("排行榜", () => {
        test("查看所有班级", async () => {
          const page = await browser.newPage();
          await page.setCookie(config.cookie);
          const url =
            "http://localhost:8080/table?examid=1500-84&grade=%E9%AB%98%E4%BA%8C&org=0";
          await page.goto(url, {
            waitUntil: "networkidle0",
          });
          let tableRowSelector = ".el-table__row";
          await page.waitForSelector(tableRowSelector);
          const image = await page.screenshot({
            fullPage: true,
          });
          expect(image).toMatchImageSnapshot();
        });
        test("查看单科", async () => {
          const page = await browser.newPage();
          await page.setCookie(config.cookie);
          const url =
            "http://localhost:8080/table?examid=1500-84&grade=%E9%AB%98%E4%BA%8C&org=0";
          await page.goto(url, {
            waitUntil: "networkidle0",
          });
          const tableRowSelector = '.el-table__row'
          await page.waitForSelector(tableRowSelector);
          const subjectRadioSelector = '.el-radio-button';
          const subjectRadios = await page.$$(subjectRadioSelector);
          const target = subjectRadios[1];
          // 点击总分外的第一个科目
          await target.click();
          // 等待该科目数据返回
          await page.waitForResponse((res) =>
            res
              .url()
              .includes(
                "/obt/v1/exam/irrank?examid=1500-84&org=0&grade=%E9%AB%98%E4%BA%8C"
              )
          );
          // 预留渲染时间
          await page.waitFor(3000);
          const image = await page.screenshot({
            fullPage: true,
          });
          expect(image).toMatchImageSnapshot();
        });
      });
    });
  });
});

afterAll(async (done) => {
  await browser.close();
  done();
});
