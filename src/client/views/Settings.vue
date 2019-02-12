<template>
  <div class="settings">
    <v-container grid-list-md v-if="!clusterConfig">
      <v-layout row wrap>
        <v-flex xs12>
          <h1>No cluster configuration was found!</h1>
        </v-flex>
      </v-layout>
    </v-container>
    <v-container grid-list-md v-else>
      <auth0 :authentication="clusterConfig.authentication"/>
    </v-container>
  </div>
</template>

<script>
import store from "../Store";
import auth0 from "../components/AuthSettings.vue";

export default {
  name: "settings",
  data() {
    return {};
  },
  computed: {
    clusterConfig() {
      if (store.state.clusterConfig) {
        return store.state.clusterConfig;
      }
      return undefined;
    }
  },
  components: {
    auth0
  }
};
</script>
