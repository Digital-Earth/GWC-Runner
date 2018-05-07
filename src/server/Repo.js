const fs = require('fs');
const path = require('path');
const azure = require('azure-storage');
const config = require('./config');
const tar = require('tar');

class Repo {
	constructor(config) {
		this.blobService = azure.createBlobService(config.account, config.key);
		this.container = config.container;

		this.localRepoDir = config.path || ".repo";

		if (!fs.existsSync(this.localRepoDir)) {
			fs.mkdirSync(this.localRepoDir);
		}
	}

	getFileName(product, version) {
		return product + "." + version + ".tgz";
	}

	getFilePath(product, version) {
		return path.join(this.localRepoDir, this.getFileName(product, version));
	}

	list(product, callback) {
		this.blobService.listBlobsSegmentedWithPrefix(this.container, product, null, {
			include: 'metadata'
		}, function (error, result) {
			for (let entry of result.entries) {
				console.log(entry.metadata.product, entry.metadata.version);
			}
		});
	}

	upload(product, version, folder, callback) {
		let fileName = this.getFileName(product, version)
		let filePath = this.getFilePath(product, version);

		let self = this;
		let promise = new Promise((resolve, reject) => {
			let stream = tar.c({
				gzip: true,
				file: filePath,
				C: folder,
				filter: function (entry, stat) {
					console.log(entry);
					if (entry == "./.pyx") { return false; }
					return true;
				}
			}, ['.']).then(() => {
				self.blobService.createBlockBlobFromLocalFile(self.container, fileName, filePath, {
					metadata: {
						product: product,
						version: version
					}
				}, (error, result, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(filePath);
					}
				});
			});
		});

		if (callback) {
			promise.then((path) => callback(null, path), (error) => callback(error, null));
		}

		return promise;
	}

	download(product, version, callback) {
		let filePath = this.getFilePath(product, version)
		let productDir = filePath.replace('.tgz', '');

		let self = this;
		let promise = new Promise((resolve, reject) => {
			function extractTarFile() {
				if (fs.existsSync(productDir)) {
					resolve(productDir);
					return;
				} else {
					fs.mkdirSync(productDir);
				}
				tar.x({
					gzip: true,
					file: filePath,
					C: productDir
				}).then(function () {
					resolve(productDir);
				}, function (error) {
					reject(error);
				})
			}

			if (fs.existsSync(filePath)) {
				extractTarFile();
			} else {
				self.blobService.getBlobToLocalFile(self.container, self.getFileName(product, version), filePath, (error, result, response) => {
					extractTarFile();
				});
			}
		});

		if (callback) {
			promise.then((path) => callback(null, path), (error) => callback(error, null));
		}

		return promise;
	}
}


module.exports = Repo;