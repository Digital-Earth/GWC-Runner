const ee = require('event-emitter');

const context = {
  api: undefined,
  cluster: undefined,
  jobs: [],
  roots: [],
  nodes: [],
  geoSources: [],
  config: undefined,
  nodeConfig: undefined,
};

ee(context);

context.on('root', (root) => {
  let updated = false;
  context.roots.forEach((url) => {
    /* eslint-disable no-param-reassign */
    if (url.url === root.Uri) {
      updated = true;
      url.status = root.Status;
      url.datasets = root.DataSetCount;
      url.working = Math.round((100 * root.VerifiedDataSetCount) / root.DataSetCount);
      url.broken = root.BrokenDataSetCount;
      url.verified = root.VerifiedDataSetCount;
      url.unknown = root.UnknownDataSetCount;
      url.tags = root.Metadata && root.Metadata.Tags ? root.Metadata.Tags : [];
      url.lastDiscovered = new Date(root.LastDiscovered);
      url.lastVerified = new Date(root.LastVerified);
    }
  });
  if (updated) {
    context.emit('roots', context.roots);
  }
});

context.on('roots', (roots) => {
  context.roots = roots;
});

context.on('jobs', (jobs) => {
  context.jobs = jobs;
});

context.on('geoSources', (geoSources) => {
  context.geoSources = geoSources;
});

context.on('nodes', (nodes) => {
  context.nodes = nodes;
});

module.exports = context;
