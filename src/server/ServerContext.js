const ee = require('event-emitter');

let context = {
	api: undefined,
	cluster: undefined,
	jobs: [],
	roots: [],
	geoSources: [],
	config: undefined
};

ee(context);

context.on('root', function(root) {
	let updated = false;
	context.roots.forEach((url) => {
		if (url.url === root.Uri) {
			updated = true;
			url.status = root.Status;
			url.datasets = root.DataSetCount;
			url.working = Math.round(100 * root.VerifiedDataSetCount / root.DataSetCount);
			url.broken = root.BrokenDataSetCount;
			url.verified = root.VerifiedDataSetCount;
			url.unknown = root.UnknownDataSetCount;
			url.tags = root.Metadata && root.Metadata.Tags ? root.Metadata.Tags : [],
			url.lastDiscovered = new Date(root.LastDiscovered);
			url.lastVerified = new Date(root.LastVerified);
		}
	});
	if (updated) {
		context.emit('roots',context.roots);
	}
});

context.on('roots', function(roots) {
	context.roots = roots;
});

context.on('jobs', function(jobs) {
	context.jobs = jobs;
});

context.on('geoSources', function(geoSources) {
	context.geoSources = geoSources;
});

module.exports = context;