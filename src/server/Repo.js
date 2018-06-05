const fs = require('fs');
const path = require('path');
const azure = require('azure-storage');
const tar = require('tar');
const { ensureDirectoryExists } = require('../utils');

class Repo {
  constructor(config) {
    this.blobService = azure.createBlobService(config.account, config.key);
    this.container = config.container;

    this.localRepoDir = config.path || '.repo';

    ensureDirectoryExists(this.localRepoDir);
  }

  static getFileName(product, version, extension = '.tgz') {
    return `${product}.${version}${extension}`;
  }

  getFilePath(product, version, extension = '.tgz') {
    return path.join(this.localRepoDir, Repo.getFileName(product, version, extension));
  }

  list(product, callback) {
    this.blobService.listBlobsSegmentedWithPrefix(this.container, product, null, {
      include: 'metadata',
    }, (error, result) => {
      if (error) {
        callback(error);
        return;
      }
      const versions = result.entries.map(entry => ({
        product: entry.metadata.product,
        version: entry.metadata.version,
      }));
      versions.sort();
      callback(null, versions);
    });
  }

  nextVersion(product, callback) {
    this.list(product, (error, versions) => {
      if (error) {
        callback(error);
        return;
      }
      if (versions.length === 0) {
        callback(null, '1.0.0');
        return;
      }
      const lastVersion = versions.pop().version;
      const parts = lastVersion.split('.');
      const lastPart = parts.pop();
      parts.push(+lastPart + 1);
      callback(null, parts.join('.'));
    });
  }

  upload(product, version, folder, callback) {
    if (!version) {
      return this.nextVersion(product, (error, realVersion) => {
        if (error) {
          callback(error);
          return;
        }
        this.upload(product, realVersion, folder, callback);
      });
    }

    const fileName = Repo.getFileName(product, version);
    const filePath = this.getFilePath(product, version);

    const self = this;
    const promise = new Promise((resolve, reject) => {
      tar.c({
        gzip: true,
        file: filePath,
        C: folder,
        filter(entry) {
          console.log(entry);
          if (entry === './.pyx') { return false; }
          if (entry === './.git') { return false; }
          if (entry === './node_modules') { return false; }
          if (entry.endsWith('.pdb')) { return false; }
          if (entry.endsWith('.lib')) { return false; }
          if (entry.endsWith('.exp')) { return false; }
          if (entry.endsWith('.bsc')) { return false; }
          return true;
        },
      }, ['.']).then(() => {
        const stats = fs.statSync(filePath);
        self.blobService.createBlockBlobFromLocalFile(self.container, fileName, filePath, {
          metadata: {
            product,
            version,
          },
        }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              product,
              version,
              fileName,
              filePath,
              size: stats.size,
            });
          }
        });
      });
    });

    if (callback) {
      promise.then(dir => callback(null, dir), error => callback(error, null));
    }

    return promise;
  }

  download(product, version, productDir, callback) {
    const filePath = this.getFilePath(product, version);
    // eslint-disable-next-line no-param-reassign
    productDir = productDir ?
      path.join(this.localRepoDir, productDir) :
      filePath.replace('.tgz', '');

    const self = this;
    const promise = new Promise((resolve, reject) => {
      function extractTarFile() {
        if (fs.existsSync(productDir)) {
          resolve(productDir);
          return;
        }
        fs.mkdirSync(productDir);

        tar.x({
          gzip: true,
          file: filePath,
          C: productDir,
          onentry(entry) {
            console.log(entry.path);
          },
        }).then(() => {
          resolve(productDir);
        }, (error) => {
          reject(error);
        });
      }

      if (fs.existsSync(filePath)) {
        extractTarFile();
      } else {
        self.blobService.getBlobToLocalFile(
          self.container,
          Repo.getFileName(product, version),
          filePath,
          (error) => {
            if (error) {
              reject(error);
            } else {
              extractTarFile();
            }
          },
        );
      }
    });

    if (callback) {
      promise.then(result => callback(null, result), error => callback(error, null));
    }

    return promise;
  }

  uploadDeployment(product, version, file, callback) {
    if (!version) {
      this.nextVersion(product, (error, realVersion) => {
        if (error) {
          callback(error);
          return;
        }
        this.uploadDeployment(product, realVersion, file, callback);
      });
      return;
    }

    const fileName = Repo.getFileName(product, version, '.json');

    this.blobService.createBlockBlobFromLocalFile(this.container, fileName, file, {
      metadata: {
        product,
        version,
      },
    }, (error) => {
      if (error) {
        callback(error);
      } else {
        callback(error, {
          product,
          version,
          fileName,
          file,
        });
      }
    });
  }

  downloadDeployment(product, version, callback) {
    if (!version) {
      return this.list(product, (error, entries) => {
        if (error) {
          callback(error);
          return;
        }
        this.downloadDeployment(product, entries.pop().version, callback);
      });
    }

    const self = this;

    const promise = new Promise((resolve, reject) => {
      const filePath = this.getFilePath(product, version, '.json');

      self.blobService.getBlobToLocalFile(
        self.container,
        Repo.getFileName(product, version, '.json'),
        filePath,
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              product,
              version,
              filePath,
            });
          }
        },
      );
    });

    if (callback) {
      promise.then(result => callback(null, result), error => callback(error, null));
    }

    return promise;
  }
}


module.exports = Repo;
