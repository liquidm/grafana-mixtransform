module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.loadNpmTasks('grunt-execute');
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.initConfig({

        clean: ["dist"],

        copy: {
            src_to_dist: {
                cwd: 'src',
                expand: true,
                src: ['**/*', '!**/*.js', '!**/*.scss'],
                dest: 'dist'
            },
            pluginDef: {
                expand: true,
                src: ['README.md'],
                dest: 'dist'
            }
        },

        watch: {
            rebuild_all: {
                files: ['src/**/*'],
                tasks: ['default'],
                options: {spawn: true}
            }
        },

        ts: {
            build: {
                src: ["dist/**/*.ts", '!**/*.d.ts'],
                dest: "dist/",
                options: {
                    module: "system",
                    target: "es5",
                    rootDir: "dist/",
                    declaration: true,
                    emitDecoratorMetadata: true,
                    experimentalDecorators: true,
                    sourceMap: true,
                    noImplicitAny: false,
                    skipLibCheck: true
                }
            }
        }

    });

    grunt.registerTask('default', [
        'clean',
        'copy:src_to_dist',
        'copy:pluginDef',
        'ts:build'
    ]);
};
