const { toMatchImageSnapshot } = require("jest-image-snapshot");
const puppeteer = require("puppeteer");
const config = require("./config");
const axios = require('axios')
const fs =require('fs')
const mg = require('merge-img')
const util = require("util");
const path = require('path');



function cleanDir(dir) {
  let files = fs.readdirSync(dir);
  for(let i = 0; i < files.length; i += 1) {
    let p = path.join(dir, files[i]);
    fs.unlinkSync(p);
  }
}

const loginApi = `http://testyezhi.haofenshu.com/api/hfsfx/fxyz/v1/fx/200511/yj-token?username=${config.userInfo.id}&password=`
let cookie;

expect.extend({ toMatchImageSnapshot });

let browser;
beforeAll(async (done) => {
  // cleanDir('tmp');
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

const PAGE_TIMEOUT = 60 * 1000 * 5;

async function waitForFns(page, fns) {
  let promiseArr = [];
  fns.forEach((fn) => {
    let ps = page.waitForFunction(fn)
    promiseArr.push(ps);
  })
  await Promise.all(promiseArr);
}
async function testRunner(report, option) {
  const {
    path,
    name,
    waitArr
  } = option;
  console.log('start running', report, name, path)
  const page = await browser.newPage();
  // await page.setViewport({width: 800, height: 600, deviceScaleFactor: 0.8})
  page.setDefaultTimeout(PAGE_TIMEOUT);
  await page.setCookie(cookie);
  const URL = `${config.host}${path}`
  await page.goto(URL, {
    // 等待页面加载, 直到 500ms 内没有网络请求
    // 另一种等待方式, 比较麻烦: 找出页面用到的所有接口, 使用 waitForResponse 等待所有接口返回
    waitUntil: "networkidle0",
  }
);
  console.log(report, name, 'waiting elements')
  await waitForFns(page, waitArr);
  
  console.log(report, name, 'waiting screenshot')
  let image = await takeFullPageScreenShot(page);
  await page.close();

  console.log(report, name, 'waiting assertion')
  expect(image).toMatchImageSnapshot()
  console.log('stop running', report, name)
}

async function takeFullPageScreenShot(page, from) {
  const bugMaxHeight = 16 * 1024;
  const dpr = page.viewport().deviceScaleFactor || 1;
  const maxScreenshotHeight = Math.floor( bugMaxHeight / dpr );
  const imgArr = [];
  const body = await page.$('body');
  const contentSize = await body.boundingBox(); 
  await page.setViewport({
    width: Math.ceil(contentSize.width),
    height: Math.ceil(contentSize.height)
  })
  // 小于16 * 1024像素高的图片直接截图
  if ( contentSize.height < maxScreenshotHeight ) {
    // 防止意外发生未关闭标签页造成内存爆炸
    // let timeoutID = setTimeout( () => page.close(), 2e4 )

    // let image = await page.screenshot( {
    //   fullPage: true
    // } ).then( buffer => ( clearTimeout( timeoutID ), page.close(), buffer ) );
    const image = await page.screenshot({
      fullPage: true
    })
    return image;
  }
  // 大于16 * 1024高度的图片循环截图 放在系统提供的缓存里
  let index = 1;
  let mh = contentSize.height;
  for ( let ypos = 0; ypos < mh; ypos += maxScreenshotHeight ) {
    const height = Math.min( mh - ypos, maxScreenshotHeight );
    let tmpName = `./tmp/${from ? from + '-' : ''}section-${index}.png`;
    index += 1;
    await page.screenshot({
      path: tmpName,
      clip: {
        x: 0,
        y: ypos,
        width: contentSize.width,
        height
      }
    }) 
    imgArr.push( tmpName )
  }
  let mgImg = await mg(imgArr, {
  // merge image vertically
    direction: true
  });
  mgImg.writePromise = util.promisify(mgImg.write);
  await mgImg.writePromise(`./tmp/${name}-pdf.png`);
  image = fs.readFileSync(`./tmp/${name}-pdf.png`);
  return image;
}

const reportList = [
  {
    name: '命题质量报表',
    skip: true,
    optionList: [
      {
        name: '报表',
        path: '/report/question?examid=1142516-84&grade=直升高一&org=0',
        waitArr: [
          `document.querySelectorAll('canvas').length === 10`
        ],
      },
      {
        name: 'pdf',
        path: '/report/export/pdf?export=true&report=question&examid=1142516-84&org=0&pindex=4409166',
        waitArr: [
          `document.querySelectorAll('.index-tree').length === 1`,
          `document.querySelector(".el-loading-mask.is-fullscreen").style.display === "none"`
      ]}
    ]
  },
  {
    name: '教师教学质量分析报告', 
    skip: true,
    optionList: [
      {
        name: '报表',
        path :'/report/teacher?examid=43257-84&org=2&grade=直升初二',
        waitArr: [
          `document.querySelectorAll('.el-table__row').length > 0`
        ]
      }
    ]
  },
  {
    skip: true,
    name: '校级分析报告', 
    optionList: [
      {
        name: '报表',
        path :'/report/total?examid=43257-84&org=2&grade=直升初二',
        waitArr: [
          `document.querySelectorAll('canvas').length === 6`
        ]
      },
      {
        name: 'pdf',
        path :'/report/export?export=true&report=total&examid=43257-84&org=2',
        waitArr: [
          `document.querySelectorAll('canvas').length === 7`,
          `document.querySelector(".el-loading-mask.is-fullscreen").style.display === "none"`
        ]
      
      }
    ]
  },
  {
    skip: true,
    name: '班级分析报告', 
    optionList: [
      {
        name: '报表',
        path :'/report/class?examid=43257-84&grade=直升初二&org=2',
        waitArr: [
          `document.querySelectorAll('.el-table').length === 4`,
          `document.querySelectorAll('canvas').length === 2`
        ]
      },
    ]
  },
]
describe(userDesc, () => {
  describe(examDesc, () => {
    for(let i = 0; i < reportList.length; i += 1) {
      let report = reportList[i];
      if (report.skip) continue;
      let {
        name,
        optionList
      } = report;
      describe(name, () => {
        for(let j = 0; j < optionList.length; j += 1) {
          let option = optionList[j];
          test(option.name, async () => {
              await testRunner(name, option)
          })
        }
      })
    }
    describe('学生成绩分析', () => {
      test('直升初19级4班 => 丁涵', async () => {
        // throw new Error('yes')
        const page = await browser.newPage();
        page.setDefaultTimeout(PAGE_TIMEOUT);
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
          console.log(1)
          await dropDownList[0].click();
          await page.waitFor(1000);
          // wait for banji list appears
          let dropdownArr1 = await page.$$('.el-select-dropdown');
          let firstDropdown1 = await dropdownArr1[0].boxModel();
          let activeDropdown1 = firstDropdown1 ? dropdownArr1[0] : dropdownArr1[1];
          let list = await activeDropdown1.$('.el-select-dropdown__list > li')
          // select first banji
          console.log({list})
          console.log(2)
          await list.click();
          console.log(21)
          // wait for students response
          let res = await page.waitForResponse((res) => res.url().includes('/report/obt/v2/student/list'))
          console.log(22)
          // trigger students dropdown
          await dropDownList[1].click();
          await page.waitFor(1000);
          console.log(23)
          let dropdownArr = await page.$$('.el-select-dropdown');
          console.log(24)
          let firstDropdown = await dropdownArr[0].boxModel();
          console.log(25)
          let activeDropdown = firstDropdown ? dropdownArr[0] : dropdownArr[1];
          console.log(3)
          // find first student
          let target = await activeDropdown.$('.el-select-dropdown__list > li')
          console.log(31)
          // click first student
          await target.click();
          console.log(32)
          // wait for render complete
          await page.waitForFunction(`document.querySelectorAll('.el-table').length === 3`)
          console.log(33)
          await page.waitForFunction(`document.querySelectorAll('canvas').length === 1`)
          console.log(34)

          let image = await takeFullPageScreenShot(page);
          console.log(35)
          expect(image).toMatchImageSnapshot();
        } catch (e) {
          let errorImagePath = `error_student-score.png`;
          await page.screenshot({path: errorImagePath, fullPage: true})
          throw e;
        }
      })
    })
    describe.skip('必备知识、关键能力与学科素养分析报告', () => {
      test('报表', async () => {
        const name = '必备知识、关键能力与学科素养分析报告'
        const option = {
          name: '报表',
          path: '/report/knowledge?examid=43257-84&org=2&grade=直升初二',
          waitArr: [
            `document.querySelectorAll('.el-table').length === 6`,
            `document.querySelectorAll('canvas').length === 2`
          ]
        }
        await testRunner(name, option)
      })
      test('pdf', async () => {
        let path = '/report/knowledge?examid=43257-84&org=2&grade=直升初二';
        let fnList = [
          `document.querySelectorAll('.el-table').length === 6`,
          `document.querySelectorAll('canvas').length === 2`
        ]
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
        try {

          await waitForFns(page, fnList)
          // 查看 pdf 按钮
          let button = await page.$('.total-title-btn');
          // pdf 页面
          const [popup] = await Promise.all([
            new Promise(resolve => page.once('popup', resolve)),
            button.click()
          ]);
          const pdfFnList = [
            // 等待页面所有图表渲染完毕
            `document.querySelectorAll('canvas').length === 7`,
            // 等待页面目录生成完毕
            `document.querySelectorAll('.index-tree-item').length === 9`,
            // 等待页面 loading 消失
            `document.querySelector(".el-loading-mask.is-fullscreen").style.display === "none"`
          ]
          await waitForFns(popup, pdfFnList);
          const image = await takeFullPageScreenShot(popup, 'knowledge');
          expect(image).toMatchImageSnapshot();
      } catch (error) {
        await page.screenshot({fullPage: true, path: 'knowledge-pdf-error.png'})
      }
      })
    })
  });
});

afterAll(async (done) => {
  await browser.close();
  done();
});
process.on('uncaughtException', async function(err) {
  console.log('Caught exception: ' + err);
  await browser.close();
});