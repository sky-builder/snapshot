const { toMatchImageSnapshot } = require("jest-image-snapshot");
const puppeteer = require("puppeteer");
const config = require("./config");
const axios = require('axios')
const fs =require('fs')
const mg = require('merge-img')
const util = require("util")


const loginApi = `http://testyezhi.haofenshu.com/api/hfsfx/fxyz/v1/fx/200511/yj-token?username=${config.userInfo.id}&password=`
let cookie;

expect.extend({ toMatchImageSnapshot });

let browser;
beforeAll(async (done) => {
  browser = await puppeteer.launch(
    {
      // headless: false,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
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

const PAGE_TIMEOUT = 60 * 1000 * 10;

async function driver(path, waitFor) {
    const page = await browser.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT);
    await page.setCookie(cookie);

    const REPORT_PATH = path;
    const REPORT_URL = `${config.host}${REPORT_PATH}`
    console.log('running', REPORT_PATH);
    try {
      await page.goto(REPORT_URL, {
          // 等待页面加载, 直到 500ms 内没有网络请求
          // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
          waitUntil: "networkidle0",
        }
      );
      await waitFor(page);
      const image = await page.screenshot({
        fullPage: true,
      });
      expect(image).toMatchImageSnapshot();
    } catch (error) {
      const divsCounts = await page.$$eval('canvas', divs => divs.length);
      console.log({divsCounts});
      await page.screenshot({path: `report-error3.png`, fullPage: true})
      throw error;
    }
}
describe(userDesc, () => {
  describe(examDesc, () => {
    describe('命题质量报表', () => {
      // test('报表视图', async () => {
      //   const page = await browser.newPage();
      //   page.setDefaultTimeout(60 * 1000 * 2);
      //   await page.setCookie(cookie);

      //   const REPORT_PATH = '/report/question?examid=1142516-84&grade=直升高一&org=0';
      //   const REPORT_URL = `${config.host}${REPORT_PATH}`
      //   try {
      //     await page.goto(REPORT_URL, {
      //         // 等待页面加载, 直到 500ms 内没有网络请求
      //         // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
      //         waitUntil: "networkidle0",
      //       }
      //     );
      //     await page.waitForFunction("document.querySelectorAll('canvas').length === 10");
      //     // 到此, 应该所有接口都已经请求完毕, 预留渲染时间
      //     const image = await page.screenshot({
      //       fullPage: true,
      //     });
      //     expect(image).toMatchImageSnapshot();
      //   } catch (error) {
      //     await page.screenshot({path: `report-error-${new Date().toLocaleString()}.png`})
      //     throw error;
      //   }
      // })
      test('PDF 视图', async () => {
        const page = await browser.newPage();
        page.setDefaultTimeout(PAGE_TIMEOUT);
        await page.setCookie(cookie);
        const PDF_PATH = '/report/export/pdf?export=true&report=question&examid=1142516-84&org=0&pindex=4409166';
        const PDF_URL = `${config.host}${PDF_PATH}`
        // const PDF_URL = `http://127.0.0.1:8080/%E5%A5%BD%E5%88%86%E6%95%B0-%E5%88%86%E6%9E%90.html`
        try {
          await page.goto(PDF_URL, {
            // 等待页面加载, 直到 500ms 内没有网络请求
            waitUntil: "networkidle0",
          }
        );
        // await page.waitForFunction("document.querySelectorAll('canvas').length === 12");
        await page.waitForSelector('.index-tree');
        await page.waitForFunction('document.querySelector(".el-loading-mask.is-fullscreen").style.display === "none"')
        // 到此, 应该所有接口都已经请求完毕, 预留渲染时间
        // const image = await page.screenshot({
        //   fullPage: true,
        // });
        
        // await page.screenshot({fullPage: true, path: 'full.png'})
        async function f(page) {
          const bugMaxHeight = 1 * 1024;
          const dpr = page.viewport().deviceScaleFactor || 1;
          const maxScreenshotHeight = Math.floor( bugMaxHeight / dpr );
          const imgArr = [];
          const body = await page.$('body');
          const contentSize = await body.boundingBox(); 
          console.log({contentSize})
          await page.setViewport({
            width: Math.ceil(contentSize.width),
            height: Math.ceil(contentSize.height)
          })
          // 小于16 * 1024像素高的图片直接截图
          if ( contentSize.height < maxScreenshotHeight ) {
            // 防止意外发生未关闭标签页造成内存爆炸
            let timeoutID = setTimeout( () => page.close(), 2e4 )

            return page.screenshot( {
              fullPage: true
            } ).then( buffer => ( clearTimeout( timeoutID ), page.close(), buffer ) );
          }
          // 大于16 * 1024高度的图片循环截图 放在系统提供的缓存里
          let index=1;
          let mh = maxScreenshotHeight * 2;
          for ( let ypos = 0; ypos < mh; ypos += maxScreenshotHeight ) {
            const height = Math.min( mh - ypos, maxScreenshotHeight );
            let tmpName = `img-${index}.png`;
            console.log({tmpName})
            index += 1;
            await page.screenshot( {
              path: tmpName,
              clip: {
                x: 0,
                y: ypos,
                width: contentSize.width,
                height
              }
            } ) 
            // console.log({tmpName}, ypos, height, contentSize.width)
            imgArr.push( tmpName )
          }
          return imgArr;
        }
        let arr = await f(page);
        // console.log({arr})
        // let arr = ['1.jpg', '2.jpg']

        // let arr = ['img-1.png', 'img-2.png']
        console.log({arr})
        let img = await mg(arr, {
          direction: true
        });
        // let w = util.promisify(img.write);
        img.write2 = util.promisify(img.write);
        console.log("before")
        await img.write2('out.png');
        console.log("after")
        const image = fs.readFileSync('./out.png');
        console.log('3')
        expect(image).toMatchImageSnapshot();
        console.log('4')
        // img.write('out.png', () => {
        //   try {
        //     const image = fs.readFileSync('./out.png');
        //     expect(image).toMatchImageSnapshot();
        //     done();
        //   } catch (err) {
        //     done(err);
        //   }
        // })
      }  catch (error) {
        await page.screenshot({path: `pdf-report-error.png`, fullPage: true})
        throw error;
      }
      })
    })
    describe.skip('教师教学质量分析报告', () => {
      test('报表', async () => {
        let path = '/report/teacher?examid=43257-84&org=2&grade=直升初二';
        let waitFor = (page) => {
          let promise = new Promise(async (resolve, reject) => {
            try {
              let tableRowSelector = ".el-table__row";
              await page.waitForSelector(tableRowSelector);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
          return promise;
        }
        await driver(path, waitFor);
      })
    })
    describe.skip('校级分析报告', () => {
      test('报表', async () => {
        let path = '/report/total?examid=43257-84&org=2&grade=直升初二';
        let waitFor = (page) => {
          let promise = new Promise(async (resolve, reject) => {
            try {
              const canvasLength = 6;
              await page.waitForFunction(`document.querySelectorAll('canvas').length === ${canvasLength}`);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
          return promise;
        }
        await driver(path, waitFor);
      })
      test('pdf', async () => {
        let path = '/report/export?export=true&report=total&examid=43257-84&org=2';
        let waitFor = (page) => {
          let promise = new Promise(async (resolve, reject) => {
            try {
              const canvasLength = 7;
              await page.waitForFunction(`document.querySelectorAll('canvas').length === ${canvasLength}`);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
          return promise;
        }
        await driver(path, waitFor);
      })
    })
    describe.skip('班级分析报告', () => {
      test('报表', async () => {
        let path = '/report/class?examid=43257-84&grade=直升初二&org=2';
        let waitFor = (page) => {
          let promise = new Promise(async (resolve, reject) => {
            try {
              const tableLength = 4;
              await page.waitForFunction(`document.querySelectorAll('.el-table').length === ${tableLength}`);
              const canvasLength = 2;
              await page.waitForFunction(`document.querySelectorAll('canvas').length === ${canvasLength}`);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
          return promise;
        }
        await driver(path, waitFor);
      })
    })
    describe.skip('学生成绩分析', () => {
      test('直升初19级4班 => 丁涵', async () => {
        const page = await browser.newPage();
        page.setDefaultTimeout(60 * 1000 * 2);
        await page.setCookie(cookie);
    
        const REPORT_PATH = '/report/student?examid=43257-84&org=2&grade=直升初二';
        const REPORT_URL = `${config.host}${REPORT_PATH}`
        await page.goto(REPORT_URL, {
          waitUntil: "networkidle0"
        });

        try {
          await page.waitForFunction(`document.querySelectorAll('.el-select').length === 2`)
          const dropDownList = await page.$$('.el-select');
          // trigger banji dropdown
          await dropDownList[0].click();
          // wait for banji list appears
          let list = await page.waitForSelector('.el-select-dropdown__list > li')
          // select first banji
          await list.click();
          // wait for students response
          let res = await page.waitForResponse((res) => res.url().includes('/report/obt/v2/student/list'))
          // trigger students dropdown
          await dropDownList[1].click();
          let els = await page.$$('.el-select-dropdown');
          let a = await els[0].boxModel();
          let b = await els[1].boxModel();
          let me = a ? els[0] : els[1];
          // find first student
          let target = await me.$('.el-select-dropdown__list > li')
          // click first student
          await target.click();

          // wait for render complete
          await page.waitForFunction(`document.querySelectorAll('.el-table').length === 3`)
          await page.waitForFunction(`document.querySelectorAll('canvas').length === 1`)

          let image = await page.screenshot({fullPage: true})
          expect(image).toMatchImageSnapshot();
        } catch (e) {
          let errorImagePath = `error_student-score.png`;
          await page.screenshot({path: errorImagePath, fullPage: true})
          console.error(e);
        }
      })
    })
    describe.skip('必备知识、关键能力与学科素养分析报告', () => {
      test('报表', async () => {
        let path = '/report/knowledge?examid=43257-84&org=2&grade=直升初二';
        let waitFor = (page) => {
          let promise = new Promise(async (resolve, reject) => {
            try {
              const tableLength = 6;
              await page.waitForFunction(`document.querySelectorAll('.el-table').length === ${tableLength}`);
              const canvasLength = 2;
              await page.waitForFunction(`document.querySelectorAll('canvas').length === ${canvasLength}`);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
          return promise;
        }
        await driver(path, waitFor);
      })
      test('pdf', async () => {
        let path = '/report/knowledge?examid=43257-84&org=2&grade=直升初二';
        let waitFor = (page) => {
          let promise = new Promise(async (resolve, reject) => {
            try {
              const tableLength = 6;
              await page.waitForFunction(`document.querySelectorAll('.el-table').length === ${tableLength}`);
              const canvasLength = 2;
              await page.waitForFunction(`document.querySelectorAll('canvas').length === ${canvasLength}`);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
          return promise;
        }
        const page = await browser.newPage();
        page.setDefaultTimeout(PAGE_TIMEOUT);
        await page.setCookie(cookie);
      
        const REPORT_PATH = path;
        const REPORT_URL = `${config.host}${REPORT_PATH}`
        await page.goto(REPORT_URL, {
            // 等待页面加载, 直到 500ms 内没有网络请求
            // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
            waitUntil: "networkidle0",
          }
        );
        await waitFor(page);
        // 查看 pdf 按钮
        let button = await page.$('.total-title-btn');
        // pdf 页面
        const [popup] = await Promise.all([
          new Promise(resolve => page.once('popup', resolve)),
          button.click()
        ]);
        const CANVAS_LENGTH = 7;
        // 等待页面所有图表渲染完毕
        await popup.waitForFunction(`document.querySelectorAll('canvas').length === ${CANVAS_LENGTH}`);
        const SELECTOR = '.index-tree-item';
        const SELECTOR_LENGTH = 9;
        // 等待页面目录生成完毕
        await popup.waitForFunction(`document.querySelectorAll('${SELECTOR}').length === ${SELECTOR_LENGTH}`);
        // 等待页面 loading 消失
        await popup.waitForFunction('document.querySelector(".el-loading-mask.is-fullscreen").style.display === "none"')
        const image = await popup.screenshot({
          fullPage: true,
        });
        console.log({image})
        fs.writeFileSync('./kn.png', image);
        expect(image).toMatchImageSnapshot();
      })
    })
    describe.skip("常用综合报表", () => {
      describe("排行榜", () => {
        // test("查看所有班级", async () => {
        //   const page = await browser.newPage();
        //   await page.setCookie(cookie);
        //   const PATH = '/report/table?examid=1142516-84&org=0&grade=直升高一';
        //   const URL = `${config.host}${PATH}`;
        //   try {
        //   await page.goto(URL, {
        //     waitUntil: "networkidle0",
        //   });
        //   let tableRowSelector = ".el-table__row";
        //   await page.waitForSelector(tableRowSelector);
        //   const image = await page.screenshot({
        //     fullPage: true,
        //   });
        //   expect(image).toMatchImageSnapshot();
        // } catch (error) {
        //   await page.screenshot({path: `pdf-report-error-${new Date().toLocaleString()}.png`})
        //   throw error;
        // }
        // });
      //   test("查看单科", async () => {
      //     const page = await browser.newPage();
      //     await page.setCookie(config.cookie);
      //     const url =
      //       "http://localhost:8080/table?examid=1500-84&grade=%E9%AB%98%E4%BA%8C&org=0";
      //     await page.goto(url, {
      //       waitUntil: "networkidle0",
      //     });
      //     const tableRowSelector = '.el-table__row'
      //     await page.waitForSelector(tableRowSelector);
      //     const subjectRadioSelector = '.el-radio-button';
      //     const subjectRadios = await page.$$(subjectRadioSelector);
      //     const target = subjectRadios[1];
      //     // 点击总分外的第一个科目
      //     await target.click();
      //     // 等待该科目数据返回
      //     await page.waitForResponse((res) =>
      //       res
      //         .url()
      //         .includes(
      //           "/obt/v1/exam/irrank?examid=1500-84&org=0&grade=%E9%AB%98%E4%BA%8C"
      //         )
      //     );
      //     // 预留渲染时间
      //     await page.waitFor(3000);
      //     const image = await page.screenshot({
      //       fullPage: true,
      //     });
      //     expect(image).toMatchImageSnapshot();
      //   });
      });
    });
  });
});

afterAll(async (done) => {
  await browser.close();
  done();
});
 