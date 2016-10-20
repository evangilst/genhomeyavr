"use strict";

module.exports = function( grunt ) {

    require("matchdep").filterDev("grunt-*").forEach( grunt.loadNpmTasks);

    grunt.initConfig({

        defs: {
            localDir:      ".",
            srcDir:        "./src",
            srcSimDir:     "<%= defs.srcDir %>/test",

            destDir:       "./dist/",

            destDocDir:    "<%= defs.destDir %>/docs",
            destTstDir:    "<%= defs.destDir %>/test",
            destAppDir:    "<%= defs.destDir %>/nl.evgilst.homeyavr"
        },

        clean: {
            all:    ["<%= defs.destDir %>"],
            docs:   ["<%= defs.destDocDir %>"],
            tst:    ["<%= defs.destTstDir %>"],
            appl:   ["<%= defs.destAppDir %>"]
        },

        mkdir: {
          testenv: {
            options: {
              create:     ['<%= defs.destTstDir %>/gen/conf']
            }
          }
        },

        copy: {
            homey_files: {
                files: [
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "assets/**/*",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "locales/**/*",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "drivers/avr/assets/*.svg",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "drivers/avr/assets/images/*.jpg",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "drivers/avr/pair/**/*",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "drivers/avr/lib/conf/**/*.json",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.localDir %>",
                        src:    "README.md",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "app.json",
                        dest:   "<%= defs.destAppDir %>"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>",
                        src:    "README.md",
                        dest:   "<%= defs.destAppDir %>"
                    }
                ]
            },
            test_files: {
                files: [
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>/drivers/avr/lib",
                        src:    "conf/**/*.json",
                        dest:   "<%= defs.destTstDir %>/drivers/avr/lib"
                    },
                    {
                        expand: true,
                        cwd:    "<%= defs.srcDir %>/gen",
                        src:    "avrcodes.xlsx",
                        dest:   "<%= defs.destTstDir %>/gen"
                    }
                ]
            }
        },

        ts: {
          homey: {
            files: [
              {
                src: ["<%= defs.srcDir %>/drivers/avr/lib/avr.ts"],
                dest: "<%= defs.destAppDir %>/drivers/avr/lib"
              },
              {
                src: ["<%= defs.srcDir %>/drivers/avr/driver.ts"],
                dest: "<%= defs.destAppDir %>/drivers/avr"
              },
              {
                src: ["<%= defs.srcDir %>/app.ts"],
                dest: "<%= defs.destAppDir %>"
              }
            ],
            options: {
              target:         "ES5",
              module:         "commonjs",
              soureMap:       false,
              removeComments: false,
              npImplicitAny:  false,
              verbose:        true,
              fast:           "never"
            }
          },
          test: {
            files: [
              { src: ["<%= defs.srcDir %>/**/*.ts"], dest: "<%= defs.destTstDir %>"}
            ],
            options: {
              target:         "ES5",
              module:         "commonjs",
              soureMap:       false,
              removeComments: false,
              npImplicitAny:  false,
              verbose:        true,
              fast:           "never"
            }
          }
        },

        jsdoc: {
            dist: {
                src: [
                    "<%= defs.destAppDir %>/app.js",
                    "<%= defs.destAppDir %>/drivers/avr/driver.js",
                    "<%= defs.destAppDir %>/drivers/avr/lib/avr.js",
                    "<%= defs.destAppDir %>/test/avrsim.js",
                    "<%= defs.destAppDir %>/test/avrtest.js",
                    "<%= defs.destAppDir %>/gen/gen_jsons.js"
                ],
                options: {
                    destination: "<%= defs.destDocDir %>"
                }
            }
        },

        jsonlint: {
            all: {
                src: [
                  "<%= defs.srcDir %>/drivers/avr/lib/conf/*.json",
                  "<%= defs.srcDir %>/locales/*.json",
                  "<%= defs.srcDir %>/app.json"
                ],
                options: {
                    formatter: "prose"
                }
            }
        }
    });

    var buildApplication = [
      "jsonlint:all",
      "clean:appl",
      "copy:homey_files",
      "ts:homey"
    ];

    var buildDocumentation = [
      "clean:docs",
      "jsdoc"
    ];

    var buildTestEnv = [
      "clean:tst",
      "copy:test_files",
      "mkdir:testenv",
      "ts:test"
    ];

    var checkJson = [
      "jsonlint:all"
    ];

    grunt.registerTask("buildapp", buildApplication);
    grunt.registerTask("buildtest", buildTestEnv);
    grunt.registerTask("builddocs", buildDocumentation);
    grunt.registerTask("checkjson", checkJson);

    grunt.registerTask("buildall", function() {
        grunt.task.run(checkJson);
        grunt.task.run(buildApplication);
        grunt.task.run(buildTestEnv);
        //grunt.task.run(buildDocumentation);
    });
};
