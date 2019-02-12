<template>
  <div>
    <v-layout row wrap>
      <v-flex xs12>
        <h1>{{ providerName }}</h1>
      </v-flex>
    </v-layout>

    <v-layout row wrap>
      <v-flex xs4>
        <v-card dark color="secondary" hover height="100%">
          <v-card-title primary-title>
            <div class="headline text-xs-center">Application</div>
          </v-card-title>
          <v-card-text>
            <v-text-field label="Provider" :value="providerName" readonly></v-text-field>
            <v-text-field label="Domain" v-model="appDomain" clearable></v-text-field>
            <v-text-field label="Client ID" v-model="appClientID" clearable></v-text-field>
            <v-text-field label="Audience" v-model="appAudience" clearable></v-text-field>
          </v-card-text>
          <v-divider/>
          <v-card-actions>
            <v-spacer/>
            <v-btn round @click="appCancel">Cancel</v-btn>
            <v-btn color="primary" round @click="appSubmit">Submit</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </div>
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
      this.$socket.emit("set-authentication-config", {
        provider: this.providerName,
        settings: {
          domain: this.appDomain.trim(),
          clientID: this.appClientID.trim(),
          audience: this.appAudience.trim()
        }
      });
    }
  },
  computed: {
    providerName() {
      return this.authentication.provider;
    }
  }
};
</script>
