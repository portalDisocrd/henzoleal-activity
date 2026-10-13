const path = require("path");

function registerStaticFiles({ app, express, rootDir, appVersion }) {
    const versionHeader = res => {
        if (appVersion) res.setHeader("X-HL-Version", appVersion);
    };

    const noCache = res => {
        versionHeader(res);
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
    };

    const publicFiles = new Map([
        ["/logo-hl.png", { file: "logo-hl.png", policy: "asset" }],
        ["/logo-hl.webp", { file: "logo-hl.webp", policy: "asset" }],
        ["/activity-client.js", { file: "activity-client.js", policy: "code" }],
        ["/home.css", { file: "home.css", policy: "code" }],
        ["/home.js", { file: "home.js", policy: "code" }],
        ["/room-core.js", { file: "room-core.js", policy: "code" }],
        ["/activity.css", { file: "activity.css", policy: "code" }],
        ["/manifest.webmanifest", { file: "manifest.webmanifest", policy: "manifest" }],
        ["/sw.js", { file: "sw.js", policy: "service-worker" }],
        ["/icon-192.png", { file: "icon-192.png", policy: "asset" }],
        ["/icon-512.png", { file: "icon-512.png", policy: "asset" }],
        ["/not-found.css", { file: "not-found.css", policy: "code" }]
    ]);

    for (const [route, entry] of publicFiles) {
        app.get(route, (req, res) => {
            versionHeader(res);

            if (entry.policy === "service-worker") {
                res.set("Cache-Control", "no-cache, no-store, must-revalidate");
                res.set("Service-Worker-Allowed", "/");
            } else if (entry.policy === "code" || entry.policy === "manifest") {
                res.set("Cache-Control", "no-cache, must-revalidate");
            } else {
                res.set("Cache-Control", "public, max-age=3600");
            }

            res.sendFile(path.join(rootDir, entry.file));
        });
    }

    app.use("/styles", express.static(path.join(rootDir, "styles"), {
        dotfiles: "deny",
        index: false,
        maxAge: 0,
        setHeaders: noCache
    }));

    app.use("/frontend", express.static(path.join(rootDir, "frontend"), {
        dotfiles: "deny",
        index: false,
        maxAge: 0,
        setHeaders: noCache
    }));

    app.use(
        "/sounds",
        express.static(path.join(rootDir, "sounds"), {
            dotfiles: "deny",
            index: false,
            immutable: process.env.NODE_ENV === "production",
            maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
            setHeaders: versionHeader
        })
    );

    app.use(
        "/assets",
        express.static(path.join(rootDir, "dist", "assets"), {
            dotfiles: "deny",
            index: false,
            immutable: process.env.NODE_ENV === "production",
            maxAge: process.env.NODE_ENV === "production" ? "1y" : 0,
            setHeaders: versionHeader
        })
    );
}

module.exports = { registerStaticFiles };
