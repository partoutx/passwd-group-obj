/*jshint node: true*/
'use strict';

var fs = require('fs'),
    Q = require('q'),
    u = require('util'),
    assert = require('assert'),
    _ = require('lodash'),
    tmp = require('tmp'),
    exec = require('child_process').exec,
    GGroup = require('./g_group'),
    IsAdmin = require('./is_admin');


function Group () {

}

_.mixin(Group.prototype, IsAdmin.prototype);

/**
 * loads group
 * @param   {string}  pfile path to group file, defaults to /etc/group
 * @param   {string}  pfile path to group file, defaults to /etc/group
 * @returns {promise} resolve of error
 */
Group.prototype.$loadGroups = function (gfile/*, sfile*/) {
  var self = this;

  self.file = (gfile ? gfile : (self.file ? self.file : '/etc/group'));
  //self.shadowfile = (sfile ? sfile : (self.sfile ? self.sfile : '/etc/gshadow'));

  // Clear any existing entries before reloading
  _.forEach(self, function (value, key) {
    if (value instanceof GGroup) {
      delete self[key];
    }
  });

  return Q.nfcall(fs.readFile, self.file)
  .then(function (data) {
    data
    .toString()
    .trim()
    .split(/\r?\n/)
    .map(function (uline) {
      var col = uline.split(':');

      var ggroup = new GGroup({
        name: col[0],
        pw: col[1],
        gid: Number(col[2]),
        user_list: col[3].split(',')
      }, self);

      self[ggroup.name] = ggroup;
    });
  });
//  .then(function () {
//    return Q.nfcall(fs.readFile, self.shadowfile)
//    .then(function (data) {
//      data
//      .toString()
//      .trim()
//      .split(/\r?\n/)
//      .map(function (sline) {
//        var scol = sline.split(':'),
//            sname = scol[0];
//
//        if (!self[sname]) {
//          console.error('Shadow entry encountered without corresponding group entry, ignored:', sname);
//          return;
//        }
//        var suser = self[sname];  //Add to existing user
//
//        // handle password field
//        var spw = scol[1];
//        suser.sgroup_state = null;
//        if (spw === '') {
//          suser.sgroup_state = 'NO PASSWORD';
//
//        } else if (spw.charAt(0) === '!') {
//          suser.sgroup_state = 'LOCKED';
//
//        } else if (spw === '*') {
//          suser.sgroup_state = 'DISABLED';
//
//        } else {
//          suser.sgroup_state = 'SET';
//        }
//
//        suser.slstchg = Number(scol[2]);
//        suser.smin = Number(scol[3]);
//        suser.smax = Number(scol[4]);
//        suser.swarn = Number(scol[5]);
//        suser.sinact = Number(scol[6]);
//        suser.sexpire = Number(scol[7]);
//        suser.sflag = scol[8];
//      });
//    });
//  });

};

/**
 * add a new user
 * @throws {Error}  Error
 * @param   {object}  puser PUser object
 * @returns {promise}
 *
 * var foo = new PUser({
 *   name: 'foo',
 *   uid: 32000,
 *   gid: 8,
 *   gecos: 'Foo User',
 *   dir: '/home/foo',
 *   shell: '/bin/bash'
 * });
 * group.addUser(foo)
 * .then(function () { ...
 */
Group.prototype.$addGroup = function (ggroup) {
  assert(ggroup !== undefined);

  var self = this;

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  if (!(ggroup instanceof GGroup)) {
    throw new Error('ggroup parameter is not an instance of GGroup');
  }

  var cmd = u.format(
    'groupadd %s %s',
//    (ggroup.pw ? '-p "' + ggroup.pw + '"' : ''),
    (ggroup.gid ? '-g ' + ggroup.gid : ''),
    ggroup.name
  );

  return Q.nfcall(exec, cmd)
  .then(function (res) {
    var stdout = res[0],
        stderr = res[1];

    return self.$loadGroups()
    .then(function () {

      if (ggroup.user_list) {
        var members = ggroup.user_list.join(',');

        cmd = 'gpasswd -M \'' + members + '\' ' + ggroup.name;
        return Q.nfcall(exec, cmd)
        .then(function () {
          return self.$loadGroups();
        });
      } else {
        return Q.resolve();
      }
    });
  });

};

/**
 * delete a group
 * @throws {Error}  Error
 * @param   {object|string}  ggroup GGroup object or group name
 * @returns {promise} [stdout, stderr]
 */
Group.prototype.$deleteGroup = function (ggroup) {
  assert(ggroup !== undefined);

  var self = this,
      deferred = Q.defer();

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  if (!(ggroup instanceof GGroup) && typeof ggroup !== 'string') {
    throw new Error('ggroup parameter is not an instance of GGroup or a string');
  }

  var cmd = u.format(
    'groupdel %s',
    (typeof ggroup === 'string' ? ggroup : ggroup.name)
  );

  exec(cmd, function (err, stdout, stderr) {
    if (err) {
      return deferred.reject(err);
    }

    deferred.resolve(self.$loadGroups());
  });

  return deferred.promise;
};


module.exports = Group;
