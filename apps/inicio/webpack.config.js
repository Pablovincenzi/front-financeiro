const {
  shareAll,
  withModuleFederationPlugin
} = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  shared: shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),

  sharedMappings: ['@sysmo-cloud/shared/data-access']
});
