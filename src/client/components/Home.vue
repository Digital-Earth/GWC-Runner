<template>
	<div class="home">
        <v-container grid-list-md text-xs-center>
            <v-layout row wrap>
                <v-flex xs6>
                    <v-card dark color="secondary" hover height="100%">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Server</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-3">
                                {{state.connected?'connected':'disconnected'}}
                            </div>
                        </v-card-text>
                    </v-card>
                </v-flex>

                <v-flex xs6>
                    <v-card dark color="secondary" hover height="100%">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">GWC</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-3">
                                <toggle-button @change="toggleGWC" :sync="true" :value="gwcRunning"></toggle-button> GWC
                            </div>
                        </v-card-text>
                    </v-card>
                </v-flex>

            </v-layout>
            <v-layout row wrap>
                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/jobs">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Jobs</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-4">{{runningJobs}}</div>
                        </v-card-text>
                    </v-card>
                </v-flex>

                <v-flex xs4>
                    <v-card dark color="secondary" hover height="100%" to="/datasets">
                        <v-card-title primary-title >
                            <div class="headline text-xs-center">Roots</div>
                        </v-card-title>
                        <v-card-text class="px-0">
                            <div class="display-4">{{roots.roots}}</div>
                            <div class="graph">
                                <vue-chart type="horizontalBar" :data="rootsData" :options="chartOptions"></vue-chart>
                            </div>
                            <v-container grid-list-md text-xs-center>
                                <v-layout row wrap>
                                    <v-flex>New: {{roots.new}}</v-flex>
                                    <v-flex>Discovered: {{roots.discovered}}</v-flex>
                                    <v-flex>Broken: {{roots.broken}}</v-flex>
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
                            <div class="display-4">{{datasets.datasets}}</div>
                            <div class="graph">
                                <vue-chart type="horizontalBar" :data="datasetsData" :options="chartOptions"></vue-chart>
                            </div>
                            <v-container grid-list-md text-xs-center>
                                <v-layout row wrap>
                                    <v-flex>Verified: {{datasets.verified}}</v-flex>
                                    <v-flex>Unknown: {{datasets.unknown}}</v-flex>
                                    <v-flex>Broken: {{datasets.broken}}</v-flex>
                                </v-layout>
                            </v-container>
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
                bottom: 60
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
        }
      },
      gwcRunning: false
    };
  },
  methods: {
    toggleGWC(event) {
      if (event.value) {
        this.$socket.emit("start-gwc");
      } else {
        this.$socket.emit("stop-gwc");
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
                    label: 'verified',
                    data: [ this.datasets.verified],
                    backgroundColor: 'green'
                },
                {
                    label: 'unknown',
                    data: [ this.datasets.unknown],
                    backgroundColor: 'yellow'
                },
                {
                    label: 'broken',
                    data: [ this.datasets.broken],
                    backgroundColor: 'red'
                }
            ]   
        }
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
    rootsData: function() {
        return {
            datasets: [
                {
                    label: 'discovered',
                    data: [ this.roots.discovered],
                    backgroundColor: 'green'
                },
                {
                    label: 'new',
                    data: [ this.roots.new],
                    backgroundColor: 'yellow'
                },
                {
                    label: 'broken',
                    data: [ this.roots.broken],
                    backgroundColor: 'red'
                }
            ]   
        }
    },
    runningJobs: function() {
        let count = 0;
        this.state.jobs.forEach(job => {
        if (job.status != "done") count++;
        });
        console.log("count", count);
        return count;
    }
  },
  components: { ToggleButton, VueChart }
};
</script>
<style>
.graph {
    position: relative;
    width: 100%;
    height: 80px;
}
</style>
