const { defineConfig } = require('cypress');

module.exports = defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:9000/admin',
        specPattern: 'cypress/integration/**/*.spec.js',
        supportFile: 'cypress/support/index.js',
        videosFolder: 'cypress/videos',
        screenshotsFolder: 'cypress/screenshots',
        viewportHeight: 1024,
        viewportWidth: 1280,
        experimentalStudio: true,
        env: {
            userOne: process.env.CYPRESS_USER_ONE || '',
            passwordOne: process.env.CYPRESS_PASSWORD_ONE || '',
        },
    },
});
