<template>
  <v-card dark color="secondary" hover height="100%">
    <v-card-title primary-title class="headline">Cluster Details</v-card-title>
    <v-card-text>
      <v-text-field label="Name" v-model="clusterName" clearable></v-text-field>
      <v-text-field label="Host" v-model="clusterHost" clearable></v-text-field>
      <v-text-field label="Logo" v-model="clusterLogo" clearable></v-text-field>
    </v-card-text>
    <v-divider/>
    <v-card-actions>
      <v-spacer/>
      <v-btn round @click="clusterDetailsCancel">Cancel</v-btn>
      <v-btn color="primary" round @click="clusterDetailsSubmit">Submit</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  props: {
    details: {
      type: Object,
      default: undefined
    }
  },
  data() {
    return {
      clusterName: this.details ? this.details.name : "",
      clusterHost: this.details ? this.details.host : "",
      clusterLogo: this.details ? this.details.logo : ""
    };
  },
  methods: {
    clusterDetailsCancel() {
      this.clusterName = this.details.name;
      this.clusterHost = this.details.host;
      this.clusterLogo = this.details.logo;
    },
    clusterDetailsSubmit() {
      this.$socket.emit("set-cluster-details-config", {
        name: this.clusterName,
        host: this.clusterHost,
        logo: this.clusterLogo
      });
    }
  }
};
</script>
