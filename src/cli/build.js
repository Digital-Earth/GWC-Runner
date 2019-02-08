const fs = require('fs');

const AdmZip = require('adm-zip');

module.exports = () => {
  if (process.argv[2] !== 'build') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  const entries = fs.readdirSync('.');

  const zip = new AdmZip();

  entries.forEach((entry) => {
    switch (entry) {
      case '.repo':
      case '.git':
      case '.vscode':
      case 'deployments':
      case 'dist':
      case 'node_modules':
      case 'spec':
      case 'cluster.config.json':
      case 'node.config.json':
      case 'node2.config.json':
      case 'node.master.config.json':
      case 'run2.bat':
      case 'GWC-Runner.zip':
        return;

      default:
        break;
    }

    console.log(entry);

    if (fs.statSync(entry).isDirectory()) {
      zip.addLocalFolder(entry, entry);
    } else {
      zip.addLocalFile(entry);
    }
  });

  if (fs.existsSync('GWC-Runner.zip')) {
    fs.unlinkSync('GWC-Runner.zip');
  }

  zip.writeZip('GWC-Runner.zip');
};
