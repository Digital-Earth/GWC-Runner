<template>
  <div id="app">
    <v-app id="runner" dark>
      <v-toolbar app fixed>
        <v-toolbar-side-icon @click="nav=!nav"></v-toolbar-side-icon>
        <v-toolbar-title>Global Grid Systems <span v-if="state.version" class="subheading grey--text pl-4">(version: {{state.version}})</span></v-toolbar-title>
        <v-spacer></v-spacer>
        <img src="./assets/logo.png" width="120px">
      </v-toolbar>

      <v-navigation-drawer app fixed v-model="nav">
        <v-list>
          <v-list-tile v-for="item in items" :key="item.title" :to="item.href" exact>
            <v-list-tile-action>
              <v-icon dark>{{ item.icon }}</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>{{ item.title }}</v-list-tile-title>
            </v-list-tile-content>
            <v-list-tile-action v-if="displayCount(item)">
              <v-chip small color="red" text-color="white">{{displayCount(item)}}</v-chip>
            </v-list-tile-action>
          </v-list-tile>
        </v-list>
      </v-navigation-drawer>

      <v-content>
        <v-container fluid>
          <router-view></router-view>
        </v-container>
      </v-content>
    </v-app>
  </div>
</template>

<script>
import store from "./Store";

export default {
  name: "app",
  data() {
    return {
      state: store.state,
      nav: true,
      items: [
        { title: "Home", icon: "home", href: "/" },
        { title: "Deployments", icon: "cloud_download", href: "/deployments" },
        { title: "Jobs", icon: "playlist_play", href: "/jobs" },
        { title: "Settings", icon: "settings", href: "/settings" }
      ]
    };
  },
  computed: {
    runningTasks: function() {
      let count = 0;
      this.state.tasks.forEach(task => {
        if (task.status != "done") count++;
      });
      return count;
    }
  },
  methods: {
    displayCount(item) {
      if (item.title == "Jobs") {
        return this.runningTasks;
      } else {
        return "";
      }
    }
  }
};
</script>

<style>
* {
  box-sizing: border-box;
}
</style>
