'use strict';

const resemble = require('node-resemble-js');
const fs = require('fs-extra');
let log = global.log;
let updateBaselines = false;
process.argv.slice(2).forEach(val => {
  if (val === '-u') {
    updateBaselines = true;
  }
});

const
  baselineDir = `./visual-regression-baseline/${browserName}/`,
  resultDir = `./artifacts/visual-regression/new-screens/${browserName}/`,
  resultDirPositive = `${resultDir}positive/`,
  resultDirNegative = `${resultDir}negative/`,
  diffDir = `./artifacts/visual-regression/diffs/${browserName}/`,
  diffDirPositive = `${diffDir}positive/`,
  diffDirNegative = `${diffDir}negative/`;

let diffFile, result, res, filename, file_name;

module.exports ={
  /**
   * Take a screenshot of the current page and saves it as the given filename.
   *
   * ```
   *  this.demoTest = function (browser) {
   *    browser.saveScreenshot('/path/to/fileName.png');
   *  };
   * ```
   *
   * @method saveScreenshot
   * @param {string} fileName The complete path to the file name where the screenshot should be saved.
   * @param {function} [callback] Optional callback function to be called when the command finishes.
   * @see screenshot
   * @api commands
   */
  saveScreenshot: async function(filename) {
    const resultPathPositive = `${resultDirPositive}${filename}`;
    fs.ensureDirSync(resultDirPositive); // Make sure destination folder exists, if not, create it
    await driver.saveScreenshot(resultPathPositive, err => {
      if (err){
        log.error(err.message);
      }
    });
    log.info(`\tScreenshot saved to: ${resultPathPositive}`);
  },
  assertion: async function(filename, expected) {
    file_name = filename;
    const baselinePath = `${baselineDir}${filename}`;
    const resultPathPositive = `${resultDirPositive}${filename}`;
    
    fs.ensureDirSync(baselineDir); // Make sure destination folder exists, if not, create it
    fs.ensureDirSync(diffDirPositive); // Make sure destination folder exists, if not, create it
  
    this.message = 'Unexpected compareScreenshot error.';
    this.expected = expected || 0.1; // misMatchPercentage tolerance default 0.3%
    // create new baseline image if none exists
    if (!fs.existsSync(baselinePath)) {
      console.log('\tWARNING: Baseline image does NOT exist.');
      console.log(`\tCreating Baseline image from Result: ${baselinePath}`);
      fs.writeFileSync(baselinePath, fs.readFileSync(resultPathPositive));
    }
    resemble.outputSettings({
      errorColor: {
        red: 225,
        green: 0,
        blue: 255
      },
      errorType: 'movement',
      transparency: 0.1,
      largeImageThreshold: 1200
    });
    
    resemble(baselinePath)
      .compareTo(resultPathPositive)
      .ignoreAntialiasing()
      .ignoreColors()
      .onComplete(function(result, err) {
        if (err){
          console.log('This is a failure ' + err.message);
        }else{
          res = result;
        }
      });
    await result;
    await file_name;
  },
  value: async function (result) {
    filename = await file_name;
    res = await result;
    const resultPathNegative = `${resultDirNegative}${filename}`;
    const resultPathPositive = `${resultDirPositive}${filename}`;
    
    await driver.pause(1000);
    const error = (res.misMatchPercentage); // value this.pass is called with
    fs.ensureDirSync(diffDirNegative); // Make sure destination folder exists, if not, create it
    
    if (error > this.expected) {
      diffFile = `${diffDirNegative}${filename}`;
      res
        .getDiffImage()
        .pack()
        .pipe(fs.createWriteStream(diffFile));
      fs.ensureDirSync(resultDirNegative); // Make sure destination folder exists, if not, create it
      fs.removeSync(resultPathNegative); // Ensures file does not exist
      fs.moveSync(resultPathPositive, resultPathNegative);
      console.log(`\tCreate diff image [negative]: ${diffFile}`);
    } else {
      diffFile = `${diffDirPositive}${filename}`;
      res
        .getDiffImage()
        .pack()
        .pipe(fs.createWriteStream(diffFile));
    }
    await res;
    return error;
  },
  pass: async function(value) {
    res = await res;
    // value = (res.misMatchPercentage);
    value = parseFloat(res.misMatchPercentage);
    // console.log('PASS this is something again ' + value);
    
    const baselinePath = `${baselineDir}${filename}`;
    const resultPathNegative = `${resultDirNegative}${filename}`;
    const pass = value <= this.expected;
    
    if (pass) {
      // this.message = `Screenshots Matched for ${filename} with ${value}% difference.`;
      log.info(`Screenshots Matched for ${filename} with ${value}% difference.`);
    } else {
      // this.message =
      console.log(
        `Screenshots Match Failed for ${filename} with a tolerance of ${
          // (value - this.expected)
          this.expected
        }%.\n` +
        '   Screenshots at:\n' +
        `    Baseline: ${baselinePath}\n` +
        `    Result: ${resultPathNegative}\n` +
        `    Diff: ${diffFile}\n` +
        `   Open ${diffFile} to see how the screenshot has changed.\n` +
        '   If the Result Screenshot is correct you can use it to update the Baseline Screenshot and re-run your test:\n' +
        `    cp ${resultPathNegative} ${baselinePath}`);
      if (updateBaselines) {
        fs.copy(resultPathNegative, baselinePath, err => {
          if (err) {
            // return console.error(err);
            log.error(err.message);
          }
        });
      }
    }
    return pass;
  }
};