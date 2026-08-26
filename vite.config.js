const {
    defineConfig
} = require("vite");

const path =
    require("path");

module.exports =
    defineConfig({

        build: {

            rollupOptions: {

                input: {

                    activity:
                        path.resolve(
                            __dirname,
                            "activity.html"
                        ),

                    activityRoom:
                        path.resolve(
                            __dirname,
                            "activity-room.html"
                        )

                }

            }

        }

    });
