/*jshint node: true*/
'use strict';

function IsAdmin () {
}

IsAdmin.prototype.isAdmin = function () {
  return ((process.geteuid ? process.geteuid() : process.getuid()) === 0);
};

module.exports = IsAdmin;

