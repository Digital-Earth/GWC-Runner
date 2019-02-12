<template>
  <div>
    <v-container>
      <v-layout row align-baseline>
        <v-flex xs7>
          <h2>GeoSources</h2>
        </v-flex>
        <v-flex xs4>
          <v-text-field
            label="Search"
            v-model="search"
            prepend-icon="search"
            @keypress.enter="searchGeoSources"
          ></v-text-field>
        </v-flex>
        <v-flex xs1>
          <v-btn round color="primary" @click="searchGeoSources">Search</v-btn>
        </v-flex>
        <!-- <v-flex xs1>
          <v-btn round color="primary">Last Activity</v-btn>
        </v-flex>-->
      </v-layout>
    </v-container>

    <v-container>
      <v-layout row wrap>
        <v-flex xs2 pa-2 v-for="geoSource in geoSources" :key="geoSource.Id">
          <v-card light>
            <v-card-media
              cover
              :src="`http://pyxis.globalgridsystems.com/images/pipelines/thumbnails/${geoSource.Id}.jpg`"
              height="180"
            ></v-card-media>
            <v-card-title class="ellipsis">{{geoSource.Metadata.Name}}</v-card-title>
            <v-card-actions>
              <v-btn flat color="orange" @click="open(geoSource)">Open</v-btn>
              <v-spacer></v-spacer>
              <v-menu bottom left>
                <v-btn flat slot="activator" icon color="orange">
                  <v-icon>more_vert</v-icon>
                </v-btn>
                <v-list light>
                  <v-list-tile @click="testGeoSource(geoSource.Id)">
                    <v-list-tile-title>Test</v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile @click="downloadGeoSource(geoSource.Id)">
                    <v-list-tile-title>Download</v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile @click="importGeoSource(geoSource.Id)">
                    <v-list-tile-title>Import</v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile>
                    <v-list-tile-title>Remove</v-list-tile-title>
                  </v-list-tile>
                </v-list>
              </v-menu>
            </v-card-actions>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>

    <!--
		<button @click="startGalleryStatusStatusJob()">Refresh</button>
		<div>
			<input v-model="geoSourceId" @key-up:enter="checkGeoSource()"><button @click="checkGeoSource">Check</button>
		</div>
		<div class="url-info" v-for="geoSource in state.geoSources" v-bind:key="geoSource.id"  v-bind:class="{error: !geoSource.working}">
			<div class="details">
				<div class="section">{{geoSource.id}}</div>
				<div class="section">{{geoSource.name}}</div>
				<div class="section">{{geoSource.dataSize | mb}} | {{geoSource.type}} | {{geoSource.working?'':'Broken'}} {{geoSource.hasStyle?'':'No Style'}}</div>
				<div class="section">
					<button @click="startDownloadJob(geoSource.id)">Download</button>
					<button @click="startImportJob(geoSource.id)">Import</button>
					<button>Fix Style</button>
				</div>
			</div>
		</div>
    -->
  </div>
</template>

<script>
import store from "../Store";

export default {
  name: "geo-sources",
  data() {
    return {
      state: store.state,
      geoSourceId: "",
      search: "",
      geoSources: []
    };
  },
  methods: {
    searchGeoSources() {
      let url =
        "https://ls-api.globalgridsystems.com/api/v1/GeoSource?$orderby=Metadata/Updated%20desc";
      if (this.search) {
        url += "&search=" + encodeURIComponent(this.search);
      }
      this.$http.get(url).then(response => {
        this.geoSources = response.body.Items;
      });
    },
    // startGalleryStatusStatusJob() {
    //   this.$socket.emit("start-gallery-status");
    // },
    testGeoSource() {
      this.$socket.emit("start-gallery-status", this.geoSourceId);
    },
    downloadGeoSource(id) {
      this.$socket.emit("start-download-geosource", id);
    },
    importGeoSource(id) {
      this.$socket.emit("start-import-geosource", id);
    }
  },
  filters: {
    mb(value) {
      return Math.round(value / 1024 / 1024) + "[MB]";
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