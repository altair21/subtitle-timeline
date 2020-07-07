const fs = require('fs');
const path = require('path');

const timeReg = /^\d{2}:\d{2}:\d{2}([\.,]\d{1,3})?$/; // eslint-disable-line

function getSeconds(str) {
  const s = str.split(':').map(v => +v);
  return s[0] * 3600 + s[1] * 60 + s[2];
}

function getTimeStr(seconds) {
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const second = (seconds % 60).toFixed(2);
  return `${hour > 9 ? hour : `0${hour}`}:${minute > 9 ? minute : `0${minute}`}:${second >= 10 ? second : `0${second}`}`;
}

const createAdjustTimelineFunc = (offset, shift) => (timeStr) => {
  const time = getSeconds(timeStr) - offset;
  return time + time * shift;
};

function handleAss(subtitlePath, truelyStartTime, truelyEndTime) {
  const lines = fs.readFileSync(subtitlePath, 'utf-8').split('\n');
  let startTime;
  let endTime;
  for (let i = 0, l = lines.length; i < l; i++) {
    if (lines[i].startsWith('Dialogue:')) {
      const strs = lines[i].split(',');
      if (startTime == null) {
        startTime = getSeconds(strs[1]);
      }
      endTime = getSeconds(strs[1]);
    }
  }
  const offset = startTime - truelyStartTime;
  const shift = ((truelyEndTime - truelyStartTime) - (endTime - startTime)) / (endTime - startTime);
  const adjust = createAdjustTimelineFunc(offset, shift);

  for (let i = 0, l = lines.length; i < l; i++) {
    if (!lines[i].startsWith('Dialogue:')) {
      continue;
    }
    const strs = lines[i].split(',');
    strs[1] = getTimeStr(adjust(strs[1]));
    strs[2] = getTimeStr(adjust(strs[2]));
    lines[i] = strs.join(',');
  }

  const resultPath = path.basename(subtitlePath).replace(path.extname(subtitlePath), '_improved') + path.extname(subtitlePath);
  fs.writeFileSync(resultPath, lines.join('\n'), 'utf-8');
  process.stdout.write(`write to file: ${resultPath}\n`);
}

function handleSrt(subtitlePath, truelyStartTime, truelyEndTime) {
  const lines = fs.readFileSync(subtitlePath, 'utf-8').split('\n');
  let startTime;
  let endTime;
  for (let i = 0, l = lines.length; i < l; i++) {
    if (lines[i].indexOf('-->') !== -1) {
      const times = lines[i].split(' ').map(v => v.replace(',', '.'));
      if (startTime == null) {
        startTime = getSeconds(times[0]);
      }
      endTime = getSeconds(times[0]);
    }
  }
  const offset = startTime - truelyStartTime;
  const shift = ((truelyEndTime - truelyStartTime) - (endTime - startTime)) / (endTime - startTime);
  const adjust = createAdjustTimelineFunc(offset, shift);

  for (let i = 0, l = lines.length; i < l; i++) {
    if (lines[i].indexOf('-->') === -1) {
      continue;
    }
    const strs = lines[i].split(' ').map(v => v.replace(',', '.'));
    strs[0] = getTimeStr(adjust(strs[0]));
    strs[2] = getTimeStr(adjust(strs[2]));
    lines[i] = strs.join(' ');
  }

  const resultPath = path.basename(subtitlePath).replace(path.extname(subtitlePath), '_improved') + path.extname(subtitlePath);
  fs.writeFileSync(resultPath, lines.join('\n'), 'utf-8');
  process.stdout.write(`write to file: ${resultPath}\n`);
}

(() => {
  const subtitlePath = process.argv[2];
  let truelyStartTime = process.argv[3];
  let truelyEndTime = process.argv[4];

  // check argv
  if (process.argv.length !== 5) {
    process.stderr.write('USAGE: node index.js <subtitle_path> <start_time> <end_time>\n');
    process.exit(-1);
  }
  if (!timeReg.test(truelyStartTime) || !timeReg.test(truelyEndTime)) {
    process.stderr.write('time format: 01:12:34 / 01:12:34.5 / 01:12:34.56 / 01:12:34.567\n');
    process.exit(-1);
  }

  const startTimeVal = truelyStartTime.split(':').map(v => +v.replace(',', '.'));
  const endTimeVal = truelyEndTime.split(':').map(v => +v.replace(',', '.'));
  truelyStartTime = startTimeVal[0] * 3600 + startTimeVal[1] * 60 + startTimeVal[2];
  truelyEndTime = endTimeVal[0] * 3600 + endTimeVal[1] * 60 + endTimeVal[2];

  const ext = path.extname(subtitlePath).toLowerCase();
  if (ext === '.ass') {
    handleAss(subtitlePath, truelyStartTime, truelyEndTime);
  } else if (ext === '.srt') {
    handleSrt(subtitlePath, truelyStartTime, truelyEndTime);
  } else {
    process.stderr.write(`not support '${ext}' file\n`);
    process.exit(-1);
  }
})();
