module.exports = function(grunt) {

    // Project configuration
    grunt.initConfig({
        qunit: {
            files: ['test/test.html']
        }
    });

	// load plugins
	grunt.loadNpmTasks('grunt-contrib-qunit');
};
