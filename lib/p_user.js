/*jshint node: true*/
'use strict';

var fs = require('fs'),
    Q = require('q'),
    u = require('util'),
    _ = require('lodash'),
    tmp = require('tmp'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    IsAdmin = require('./is_admin'),
    nimble = require('nimble');

function _vetField(validFields, validSFields, field, value) {
  var fieldType = null;

  if (validFields[field]) {
    fieldType = 'passwd';
  } else if (validSFields[field]) {
    fieldType = 'shadow';
  } else {
    throw new Error('Invalid field for passwd.PUser.$set(): ' + field);
  }

  // sanity check value
  if (_.isString(value) && value.search(/:/) !== -1) {
    throw new Error('Field values cannot contain colons: ' + field + ': ' + value);
  }

  return fieldType;
}

/**
 * Represents an individual record in /etc/passwd
 * @constructor
 */
function PUser (puser, parent) {
  var self = this;

  this.parent = parent;

  // valid fields for set()
  self.fields = [
    // passwd fields
    'name',
    'pw',
    'uid',
    'gid',
    'gecos',
    'dir',
    'shell',
    'system'
  ].reduce(function (pv, cv) {
    pv[cv] = true;
    return pv;
  }, {});

  self.sfields = [
    // shadow fields
    'spw',
    'slstchg',
    'smin',
    'smax',
    'swarn',
    'sinact',
    'sexpire'
  ].reduce(function (pv, cv) {
    pv[cv] = true;
    return pv;
  }, {});

  if (puser) {
    _.forEach(puser, function (value, field) {
      _vetField(self.fields, self.sfields, field, value);

      self[field] = value;
    });
  }
}

_.mixin(PUser.prototype, IsAdmin.prototype);

/**
 * returns the user name of this passwd entry
 * @returns {string} user name
 */
PUser.prototype.$getName = function () {
  return this.name;
};

/**
 * get the value of a passwd entry's field
 * @param   {string}        field field name: one of [ 'name', 'pw', 'uid', 'gid', 'gecos', 'dir', 'shell' ]
 * @returns {string|number} value of field
 */
PUser.prototype.$get = function (field) {
  return this[field];
};

/**
 * Idempotently set a field value in a passwd entry
 * @throws {Error} If field not recognised
 * @param {string}  field field name
 * @param {string|number} value value of field to set
 */
PUser.prototype.$_set = function (field, value) {
  var self = this,
      deferred = Q.defer();

  if (!this.isAdmin()) {
    throw new Error('Superuser privileges are needed for this function');
  }

  var type = _vetField(this.fields, this.sfields, field, value),
      cmd = '';

  if (value === this[field]) {
    deferred.resolve(); // nothings changed
  } else {

    if (type === 'passwd') {
      cmd = u.format(
        "usermod %s %s %s %s",
        (field === 'gecos' ? '-c \'' + value + '\'' : ''),
        (field === 'uid' ? '-u ' + value : ''),
        (field === 'gid' ? '-g ' + value : ''),
        (field === 'shell' ? '-s ' + value : ''),
        this.name
      );

    } else if (type === 'shadow') {
      cmd = u.format(
        "chage %s %s %s %s %s %s %s",
        (field === 'slstchg' ? '-d ' + value : ''),
        (field === 'smin' ? '-m ' + value : ''),
        (field === 'smax' ? '-M ' + value : ''),
        (field === 'swarn' ? '-W ' + value : ''),
        (field === 'sinact' ? '-I ' + value : ''),
        (field === 'sexpire' ? '-E ' + value : ''),
        this.name
      );

    } else {
      throw new Error('Invalid field type:', type);
    }

    exec(cmd, function (err, stdout, stderr) {
      if (err) {
        return deferred.reject(err);
      }
      if (self.parent) {
        deferred.resolve(self.parent.$loadUsers());
      } else {
        deferred.resolve();
      }
    });

  }

  return deferred.promise;
};

/**
 * Idempotently set a field value (or PUser values) in a passwd entry
 * @throws {Error} If field not recognised
 * @param {string|PUser}  field field name or PUser object to idempotently apply updates from.
 * @param {string|number} value value of field to set
 */
PUser.prototype.$set = function (field, value) {
  var self = this,
      deferred = Q.defer(),
      fns = [];

  if (typeof field === 'string') {
    return self.$_set(field, value);

  } else if (!(field instanceof PUser)) {
    throw new Error('Invalid field type passed to $set');
  }

  _.each(field, function (v, k) {
    if (self.fields[k] || self.sfields[k]) {
      fns.push(function (done) {
        self.$_set(k, v)
        .then(function () {
          done();
        })
        .done();
      });
    }
  });

  nimble.series(
    fns,
    function () {
      deferred.resolve();
    }
  );

  return deferred.promise;
};

/**
 * Delete this user
 * @throws {Error} if not child of Passwd
 * @returns {promise} from Passwd.$deleteUser().
 */
PUser.prototype.$delete = function () {
  if (this.parent) {
    return this.parent.$deleteUser(this.name);

  } else {
    throw new Error('Cannot $delete, PUser not loaded as child of Passwd');
  }
};

// TODO: lock? (shadow)
PUser.prototype.$lock = function () {
  var cmd = 'usermod -L ' + this.name;
  return Q.nfcall(exec, cmd);
};

PUser.prototype.$unlock = function () {
  var cmd = 'usermod -U ' + this.name;
  return Q.nfcall(exec, cmd);
};

PUser.prototype.$chgEncPw = function (newEncPw) {
  var self = this,
      deferred = Q.defer();

  var p = spawn('chpasswd', ['-e']);
  p.stderr.on('data', function (data) {
    console.error('stderr>', data.toString());
  });
  p.stdout.on('data', function (data) {
    console.log('stdout>', data.toString());
  });
  p.on('close', function (rc) {
    if (rc === 0) {
      if (self.parent) {
        deferred.resolve(self.parent.$loadUsers());
      } else {
        deferred.resolve();
      }
    } else {
      deferred.reject(new Error('passwd command failed with rc:' + rc));
    }
  });

  p.stdin.write(this.name + ':' + newEncPw + '\n');
  p.stdin.end();

  return deferred.promise;
};

module.exports = PUser;
