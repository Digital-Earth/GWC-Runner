<template>
	<div>
		<h2>DataSets <v-btn round color="primary" @click="startListJob()"><v-icon>refresh</v-icon></v-btn></h2>
		
    <v-container grid-list-md text-xs-center>
      <v-layout row wrap>
        <v-flex xs4>
          <v-card dark color="secondary" hover height="100%">
            <v-card-title primary-title >
                <div class="headline text-xs-center">Discover</div>
                <v-spacer></v-spacer>
                <v-btn round color="primary" dark @click="startAutoDiscoveryJob()" v-bind:disabled="autoDiscovery.active" ><v-icon>play_arrow</v-icon></v-btn>
            </v-card-title>
             <v-card-text class="px-0">
              <v-expansion-panel class="elevation-0">
                <v-expansion-panel-content>
                  <div slot="header">Options</div>              
                  <v-layout row wrap align-center>
                    <v-flex xs1></v-flex>
                    <v-flex xs8>
                      <v-slider 
                        id="parallel"
                        min=1
                        max=10
                        step=1            
                        v-model="parallel">
                      </v-slider>
                    </v-flex>
                    <v-flex xs2 fill-height=true class="title text-xs-right">
                      {{parallel}} Jobs
                    </v-flex>
                  </v-layout>
                  <v-layout row wrap align-center>
                    <v-flex xs1></v-flex>
                    <v-flex xs10>
                      <v-text-field 
                      label="Tags"
                        type="string"
                        id="tags"
                        >
                      </v-text-field>
                    </v-flex>
                  </v-layout>
                </v-expansion-panel-content>
              </v-expansion-panel>
              
             </v-card-text>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>


		<v-card>
			<v-card-title>
				<div v-if="datasets.total > 0">
					<h3>{{datasets.working}} Working from {{datasets.total}} Dataset</h3>
				</div>
			<v-spacer></v-spacer>
			<v-text-field
				append-icon="search"
				label="Search Url"
				single-line
				hide-details
				v-model="search"
			></v-text-field>
			</v-card-title>
			<v-data-table
				v-bind:headers="headers"
				v-bind:items="items"
        item-key="url"
				v-bind:search="search"
				v-bind:pagination.sync="pagination"
			>
				<template slot="items" slot-scope="props">
          <tr v-bind:class="{'green darken-1':props.item.active}">
            <td class="text-xs-left">{{ props.item.url }}</td>
            <td class="text-xs-left">{{ props.item.status }}</td>
            <td class="text-xs-left">{{ props.item.lastDiscovered | date }}</td>
            <td class="text-xs-left">{{ props.item.lastVerified | date }}</td>
            <td class="text-xs-right">{{ props.item.datasets }}</td>
            <td class="text-xs-right">{{ props.item.verified }}</td>
            <td class="text-xs-right">{{ props.item.unknown }}</td>
            <td class="text-xs-right">{{ props.item.broken }}</td>
            <td>
              <v-menu bottom left>
                <v-btn icon slot="activator" dark>
                  <v-icon>more_vert</v-icon>
                </v-btn>
                <v-list light>
                  <v-list-tile @click="startDiscoverJob(props.item.url)">
                    <v-list-tile-title>Discover</v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile @click="startValidateJob(props.item.url)">
                    <v-list-tile-title>Validate</v-list-tile-title>
                  </v-list-tile>
                </v-list>
                    </v-menu>
            </td>
          </tr>
				</template>
				<template slot="pageText" slot-scope="{ pageStart, pageStop }">
					From {{ pageStart }} to {{ pageStop }}
				</template>
			</v-data-table>
		</v-card>

    <v-layout row>
      <v-flex xs1></v-flex>
      <v-flex xs9>
        <v-text-field
          name="input-1"
          label="Add New Url"
	  			v-model="newUrl" @key-up:enter="addNewUrl()"
          dark>
        </v-text-field>
        </v-flex>
		  	<v-flex xs1>
			  	<v-btn round color="primary" dark @click="addNewUrl">Add</v-btn>
			  </v-flex>
		  </v-layout>

	</div>
</template>

<script>
import store from "../Store";

export default {
  name: "datasets",
  data() {
    return {
      state: store.state,
      parallel: 3,
      max25chars: v => v.length <= 25 || "Input too long!",
      tmp: "",
      search: store.state.pages.datasets.search,
      pagination: store.state.pages.datasets.pagination,
      headers: [
        { text: "Url", value: "url", align: "left" },
        { text: "Status", value: "status", align: "left" },
        { text: "Last Discovered", value: "lastDiscovered", align: "left" },
        { text: "Last Verified", value: "lastVerified", align: "left" },
        { text: "Total Datasets", value: "datasets" },
        { text: "Verified", value: "verified" },
        { text: "Unknown", value: "unknown" },
        { text: "Broken", value: "broken" }
      ],
      items: store.state.urls,
      newUrl: "",
      autoDiscovery: {
        active: false,
        urls: []
      }
    };
  },
  methods: {
    startListJob() {
      this.$socket.emit("start-list");
    },
    startDiscoverJob(url) {
      this.$socket.emit("start-discover", url);
    },
    startValidateJob(url) {
      this.$socket.emit("start-validate", url);
    },
    startAutoDiscoveryJob() {
      this.autoDiscovery.active = true;
      this.autoDiscovery.urls = this.state.urls
        .filter(function(url) {
          let lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          return new Date(url.lastVerified) < lastWeek;
        })
        .sort(function(a, b) {
          return a.verified - b.verified;
        })
        .map(url => url.url);

      this.$socket.emit("start-discover-and-validate", this.autoDiscovery.urls);
    },
    addNewUrl() {
      if (
        this.newUrl.startsWith("http://") ||
        this.newUrl.startsWith("https://")
      ) {
        this.$socket.emit("start-add-url", this.newUrl);
        this.newUrl = "";
      }
    }
  },
  computed: {
    datasets: function() {
      var total = 0;
      var working = 0;
      this.state.urls.forEach(url => {
        total += +url.datasets;
        working += +url.verified;
      });
      return {
        total,
        working
      };
    },
    autoDiscoveryStatus: function() {
      if (this.autoDiscovery.active) {
        return "Running";
      } else {
        return "";
      }
    }
  },
  mounted() {
    let self = this;
    store.on("urls", () => {
      self.items = store.state.urls;
    });
  },
  destroyed() {
    //save pagination and search status
    store.state.pages.datasets.search = this.search;
    store.state.pages.datasets.pagination = this.pagination;
  },
  filters: {
    mb(value) {
      return Math.round(value / 1024 / 1024) + "[MB]";
    },
    date(value) {
      var date = new Date(value);
      return (
        date.getFullYear() +
        " / " +
        (date.getMonth() + 1) +
        " / " +
        date.getDate()
      );
    }
  }
};
</script>


<style>
.url-info {
  border: 1px solid #888;
  margin: 10px;
  position: relative;
}

.url-info .section {
  display: inline-block;
  position: relative;
  overflow: hidden;
  padding: 10px;
}

.url-info .section.small {
  width: 200px;
  border-right: 1px solid #aaa;
}

.url-info .actions {
  position: absolute;
  right: 10px;
  top: 10px;
}

.url-info .background-container {
  position: absolute;
  width: 100%;
  height: 100%;
}

.url-info .background {
  position: absolute;
  top: 0;
  height: 100%;
}

.url-info .background.green {
  left: 0;
  background-color: #afa;
}

.url-info .background.red {
  right: 0;
  background-color: #faa;
}

.url-info .details {
  position: relative;
  left: 0;
  top: 0;
  width: 100%;
  text-align: left;
}
.url-info.error {
  background-color: #faa;
}
</style>