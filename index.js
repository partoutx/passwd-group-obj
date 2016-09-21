/*jshint node: true*/
'use strict';

var Passwd = require('./lib/passwd'),
    Group = require('./lib/group');

module.exports = {
  passwd: new Passwd(),
  group: new Group()
};
