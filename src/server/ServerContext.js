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