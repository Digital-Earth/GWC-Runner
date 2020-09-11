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
      <v-layout row wrap>
        <v-flex xs6>
          <cluster-details :details="clusterConfig.details"/>
        </v-flex>
        <v-flex xs6>
          <authentication :authentication="clusterConfig.authentication"/>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
import store from "../Store";
import clusterDetails from "../components/SettingsDetails.vue";
import authentication from "../components/SettingsAuth.vue";

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
    clusterDetails,
    authentication
  }
};
</script>
