const { defineConfig } = require("vite");
const path = require("path");

module.exports = defineConfig({
    build: {
        rollupOptions: {
            input: {
                activity: path.resolve(__dirname, "activity.html")
            }
        }
    }
});
