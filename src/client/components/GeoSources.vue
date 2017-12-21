<template>
	<div>
		<h2>GeoSources</h2>
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
	</div>
</template>

<script>
import store from "../Store";

export default {
  name: "geo-sources",
  data() {
    return {
      state: store.state,
      geoSourceId: ""
    };
  },
  methods: {
    startGalleryStatusStatusJob() {
      this.$socket.emit("start-gallery-status");
    },
    checkGeoSource() {
      this.$socket.emit("start-gallery-status", this.geoSourceId);
    },
    startDownloadJob(id) {
      this.$socket.emit("start-download-geosource", id);
    },
    startImportJob(id) {
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