<template>
	<div class="home">
        <v-container grid-list-md text-xs-center>
            <v-layout row wrap text-xl-left>
                <v-flex xs12>
                    <h1>Services</h1>
                </v-flex>
            </v-layout>

            <v-layout row wrap>
                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Cluster</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-3">
                                {{state.connected?'connected':'disconnected'}}
                            </div>
                        </v-card-text>
                    </v-card>
                </v-flex>


                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Deployment</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-3">
                              <span v-if="state.deployment">{{state.deployment.name}} {{state.deployment.version}}</span>
                              <span v-else>No Active deployment set</span>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-flex>

                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Status</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-3">
                                <toggle-button @change="toggleRunning" :sync="true" :value="running"></toggle-button>{{running?"Running":"Idle"}}
                            </div>
                        </v-card-text>
                    </v-card>
                </v-flex>

            </v-layout>

            <v-layout row wrap text-xl-left>
                <v-flex xs12>
                    <h1>Data</h1>
                </v-flex>
            </v-layout>

            <v-layout row wrap>
                
                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/datasets">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Roots</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-4">{{roots.roots | number}}</div>
                            <div class="graph">
                                <vue-chart type="horizontalBar" :data="rootsData" :options="chartOptions"></vue-chart>
                            </div>
                            <v-container grid-list-md text-xs-center>
                                <v-layout row wrap>
                                    <v-flex>Discovered: {{roots.discovered | number}}</v-flex>
                                    <v-flex>New: {{roots.new | number}}</v-flex>
                                    <v-flex>Broken: {{roots.broken | number}}</v-flex>
                                </v-layout>
                            </v-container>
                        </v-card-text>
                    </v-card>
                </v-flex>

                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/datasets">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Datasets</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-4">{{datasets.datasets | number}}</div>
                            <div class="graph">
                                <vue-chart type="horizontalBar" :data="datasetsData" :options="chartOptions"></vue-chart>
                            </div>
                            <v-container grid-list-md text-xs-center>
                                <v-layout row wrap>
                                    <v-flex>Verified: {{datasets.verified | number}}</v-flex>
                                    <v-flex>Unknown: {{datasets.unknown | number}}</v-flex>
                                    <v-flex>Broken: {{datasets.broken | number}}</v-flex>
                                </v-layout>
                            </v-container>
                        </v-card-text>
                    </v-card>
                </v-flex>

                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/datasets">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Freshness</div>
                        </v-card-title>
                        <div class="graph big">
                            <vue-chart type="bar" :data="rootsFreshness" :options="bigChartOptions"></vue-chart>
                        </div>
                        <v-container grid-list-md text-xs-center>
                                <v-layout row wrap>
                                    <v-flex>Coverage: {{rootsFreshness.precentage}}%</v-flex>
                                    <v-flex>Average Root Freshness: {{rootsFreshness.average}} days ago</v-flex>
                                </v-layout>
                            </v-container>
                    </v-card>
                </v-flex>
            </v-layout>

            <v-layout row wrap text-xl-left>
                <v-flex xs12>
                    <h1>Cluster</h1>
                </v-flex>
            </v-layout>

            <v-layout row wrap>
                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/cluster">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Nodes</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-4">{{nodesCount}}</div>
                        </v-card-text>
                    </v-card>
                </v-flex>

                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/cluster">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Jobs</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-4">{{runningJobs}}</div>
                        </v-card-text>
                    </v-card>
                </v-flex>

                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/cluster">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Tasks</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-4">{{runningTasks}}</div>
                        </v-card-text>
                    </v-card>
                </v-flex>

            </v-layout>

        </v-container>
    </div>
</template>

<script>
import VueChart from "vue-chart";
import store from "../Store";
import ToggleButton from "./ToggleButton.vue";

export default {
  name: "home",
  data() {
    return {
      state: store.state,
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 20,
            right: 0,
            bottom: 0
          }
        },
        legend: {
          display: false
        },
        scales: {
          xAxes: [
            {
              stacked: true,
              display: false
            }
          ],
          yAxes: [
            {
              stacked: true,
              display: false
            }
          ]
        },
        horizontalBar: {
          barThickness: 10
        },
        tooltips: {
          enabled: false
        }
      },
      bigChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 0,
            right: 0,
            bottom: 0
          }
        },
        legend: {
          display: false
        },
        bar: {
          barThickness: 10
        },
        tooltips: {
          enabled: true
        }
      },
      running: store.state.deploymentRunning ? true : false,
    };
  },
  watch: {
    'state.deploymentRunning': function(value) {
      this.running = value;
    }
  },
  methods: {
    toggleRunning(event) {
      if (event.value) {
        this.$socket.emit("start-deployment");
      } else {
        this.$socket.emit("stop-deployment");
      }
    }
  },
  computed: {
    datasets: function() {
      return store.aggregate(
        this.state.urls,
        "datasets",
        "verified",
        "broken",
        "unknown"
      );
    },
    datasetsData: function() {
      return {
        datasets: [
          {
            label: "verified",
            data: [this.datasets.verified],
            backgroundColor: "green"
          },
          {
            label: "unknown",
            data: [this.datasets.unknown],
            backgroundColor: "yellow"
          },
          {
            label: "broken",
            data: [this.datasets.broken],
            backgroundColor: "red"
          }
        ]
      };
    },
    roots: function() {
      return store.aggregate(
        this.state.urls.map(url => {
          return {
            roots: 1,
            new: url.status === "New" ? 1 : 0,
            discovered: url.status === "Discovered" ? 1 : 0,
            broken: url.status === "Broken" ? 1 : 0
          };
        }),
        "roots",
        "new",
        "discovered",
        "broken"
      );
    },
    rootsFreshness: function() {
      let now = new Date();
      now = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let freshness = [];
      let labels = [];
      let total = 0;
      let average = 0;

      for (let i = 0; i <= 30; i++) {
        labels[i] = i;
        freshness[i] = 0;
      }

      this.state.urls.forEach(url => {
        let lastDiscovered = new Date(url.lastVerified);
        lastDiscovered = new Date(
          lastDiscovered.getFullYear(),
          lastDiscovered.getMonth(),
          lastDiscovered.getDate()
        );
        let diffInDays = (now.getTime() - lastDiscovered.getTime()) / 1000 / 60 / 60 / 24;
        if (diffInDays > 30) {
            return;
        }
        freshness[diffInDays]++;
        average += diffInDays;
        total++;
      });

      average = Math.round(average / total);

      labels[0] = 'Today';
      labels.reverse();
      freshness.reverse();
      

      return {
        labels: labels,
        total: total,
        average: average,
        precentage: Math.floor(total * 100 / (this.roots.roots || 1)),
        datasets: [
          {
            label: "roots",
            data: freshness,
            backgroundColor: "green"
          }
        ]
      };
    },
    rootsData: function() {
      return {
        datasets: [
          {
            label: "discovered",
            data: [this.roots.discovered],
            backgroundColor: "green"
          },
          {
            label: "new",
            data: [this.roots.new],
            backgroundColor: "yellow"
          },
          {
            label: "broken",
            data: [this.roots.broken],
            backgroundColor: "red"
          }
        ]
      };
    },
    runningJobs: function() {
      return this.state.jobs.length;
    },
    runningTasks: function() {
      let count = 0;
      this.state.tasks.forEach(task => {
        if (task.status != "done") count++;
      });
      return count;
    },
    nodesCount: function() {
      return this.state.nodes.length;
    }
  },
  filters: {
    number: function(number) {
      return number.toLocaleString();
    }
  },
  components: { ToggleButton, VueChart }
};
</script>
<style>
.graph {
  position: relative;
  width: 100%;
  height: 30px;
}
.graph.big {
  height: 160px;
}
</style>
