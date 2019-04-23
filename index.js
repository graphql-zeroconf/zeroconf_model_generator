#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { exec } = require('child_process');
const writeJsonFile = require('write-json-file');

const sequelizeCfgPath = path.resolve(process.cwd(), '.sequelize.cfg.js');

if (!fs.existsSync(sequelizeCfgPath)) {
  console.log(chalk.yellow(`
    zeroconf model generator:
      You should be create a .sequelize.cfg.js in your project root
  `));
  return;
}

const sequelizeConfig = require(sequelizeCfgPath);

const modelPath = path.resolve(process.cwd(), 'models');
const zeroConfPath = path.resolve(process.cwd(), '.zeroconf');

const run = cmd => new Promise((resolve, reject) => {
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      reject(`exec error: ${error}`);
      return;
    }

    console.log(stdout);
    resolve();
  });
});

const generateIndex = (cmd) => {
  const result = fs.readdirSync(modelPath);

  let indexContent = '';
  result.forEach((file) => {
    const modelFilePath = path.basename(file, '.js');
    const model = modelFilePath.replace(/:+/g, '_');

    indexContent += `const ${model} = require('./${modelFilePath}');\n`;
  });

  indexContent += '\nmodule.exports = {\n';
  result.forEach((file) => {
    const modelFilePath = path.basename(file, '.js');
    const model = modelFilePath.replace(/:+/g, '_');

    indexContent += `   ${model},\n`;
  });
  indexContent += '};';

  fs.writeFileSync(`${modelPath}/index.js`, indexContent);
};

(async () => {
  if (fs.existsSync(modelPath)) {
    console.log(chalk.yellow(`
      zeroconf model generator:
        Your model files are aleady exists
    `));
    return;
  }

  const {
    database, user, password, option,
  } = sequelizeConfig;

  await writeJsonFile(`${zeroConfPath}/.model.json`, option.additional);
  await writeJsonFile(`${zeroConfPath}/.zeroconf/.option.json`, option);

  const args = [];
  args.push(`-o ${modelPath}`);
  args.push(`-h ${option.host}`);
  if (option.dialect === 'sqlite') {
    args.push(`-d ${option.storage}`);
  } else {
    args.push(`-d ${database}`);
  }
  if (user) args.push(`-u ${user}`);
  if (password) args.push(`-x ${password}`);
  args.push(`-e ${option.dialect}`);
  args.push(`-a ${zeroConfPath}/.model.json`);
  args.push(`-c ${zeroConfPath}/.option.json`);

  const sequelizeAutoPath = path.resolve(process.cwd(), 'node_modules/sequelize-auto/bin');
  const cmd = `${sequelizeAutoPath}/sequelize-auto ${args.join(' ')}`;
  console.log(cmd);
  await run(cmd);
  generateIndex();
})();
