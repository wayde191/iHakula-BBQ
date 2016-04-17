/*global module:false*/
module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',

        compass: {
            options: {
                sassDir: 'app/views/scss',
                cssDir: 'public/assets',
                fontsDir: 'public/fonts',
                specify: 'app/views/scss/init.scss',
                bundleExec: true,
                importPath: 'public/bower_components',
                require: 'susy'
            },

            dev: {
                options: {
                    outputStyle: 'compact'
                }
            },

            dist: {
                options: {
                    outputStyle: 'compressed'
                }
            }
        },

        concat: {
            css: {
                src: [
                    'public/assets/init.css'
                ],
                dest: 'public/assets/init.css'
            }
        },

        fontAwesomeVars: {
            main: {
                variablesScssPath: 'public/bower_components/font-awesome/scss/_variables.scss',
                fontPath: '../bower_components/font-awesome/fonts'
                //NOTE: this must be relative to FINAL, compiled .css file - NOT the variables.less / _variables.scss file!
                // For example, this would be the correct path if the compiled css file is main.css which is in 'src/build'
                // and the font awesome font is in 'src/bower_components/font-awesome/fonts' - since to get from main.css to the fonts directory,
                // you first go back a directory then go into bower_components > font-awesome > fonts.
            }
        },

        shell: {
            thin: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'bundle exec thin start -p 8090'
            }
        },

        concurrent: {
            development: {
                options: {
                    logConcurrentOutput: true
                },
                tasks: ['shell:thin']
            }
        },

        browserify: {
            options: {
                bundleOptions: {
                    debug: true,
                    standalone: 'northernHemisphere'
                }
            },
            development: {
                files: {
                    'public/assets/main.js': ['public/javascripts/main.js']
                }
            }
        }
    });
    // Default task.
    grunt.registerTask('dev', ['fontAwesomeVars', 'compass:dev', 'concat:css', 'browserify', 'concurrent:development']);
};
