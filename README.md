# gwc-runner

> this is not the runner you deserve, but the one you need

## Build Setup

``` bash
# install dependencies
npm install

# setup the node, this will prompt several questions for you to set things up
ggs setup

# please note that if you are not running the node on elevation permissions (admin)
# you will need to run those commands
netsh http add urlacl url=http://*:63000/ user=[your-user]
netsh http add urlacl url=http://*:63001/ user=[your-user]
netsh http add urlacl url=http://*:63002/ user=[your-user]
netsh http add urlacl url=http://*:63003/ user=[your-user]
netsh http add urlacl url=http://*:63004/ user=[your-user]
netsh http add urlacl url=http://*:63005/ user=[your-user]
netsh http add urlacl url=http://*:63006/ user=[your-user]
netsh http add urlacl url=http://*:63007/ user=[your-user]
netsh http add urlacl url=http://*:64000/ user=[your-user]

# run slave cluster node (for task execution).
ggs serve
# you can run this several times to setup new nodes with different nodes
ggs serve node --port 1234

# serve with hot reload at localhost:8080 and setup a local node
npm run dev

# serve with hot reload at localhost:88080 and connect to cluster master node
ggs ui --cluster http://localhost:4000

# build for production with minification
ggs build

# for production server, you might want to install it as a service

ggs service install

# if this is the main server, you might want to enable UI as well (port 8080)
ggs service install --ui

```

## Cluster tech

we created our own job-based cluster tech because we 2017, we had problems to migrate to Docker on windows.
the Image wasn't able to run GWC and consumed 11GB of docker image.

Therefore, we decided to build a small task-manager. however, to make it to work we had to improve it to a cluster.

### Cluster Node

```ggs serve```

this is a simple task manager node. it able to download deployments repo and execute tasks.

this node connected using socket.io to root-node to stream task progress and also to get commands to start and kill tasks.

### Root Node

```gss serve --config your-node.config.json --local```

change the node.config.json to ```{ type: "master"}``` to enable the node to expose the socket.io to control the cluster and server as a master node.
mroeover, use ```--local``` options to start enable the root node to act a task manager as well.

the root node provide socket.io api:
1) /node - to allow remote nodes to connect to the cluster
2) /cluster - to allow remote UI/API to start and kill tasks on the cluster
3) /endpoint - to allow remote API to discover endpoints on the cluster

also, the root node provide rest api:
1) /nodes - return list of nodes on the cluster
2) /tasks - return list of tasks on the cluster
3.1) /endpoints - return list of all tasks endpoints
3.2) /endpoints/service/endpoint-name - return list of all endpoints for a given service and endpoint name

### UI

```npm run dev```
or

```ggs ui --local```

run a Vue+webpack ui to track the state of a cluster.
this server can act as a root-node or it connect to remote root-node by using ```--cluster root-node-url```

## Local Development

to use cluster you need to set an active deployment. an active deployment will download published binaries for execution.
However, this is not the right tool for local development and debugging.

Therefore, you can add the following to node.config.json:

### Override specific product path
```
{
  "dev": {
		"products": {
			"product-name": "product-path"
			"gwc": "c:\\work\\trunk\\application\\GeoWebCore\\bin\\Release",
		}
	}
}

```

this would override the location (cwd) for specific products

### Override deployment information

```
{
  "dev": {
		"deployments": [{
			name: "dev-cluster",
			version: "1.0.0"
			path: "c:\\work\\testing\\deployment.json"
		},{
			another...
		}]
	}
}

```

this would be added to deployment details of the local node