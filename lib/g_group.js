/*jshint node: true*/
'use strict';

var fs = require('fs'),
    Q = require('q'),
    u = require('util'),
    _ = require('lodash'),
    tmp = require('tmp'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    IsAdmin = require('./is_admin');

function _vetField(validFields, field, value) {
  var fieldType = null;

  if (validFields[field]) {
    fieldType = 'group';
  } else {
    throw new Error('Invalid field for group.GGroup.$set(): ' + field);
  }

  // sanity check value
  if (_.isString(value) && value.search(/:/) !== -1) {
    throw new Error('Field values cannot contain colons: ' + field + ': ' + value);
  }

  return fieldType;
}

/**
 * Represents an individual record in /etc/group
 * @constructor
 */
function GGroup (/*parent*/ ggroup, parent) {
  var self = this;

  this.parent = parent;

  // valid fields for set()
  self.fields = [
    // passwd fields
    'name',
    'pw',
    'gid',
    'user_list'
  ].reduce(function (pv, cv) {
    pv[cv] = true;
    return pv;
  }, {});

  if (ggroup) {
    _.forEach(ggroup, function (value, field) {
      _vetField(self.fields, field, value);

      self[field] = value;
    });
  }

}

_.mixin(GGroup.prototype, IsAdmin.prototype);

/**
 * returns the user name of this group entry
 * @returns {string} group name
 */
GGroup.prototype.$getName = function () {
  return this.name;
};

/**
 * get the value of a group entry's field
 * @param   {string}        field field name
 * @returns {string|number} value of field
 */
GGroup.prototype.$get = function (field) {
  return this[field];
};

/**
 * set a field value in a group entry
 * @throws {Error} If field not recognised
 * @param {string}        field field name
 * @param {string|number} value value of field to set
 */
GGroup.prototype.$set = function (field, value) {
  var self = this,
      deferred = Q.defer();

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  var type = _vetField(this.fields/*, this.sfields*/, field, value),
      cmd = '';

  if (value === this[field]) {
    return; // nothings changed
  }

  if (type === 'group') {
    if (field === 'gid') {
      cmd = u.format(
        "groupmod %s %s %s",
        (field === 'gid' ? '-g ' + value : ''),
        this.name
      );

    } else if (field === 'user_list') {

      cmd = u.format(
        "gpasswd %s %s",
        (field === 'user_list' ? '-M ' + (_.isArray(value) ? value.join(',') : value) : ''),
        this.name
      );

    } else {
      throw new Error('Field name not supported in $set: ' + field);
    }

  } else {
    throw new Error('Invalid field type:', type);
  }

  exec(cmd, function (err, stdout, stderr) {
    if (err) {
      return deferred.reject(err);
    }
    if (self.parent) {
      deferred.resolve(self.parent.$loadGroups());
    } else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

/**
 * Delete this user
 * @throws {Error} if not child of Passwd
 * @returns {promise} from Passwd.$deleteUser().
 */
GGroup.prototype.$delete = function () {
  if (this.parent) {
    return this.parent.$deleteGroup(this.name);

  } else {
    throw new Error('Cannot $delete, GGroup not loaded as child of Passwd');
  }
};

module.exports = GGroup;
