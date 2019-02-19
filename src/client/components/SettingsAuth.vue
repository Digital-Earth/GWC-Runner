<template>
  <v-card dark color="secondary" hover height="100%">
    <v-card-title primary-title class="headline">Authentication</v-card-title>
    <v-card-text>
      <v-select label="Provider" v-model="providerName" :items="providers"></v-select>
      <template v-if="providerName == 'Auth0'">
        <v-text-field label="Domain" v-model="appDomain" clearable></v-text-field>
        <v-text-field label="Client ID" v-model="appClientID" clearable></v-text-field>
        <v-text-field label="Audience" v-model="appAudience" clearable></v-text-field>
      </template>
    </v-card-text>
    <v-divider/>
    <v-card-actions>
      <v-spacer/>
      <v-btn round @click="appCancel">Cancel</v-btn>
      <v-btn color="primary" round @click="appSubmit">Submit</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  props: {
    authentication: {
      type: Object,
      default: undefined
    }
  },
  data() {
    return {
      providers: [ "None", "Auth0"],
      providerName: this.authentication ? this.authentication.provider : "None",
      appDomain: this.authentication ? this.authentication.settings.domain : "",
      appClientID: this.authentication
        ? this.authentication.settings.clientID
        : "",
      appAudience: this.authentication
        ? this.authentication.settings.audience
        : ""
    };
  },
  methods: {
    appCancel() {
      this.appDomain = this.authentication.settings.domain;
      this.appClientID = this.authentication.settings.clientID;
      this.appAudience = this.authentication.settings.audience;
    },
    appSubmit() {
      if (this.providerName != "None") {
        this.$socket.emit("set-authentication-config", {
          provider: this.providerName,
          settings: {
            domain: this.appDomain.trim(),
            clientID: this.appClientID.trim(),
            audience: this.appAudience.trim()
          }
        });
      } else {
        this.$socket.emit("set-authentication-config", undefined);
      }
    }
  },
  computed: {
    providerName() {
      return this.authentication.provider;
    }
  }
};
</script>
