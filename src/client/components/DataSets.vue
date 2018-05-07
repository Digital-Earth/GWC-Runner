<template>
	<div>
		<h2>DataSets <v-btn round color="primary" @click="startListJob()"><v-icon>refresh</v-icon></v-btn></h2>
		
    <v-container grid-list-md text-xs-center>
      <v-layout row wrap>
        <v-flex xs4>
          <v-card dark color="secondary" hover height="100%">
            <v-card-title primary-title >
                <div class="headline text-xs-center">Discover {{selectedItemsCount}}</div>
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
                      <v-select
                        label="Tags"
                        type="string"
                        id="tags"
                        chips
                        tags
                        v-model="selectedTags"
                        :items="availableTags"
                      ></v-select>
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
        select-all="true"
				v-bind:search="search"
				v-bind:pagination.sync="pagination"
        v-model="selectedItems"
			>
				<template slot="items" slot-scope="props">
          <tr v-bind:class="{'green darken-1':props.item.active}">
            <td :active="props.selected" @click="props.selected = !props.selected">
              <v-checkbox
                primary
                hide-details
                :input-value="props.selected"
              ></v-checkbox>
            </td>
            <td class="text-xs-left">{{ props.item.url }}
              <v-chip color="primary" style="color:white" label small v-for="tag in props.item.tags" v-bind:key="tag">{{tag}}</v-chip>
            </td>
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
                  <v-list-tile ripple @click="startDiscoverJob(props.item.url)">
                    <v-list-tile-title>Discover</v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile ripple @click="startValidateJob(props.item.url)">
                    <v-list-tile-title>Validate</v-list-tile-title>
                  </v-list-tile>
                  <v-list-tile ripple @click="openTagsDialog(props.item)">
                    <v-list-tile-title>Tags...</v-list-tile-title>
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
          name="addNewUrl"
          label="Add New Url"
	  			v-model="newUrl" @keyup.enter="addNewUrl()"
          dark>
        </v-text-field>
        </v-flex>
		  	<v-flex xs1>
			  	<v-btn round color="primary" dark @click="addNewUrl()">Add</v-btn>
			  </v-flex>
		  </v-layout>

      <!-- edit tags dialog -->

      <v-dialog scrollable max-width="700px" v-model="tagsDialog.active">
        <v-card dark>
          <v-card-title>
            <span class="headline">Add or Remove Tags</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text >
            <v-container fluid>
              <v-list scrollable>
                <v-list-tile v-for="tag in tagsDialog.allTags" v-bind:key="tag">
                  <v-list-tile-action>
                    <v-checkbox v-model="tagsDialog.tags" v-bind:value="tag"></v-checkbox>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-title>{{ tag }}</v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>
                <v-list-tile >
                  <v-list-tile-action>
                    <v-checkbox></v-checkbox>
                  </v-list-tile-action>
                  <v-list-tile-sub-title>
                    <v-text-field
                      name="newTag"
                      label="New Tag"
                      v-model="newTag" @keyup.enter="createNewTag()"
                    ></v-text-field>
                  </v-list-tile-sub-title>
                </v-list-tile>
              </v-list>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" flat @click.native="tagsDialog.active = false">Cancel</v-btn>
            <v-btn color="primary" @click.native="updateTags()">Apply</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

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
      selectedTags: [],
      max25chars: v => v.length <= 25 || "Input too long!",
      tmp: "",
      search: store.state.pages.datasets.search,
      pagination: store.state.pages.datasets.pagination,
      headers: [
        { text: "Url", value: "searchText", align: "left" },
        { text: "Status", value: "status", align: "left" },
        { text: "Last Discovered", value: "lastDiscovered", align: "left" },
        { text: "Last Verified", value: "lastVerified", align: "left" },
        { text: "Total Datasets", value: "datasets" },
        { text: "Verified", value: "verified" },
        { text: "Unknown", value: "unknown" },
        { text: "Broken", value: "broken" }
      ],
      items: store.state.urls,
      selectedItems: [],
      newUrl: "",
      newTag: "",
      autoDiscovery: {
        active: false,
        urls: []
      },
      tagsDialog: {
        root: undefined,
        active: false,
        allTags: [],
        tags: []
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

      let filteredUrls;
      if (this.selectedItems.length > 0) {
        filteredUrls = this.selectedItems;
      } else if (this.selectedTags.length == 0) {
        filteredUrls = this.state.urls.filter(function(url) {
          if (url.tags.indexOf("disabled") != -1) {
            return false;
          }
          let lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          return new Date(url.lastVerified) < lastWeek;
        });
      } else {
        filteredUrls = this.state.urls.filter(url => {
          for (let tag of this.selectedTags) {
            if (url.tags.indexOf(tag) == -1) {
              return false;
            }
          }
          return true;
        });
      }

      filteredUrls = filteredUrls.sort(function(a, b) {
        return new Date(a.lastVerified) - new Date(b.lastVerified);
      });

      this.autoDiscovery.urls = filteredUrls.map(url => url.url);

      this.$socket.emit(
        "start-discover-and-validate",
        this.autoDiscovery.urls,
        this.parallel
      );
    },
    addNewUrl() {
      if (
        this.newUrl.startsWith("http://") ||
        this.newUrl.startsWith("https://")
      ) {
        this.$socket.emit("start-add-url", this.newUrl);
        this.newUrl = "";
      }
    },
    openTagsDialog(root) {
      this.tagsDialog.active = true;
      this.tagsDialog.root = root;
      this.tagsDialog.tags = root.tags.slice();
      this.tagsDialog.allTags = this.availableTags.slice();
      this.newTag = "";
    },
    toggle(tag) {
      this.tagsDialog.tags[tag] = !this.tagsDialog.tags[tag];
    },
    createNewTag() {
      this.tagsDialog.allTags.push(this.newTag);
      this.tagsDialog.tags.push(this.newTag);
      this.newTag = "";
    },
    updateTags() {
      let newTags = [];
      let removedTags = [];

      for (let tag of this.tagsDialog.tags) {
        if (this.tagsDialog.root.tags.indexOf(tag) == -1) {
          newTags.push(tag);
        }
      }

      for (let tag of this.tagsDialog.root.tags) {
        if (this.tagsDialog.tags.indexOf(tag) == -1) {
          removedTags.push(tag);
        }
      }

      console.log(newTags, removedTags);

      if (newTags.length > 0 || removedTags.length > 0) {
        this.$socket.emit(
          "update-tags",
          this.tagsDialog.root.url,
          newTags,
          removedTags
        );
      }

      this.tagsDialog.active = false;
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
    availableTags: function() {
      let tags = new Set();
      this.state.urls.forEach(url => {
        url.tags.forEach(tag => tags.add(tag));
      });

      return [...tags];
    },
    selectedItemsCount: function() {
      if (this.selectedItems.length == 0) {
        return "";
      }
      return ` (${this.selectedItems.length})`;
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