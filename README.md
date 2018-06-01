# gwc-runner

> this is not the runner you deserve, but the one you need

## Build Setup

``` bash
# install dependencies
npm install

# setup the node, this will prompt several questions for you to set things up
node ggs setup

# run slave cluster node (for task execution).
npm run node
# you can run this several times to setup new nodes with different nodes
npm run node --port 1234

# serve with hot reload at localhost:8080 and setup a local node
npm run dev

# serve with hot reload at localhost:88080 and connect to cluster master node
npm run ui --cluster http://localhost:4000

# build for production with minification
npm run build

```

## Cluster tech

we created our own job-based cluster tech because we 2017, we had problems to migrate to Docker on windows.
the Image wasn't able to run GWC and consumed 11GB of docker image.

Therefore, we decided to build a small task-manager. however, to make it to work we had to improve it to a cluster.

### Cluster Node

```npm run node```

this is a simple task manager node. it able to download binaries from our repo and execute tasks.

this node connected using socket.io to root-node to stream task progress and also to get commands to start and kill tasks.

### Root Node

```npm run root```

this is the root node of the cluster (currently single point of failure, in the future I see Root Node and Cluster Node merging).

This node currently doesn't run a local-task-manager, but depends on Cluster Nodes to connect to it using socket.io. Once a Cluster node is connected it will be added to cluster and tasks creation jobs will be sent to it.

the root node provide several socket.io name spaces:
1) /node - for cluster node to connect to.
2) /app - for app nodes to connect to.

the root node provide rest api:
1) /nodes - return list of nodes on the cluster
2) /tasks - return list of tasks on the cluster
3) /endpoints - return list of all tasks endpoints

### UI

```npm run dev```

run a Vue+webpack ui to track the state of a cluster.
this server connects to a Root Node and display the current state of the cluster.

### APP

```npm run ?```

In development.

App is a node script that connects to a Root Node cluster and trigger tasks.

For example, we can have a GWC App that invoke GWC instances.
we can have a Crawler App that invoke auto discover tasks.

The goal of separating an App from UI and Root is to enable developers to connect to local or remote clusters. And they can always start up an App process that will start tasks and kill tasks if that App process was disconnected from the Cluster.

In production. we probably have a UI that start the default apps like GWC and Crawler and LB.

App is defined by an Id (guid). App can also have a name. name is used by cluster LB to forward requests:

```http://[app-name].cluster/[task-name]/``` will forward requests to a specific task in a specific app.
```http://cluster/[app-name-or-id]/[task-name-or-id]/``` will also forward requests to a specific task in a specific app.

This allow us to do hot-swap between apps without downtime.
