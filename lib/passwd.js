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
 * loads a passwd file
 * @param   {string}  pfile path to passwd file, defaults to /etc/passwd
 * @returns {promise} resolve of error
 */
Passwd.prototype.load = function (pfile) {
  var self = this;

  self.file = (pfile ? pfile : (self.file ? self.file : '/etc/passwd'));

  var deferred = Q.defer();

  _.forEach(self, function (value, key) {
    if (value instanceof PUser) {
      delete self[key];
    }
  });

  fs.readFile(self.file, function (err, data) {
    if (err) {
      return deferred.reject(err);
    }

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
    deferred.resolve();
  });

  return deferred.promise;
};

/**
 * add a new user
 * @throws {Error}  Error
 * @param   {object}  puser PUser object
 * @returns {promise}
 */
Passwd.prototype.add = function (puser) {
  assert(puser !== undefined);

  var self = this,
      deferred = Q.defer();

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  if (!(puser instanceof PUser)) {
    throw new Error('puser parameter is not an instance of PUser');
  }

  var cmd = u.format(
    'useradd %s %s %s %s %s %s %s',
    (puser.pw ? '-p "' + puser.pw + '"' : ''),
    (puser.uid ? '-u ' + puser.uid : ''),
    (puser.gid ? '-g ' + puser.gid : ''),
    (puser.gecos ? '-c "' + puser.gecos + '"' : ''),
    (puser.dir ? '-d "' + puser.dir + '"' : ''),
    (puser.shell ? '-s "' + puser.shell + '"' : ''),
    puser.name
  );

  exec(cmd, function (err, stdout, stderr) {
    if (err) {
      return deferred.reject(err);
    }
    deferred.resolve(self.load());
  });

  return deferred.promise;
};

/**
 * delete a user
 * @throws {Error}  Error
 * @param   {object|string}  puser PUser object or username
 * @returns {promise} [stdout, stderr]
 */
Passwd.prototype.del = function (puser) {
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

    deferred.resolve(self.load());
  });

  return deferred.promise;
};


module.exports = Passwd;
