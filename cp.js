
const srcDir = 'test';

const destDir = 'd/c';

fse.copy(srcDir, destDir)
.then(res => {
  console.log(res)
})
.catch(err => {
  console.error(err);
})