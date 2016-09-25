/*jshint node: true*/
'use strict';

var Passwd = require('./lib/passwd'),
    Group = require('./lib/group'),
    PUser = require('./lib/p_user'),
    GGroup = require('./lib/g_group');

module.exports = {
  passwd: new Passwd(),
  group: new Group(),
  PUser: PUser,
  GGroup: GGroup
};
