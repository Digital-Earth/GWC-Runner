const fs = require('fs');
const path = require('path');
const azure = require('azure-storage');
const config = require('./config');
const tar = require('tar');

class Repo {
	constructor(config) {
		this.blobService = azure.createBlobService(config.account, config.key);
		this.container = config.container;

		this.localRepoDir = ".repo";

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
			this.blobService.createBlockBlobFromLocalFile(this.container, fileName, filePath, {
				metadata: {
					product: product,
					version: version
				}
			}, (error, result, response) => {
				callback(error, filePath);
			});
		});
	}

	download(product, version, callback) {
		let filePath = this.getFilePath(product, version)
		let productDir = filePath.replace('.tgz', '');

		function extractTarFile() {
			if (!fs.existsSync(productDir)) {
				fs.mkdirSync(productDir);
			}
			tar.x({ 
				gzip: true, 
				file: filePath, 
				C: productDir 
			}).then(function () {
				callback(null, filePath);
			}, function (error) {
				callback(error, filePath);
			})
		}

		if (fs.existsSync(filePath)) {
			extractTarFile();
		} else {
			this.getBlobToFile(this.container, this.getFileName(product, version), filePath, (error, result, response) => {
				extractTarFile();
			});
		}
	}
}


module.exports = Repo;