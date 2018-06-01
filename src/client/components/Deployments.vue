<template>
	<div>
		<h2>Deployments <v-btn round color="primary" @click="startListNodes()"><v-icon>refresh</v-icon></v-btn></h2>
		
    <v-container grid-list-md text-xs-center>
      <v-layout row wrap>
        <v-flex>
          <v-data-table :headers="headers" :items="deployments">
            <template slot="items" slot-scope="props">
              <tr :class="{'ok': props.item.status == 'OK', 'active': props.item.status == 'ACTIVE'}">
                <td class="text-xs-left">{{ props.item.name }}</td>
                <td class="text-xs-left">{{ props.item.version }}</td>
                <td class="text-xs-left">{{ props.item.status }}</td>
                <td class="text-xs-left">{{ props.item.nodes }} of {{nodesCount}}</td>
                <td class="text-xs-right">
                  <v-menu bottom left>
                    <v-btn icon slot="activator" dark>
                      <v-icon>more_vert</v-icon>
                    </v-btn>
                    <v-list light>
                      <v-list-tile ripple @click="removeDeployment(props.item)">
                        <v-list-tile-title>Remove</v-list-tile-title>
                      </v-list-tile>
                      <v-list-tile ripple @click="redeployDeployment(props.item)">
                        <v-list-tile-title>Redeploy</v-list-tile-title>
                      </v-list-tile>
                      <v-list-tile ripple @click="setActiveDeployment(props.item)">
                        <v-list-tile-title>Set Active</v-list-tile-title>
                      </v-list-tile>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-flex>
      </v-layout>

      <v-layout row wrap>
        <v-flex xs12 md3>
          <v-text-field
            name="deploymentName"
            label="Deploy New Deployment"
            v-model="newDeployment.name" 
            dark>
          </v-text-field>
        </v-flex>
        <v-flex xs12 md3>
          <v-text-field
            name="deploymentVersion"
            label="Version"
            v-model="newDeployment.version" 
            dark>
          </v-text-field>
        </v-flex>
		  	<v-flex xs1>
			  	<v-btn round color="primary" dark @click="deployNewDeployment()">Deploy</v-btn>
			  </v-flex>
		  </v-layout>
    </v-container>

    <h2 class="space">
			Nodes
			<!-- <v-btn round color="primary" dark style="float:right;margin-right:10px" @click="clearAllDone()">Clear All Done</v-btn> -->
		</h2>

		<v-container grid-list-xl>
			<v-layout row wrap>
				<v-flex xs12 md6 lg4 v-for="node of state.nodes" :key="node.id">
					<v-card>
						<v-card-title>
              <div class="display-1">{{node | nodeId}}</div>
              <div class="body-1 grey--text"># {{node.id}}</div>
            </v-card-title>
						<v-card-text>
              <v-expansion-panel light>
                <v-expansion-panel-content>
                  <div slot="header" class="headline">Tasks {{tasksOnNode[node.id].length}}</div>
                   <v-list class="ma-0 pa-0" light two-line>
                    <v-list-tile v-for="(task) of tasksOnNode[node.id]" :key="task.id" class="grey lighten-2">
                      <v-list-tile-content>
                        <v-list-tile-title class="black--text">{{task.name}}</v-list-tile-title>
                        <v-list-tile-sub-title class="black--text">CPU: {{task.usage.cpu | percent}}, MEM: {{task.usage.memory | mb}}</v-list-tile-sub-title>
                      </v-list-tile-content>
                    </v-list-tile>
                  </v-list>
							  </v-expansion-panel-content>

                <v-expansion-panel-content>
                  <div slot="header" class="headline">Endpoints {{nodeEndpoints[node.id].length}}</div>
                   <v-list class="ma-0 pa-0" light>
                    <v-list-tile v-for="(endpoint,index) of nodeEndpoints[node.id]" :key="index" class="grey lighten-2">
                      <v-list-tile-content>
                        <v-list-tile-title class="black--text">{{endpoint.url}} --> {{endpoint.name}}</v-list-tile-title>
                      </v-list-tile-content>
                    </v-list-tile>
                  </v-list>
							  </v-expansion-panel-content>

                <v-expansion-panel-content v-if="node.config">
                  <div slot="header" class="headline">Config</div>
                  <pre class="pa-3 grey lighten-2">{{node.config}}</pre>								
                </v-expansion-panel-content>
                
                <v-expansion-panel-content v-if="node.deployments">
                  <div slot="header" class="headline">Deployments</div>
                  <v-list class="ma-0 pa-0">
                    <v-list-tile v-for="(deployment,index) of node.deployments" :key="index" class="grey lighten-2">
                      <v-list-tile-title class="title black--text">{{deployment.name}}</v-list-tile-title>
                      <v-list-tile-action-text class="title black--text">{{deployment.version}}</v-list-tile-action-text>
                    </v-list-tile>
                  </v-list>
                </v-expansion-panel-content>
              </v-expansion-panel>
						</v-card-text>
					</v-card>
				</v-flex>
			</v-layout>
		</v-container>
	</div>
</template>

<script>
import store from "../Store";

export default {
  name: "deployments",
  data() {
    return {
      state: store.state,
      newDeployment: {
        name: 'cluster',
        version: ''
      },
      headers: [
        { text: "Name", value: "name", align: "left" },
        { text: "Version", value: "version", align: "left" },
        { text: "Status", value: "status", align: "left" },
        { text: "Nodes", value: "nodes", align: "left" },
        { text: "Actions",  value: "nodes", sortable: false, align: "right", width: "100" }
      ]
    };
  },
  computed: {
    tasksOnNode() {
      let nodes = {};

      for (let node of this.state.nodes) {
        nodes[node.id] = [];
      }

      for(let task of this.state.tasks) {
				if (task.details.node in nodes && task.status == 'running') {
					nodes[task.details.node].push(task)
				}
			}

      return nodes;
    },
    nodeEndpoints() {
      let endpoints = {};
      for(let id in this.tasksOnNode) {
        let tasks = this.tasksOnNode[id];
        endpoints[id] = [];

        for(let task of tasks) {
          if (task.endpoints) {
            for(let name in task.endpoints) {
              endpoints[id].push({name,url:task.endpoints[name]})
            }
          }
        }
      }
      return endpoints;
    },
    nodesCount() {
      return this.state.nodes.length;
    },
    deployments() {
      let deployments = {};
      for (let node of this.state.nodes) {
        if (node.deployments) {
          for (let nodeDeployed of node.deployments) {
            let key = nodeDeployed.name + "." + nodeDeployed.version;

            if (!(key in deployments)) {
              deployments[key] = {
                name: nodeDeployed.name,
                version: nodeDeployed.version,
                nodes: 1
              };
            } else {
              deployments[key].nodes++;
            }
          }
        }
      }

      deployments = Object.values(deployments);

      let neededNodesCount = this.state.nodes.length;

      for (let deployment of deployments) {
        if (this.state.deployment && this.state.deployment.name == deployment.name && this.state.deployment.version == deployment.version) {
          deployment.status = "ACTIVE"  
        } else {
          deployment.status = deployment.nodes == neededNodesCount ? "OK" : "PENDING";
        }
      }



      return deployments;
    }
  },
  methods: {
    startListNodes() {
      this.$socket.emit("start-list-nodes");
    },
    deployNewDeployment() {
      this.$socket.emit("start-deploy-deployment", this.newDeployment);
    },
    redeployDeployment(deployment) {
      this.$socket.emit("start-deploy-deployment", {name: deployment.name, version: deployment.version });
    },
    removeDeployment(deployment) {
      this.$socket.emit("start-remove-deployment", {name: deployment.name, version: deployment.version });
    },
    setActiveDeployment(deployment) {
      this.$socket.emit("set-active-deployment", {name: deployment.name, version: deployment.version });
    },
  },
  filters: {
    number: function(number) {
      return number.toLocaleString();
    },
    percent (value) {
			return Math.ceil(value) + '%';
		},
    mb (value) {
			return Math.round( value / 1024 / 1024) + "[MB]";
		},
		nodeId (node) {
      if (node.name) {
        return node.config.type + ' ' + node.name;
      } else {
        return node.config.type + ' #' + id.substr(0,6);
      }
		}
  }
};
</script>
<style>
tr.ok {
  background-color: rgb(17, 100, 17);
}

tr.active {
  background-color: rgb(1, 189, 1);
}
</style>
