/*jshint node: true*/
'use strict';

var fs = require('fs'),
    Q = require('q'),
    u = require('util'),
    _ = require('lodash'),
    tmp = require('tmp'),
    exec = require('child_process').exec,
    IsAdmin = require('./is_admin');

function _vetField(validFields, field, value) {
  if (!validFields[field]) {
    throw new Error('Invalid field for passwd.PUser.set(): ' + field);
  }

  // sanity check value
  if (_.isString(value) && value.search(/:/) !== -1) {
    throw new Error('Field values cannot contain colons: ' + field + ': ' + value);
  }
}

/**
 * Represents an individual record in /etc/passwd
 * @constructor
 */
function PUser (/*parent*/ puser, parent) {
  var self = this;

  this.parent = parent;

  // valid fields for set()
  self.fields = [
    'name',
    'pw',
    'uid',
    'gid',
    'gecos',
    'dir',
    'shell'
  ].reduce(function (pv, cv) {
    pv[cv] = true;
    return pv;
  }, {});

  if (puser) {
    _.forEach(puser, function (value, field) {
      _vetField(self.fields, field, value);

      self[field] = value;
    });
  }
}

_.mixin(PUser.prototype, IsAdmin.prototype);

/**
 * returns the user name of this passwd entry
 * @returns {[[Type]]} [[Description]]
 */
PUser.prototype.getName = function () {
  return this.name;
};

/**
 * get the value of a passwd entry's field
 * @param   {string}        field field name: one of [ 'name', 'pw', 'uid', 'gid', 'gecos', 'dir', 'shell' ]
 * @returns {string|number} value of field
 */
PUser.prototype.get = function (field) {
  return this[field];
};

/**
 * set a field value in a passwd entry
 * @throws {Error} If field not recognised
 * @param {string}        field field name
 * @param {string|number} value value of field to set
 */
PUser.prototype.set = function (field, value) {
  var deferred = Q.defer();

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  _vetField(this.fields, field, value);

  if (value === this[field]) {
    return; // nothings changed
  }

  var cmd = u.format(
    "usermod %s %s %s %s",
    (field === 'gecos' ? '-c \'' + value : ''),
    (field === 'uid' ? '-u ' + value : ''),
    (field === 'gid' ? '-g ' + value : ''),
    (field === 'shell' ? '-s ' + value : ''),
    this.name
  );

  exec(cmd, function (err, stdout, stderr) {
    if (err) {
      return deferred.reject(err);
    }
    if (this.parent) {
      return this.parent.load();
    } else {
      deferred.resolve();
    }
  });


  return deferred.promise;
};

// TODO: del
// TODO: lock? (shadow)

module.exports = PUser;
