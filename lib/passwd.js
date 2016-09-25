/*jshint node: true*/
'use strict';

var fs = require('fs'),
    Q = require('q'),
    u = require('util'),
    assert = require('assert'),
    _ = require('lodash'),
    tmp = require('tmp'),
    exec = require('child_process').exec,
    PUser = require('./p_user'),
    IsAdmin = require('./is_admin');


/**
 * Represents the whole of /etc/passwd.  Passwd entries are represent within this
 * object as this.username = PUser object.
 * @constructor
 */
function Passwd () {

}

_.mixin(Passwd.prototype, IsAdmin.prototype);

/**
 * loads passwd & shadow files
 * @param   {string}  pfile path to passwd file, defaults to /etc/passwd
 * @param   {string}  pfile path to passwd file, defaults to /etc/passwd
 * @returns {promise} resolve of error
 */
Passwd.prototype.$loadUsers = function (pfile, sfile) {
  var self = this;

  self.file = (pfile ? pfile : (self.file ? self.file : '/etc/passwd'));
  self.shadowfile = (sfile ? sfile : (self.sfile ? self.sfile : '/etc/shadow'));

  // Clear any existing entries before reloading
  _.forEach(self, function (value, key) {
    if (value instanceof PUser) {
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

      var puser = new PUser({
        name: col[0],
        pw: col[1],
        uid: Number(col[2]),
        gid: Number(col[3]),
        gecos: col[4],
        dir: col[5],
        shell: col[6]
      }, self);

      self[puser.name] = puser;
    });
  })
  .then(function () {
    return Q.nfcall(fs.readFile, self.shadowfile)
    .then(function (data) {
      data
      .toString()
      .trim()
      .split(/\r?\n/)
      .map(function (sline) {
        var scol = sline.split(':'),
            sname = scol[0];

        if (!self[sname]) {
          console.error('Shadow entry encountered without corresponding passwd entry, ignored:', sname);
          return;
        }
        var suser = self[sname];  //Add to existing user

        // handle password field
        var spw = scol[1];
        suser.spasswd_state = null;
        if (spw === '') {
          suser.spasswd_state = 'NO PASSWORD';

        } else if (spw.charAt(0) === '!') {
          suser.spasswd_state = 'LOCKED';

        } else if (spw === '*') {
          suser.spasswd_state = 'DISABLED';

        } else {
          suser.spasswd_state = 'SET';
        }

        suser.slstchg = Number(scol[2]);
        suser.smin = Number(scol[3]);
        suser.smax = Number(scol[4]);
        suser.swarn = Number(scol[5]);
        suser.sinact = Number(scol[6]);
        suser.sexpire = Number(scol[7]);
        suser.sflag = scol[8];
      });
    });
  });

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
 * passwd.addUser(foo)
 * .then(function () { ...
 */
Passwd.prototype.$addUser = function (puser) {
  assert(puser !== undefined);

  var self = this;

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  if (!(puser instanceof PUser)) {
    throw new Error('puser parameter is not an instance of PUser');
  }

  var cmd = u.format(
    'useradd %s %s %s %s %s %s',
//    (puser.pw ? '-p "' + puser.pw + '"' : ''),
    (puser.uid ? '-u ' + puser.uid : ''),
    (puser.gid ? '-g ' + puser.gid : ''),
    (puser.gecos ? '-c "' + puser.gecos + '"' : ''),
    (puser.dir ? '-d "' + puser.dir + '"' : ''),
    (puser.shell ? '-s "' + puser.shell + '"' : ''),
    puser.name
  );

  return Q.nfcall(exec, cmd)
  .then(function (res) {
    var stdout = res[0],
        stderr = res[1];

    return self.$loadUsers()
    .then(function () {
      if (puser.spw) { // encrypted pw?
        return self[puser.name].$chgEncPw(puser.spw);
      } else {
        return Q.resolve();
      }
    });
  });

};

/**
 * delete a user
 * @throws {Error}  Error
 * @param   {object|string}  puser PUser object or username
 * @returns {promise} [stdout, stderr]
 */
Passwd.prototype.$deleteUser = function (puser) {
  assert(puser !== undefined);

  var self = this,
      deferred = Q.defer();

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  if (!(puser instanceof PUser) && typeof puser !== 'string') {
    throw new Error('puser parameter is not an instance of PUser or a string');
  }

  var cmd = u.format(
    'userdel %s',
    (typeof puser === 'string' ? puser : puser.name)
  );

  exec(cmd, function (err, stdout, stderr) {
    if (err) {
      return deferred.reject(err);
    }

    deferred.resolve(self.$loadUsers());
  });

  return deferred.promise;
};


module.exports = Passwd;
