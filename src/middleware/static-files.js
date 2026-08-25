const path =
    require("path");


function registerStaticFiles({
    app,
    express,
    rootDir
}) {

    app.use(
        express.static(
            rootDir,
            {
                dotfiles:
                    "deny",

                index:
                    false
            }
        )
    );


    app.use(
        "/assets",

        express.static(
            path.join(
                rootDir,
                "dist",
                "assets"
            )
        )
    );

}


module.exports = {
    registerStaticFiles
};
