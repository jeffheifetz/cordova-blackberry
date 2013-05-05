/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var path = require("path"),
    shell = require('shelljs'),
    wrench = require("wrench"),
    fs = require('fs'),
    PROJECT_ROOT = path.join(__dirname, "..", ".."),
    PLUGMAN = path.join(PROJECT_ROOT, "cordova", "node_modules", "plugman", "main.js"),
    GLOBAL_PLUGIN_PATH = require(path.join(PROJECT_ROOT, "project.json")).globalFetchDir,
    LOCAL_PLUGIN_PATH = path.join(PROJECT_ROOT, "plugins"),
    argumentor = {
        action : process.argv[2],
        plugin: process.argv[3],
        args: [],
        reset: function () {
            this.args = [];
            return argumentor;
        },
        setAction: function () {
            this.args.push("--" + this.action);
            return argumentor;
        },
        setPlatform: function () {
            this.args.push("--platform");
            this.args.push("blackberry10");
            return argumentor;
        },
        setProject: function () {
            this.args.push("--project");
            this.args.push(PROJECT_ROOT);
            return argumentor;
        },
        setPlugin: function () {
            var pluginWithoutTrailingSlash = this.plugin.charAt(this.plugin.length - 1) === "/" ? this.plugin.slice(0, -1) : this.plugin;
            this.args.push("--plugin");
            this.args.push(pluginWithoutTrailingSlash);
            return argumentor;
        },
        setPluginsDir: function (isGlobal) {
            this.args.push("--plugins_dir");
            if (isGlobal) {
                this.args.push(GLOBAL_PLUGIN_PATH);
            } else {
                this.args.push(LOCAL_PLUGIN_PATH);
            }
            return argumentor;
        },
        run: function () {
            var cmd = PLUGMAN + " " + this.args.join(" ");
            return shell.exec(cmd, {silent: false});
        }
    },
    plugmanInterface= {
        "uninstall": function () {
                argumentor.action = "uninstall";
                argumentor.reset().setAction().setPlatform().setProject().setPlugin().setPluginsDir().run();
            },
        "install": function (plugin) {
                if (plugin) {
                    argumentor.plugin = plugin;
                }
                argumentor.action = "install";
                argumentor.plugin = path.basename(argumentor.plugin);
                argumentor.reset().setPlatform().setProject().setPlugin().setPluginsDir().run();
            },
        "fetch": function (plugin, isGlobal) {
                if (plugin) {
                    argumentor.plugin = plugin;
                }
                argumentor.action = "fetch";
                argumentor.reset().setAction().setPlugin().setPluginsDir(isGlobal).run();
            },
        "remove": function () {
                argumentor.action = "remove";
                argumentor.reset().setAction().setPlugin().setPluginsDir().run();
            },
        "prepare": function () {
                argumentor.action = "prepare";
                argumentor.reset().setAction().setPlatform().setProject().setPluginsDir().run();
            },
        "list": function () {
                argumentor.action = "list";
                argumentor.reset().setAction().run();
            }
    };

function addPlugin (pluginPath) {
    var plugin = pluginPath || argumentor.plugin,
        pluginDirs = [],
        allFiles;

    //Check if the path they sent in exists
    if (!fs.existsSync(plugin) ) {
        //Check if the plugin has been fetched globally
        plugin = path.resolve(GLOBAL_PLUGIN_PATH, plugin);
        if (!fs.existsSync(plugin)) {
            //Check if it is an already installed plugin
            plugin = path.join(LOCAL_PLUGIN_PATH, plugin);
            if (!fs.existsSync(plugin)) {
                console.log("Input ", pluginPath || argumentor.plugin, " cannot be resolved as a plugin");
                process.exit(1);
            }
        }
    }

    allFiles = wrench.readdirSyncRecursive(plugin);
    allFiles.forEach(function (file) {
        var fullPath = path.resolve(plugin, file);

        if (path.basename(file) === "plugin.xml") {
            pluginDirs.push(path.dirname(fullPath));
        }
    });

    pluginDirs.forEach(function (pluginDir) {
        //TODO: figure out why Node doesn't have startsWith ...?
        //If the plugin has already been fetched don't do so again
        if (pluginDir.indexOf(GLOBAL_PLUGIN_PATH) !== 0) {
            plugmanInterface.install(pluginDir, true);
        }
        if (pluginDir.indexOf(LOCAL_PLUGIN_PATH) !== 0) {
            plugmanInterface.install(pluginDir);
        }
    });
}

function removePlugin () {
    //TODO: Implement
}

function listPlugins () {
    fs.readdirSync(LOCAL_PLUGIN_PATH).forEach(function (pluginName) {
        //TODO: Parse the plugin.xml and get any extra information ie description
        console.log(pluginName);
    });
}

function listHelp () {
    console.log("\nUsage:");
    console.log("add <plugin_dir> Adds all plugins contained in the given directory");
    console.log("rm <plugin_name> [<plugin_name>] Removes all of the listed plugins");
    console.log("ls Lists all of the currently installed plugins");
}

function cliEntry () {
    switch (argumentor.action) {
        case "add":
            addPlugin();
            break;
        case "rm":
            removePlugin();
            break;
        case "ls":
            listPlugins();
            break;
        default:
            listHelp();
    }
}

module.exports = {
    add: addPlugin,
    rm: removePlugin,
    ls: listPlugins,
    help: listHelp,
    cli: cliEntry
};
