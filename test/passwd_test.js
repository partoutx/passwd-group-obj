/*jshint node: true*/
'use strict';

/*global describe, before, should, it*/
var path = require('path'),
    passwd = require('../').passwd,
    PUser = require('../lib/p_user'),
    isAdmin = passwd.isAdmin;

global.should = require('should');
should.extend();

describe('Passwd', function () {
  before(function (done) {

    passwd
    .load((isAdmin() ? '/etc/passwd' : path.join(__dirname, 'files', 'passwd1')))
    .then(function () {
      if (isAdmin()) {
        passwd.del('foo')
        .then(done)
        .done();
      } else {
        done();
      }
    })
    .done();

  });

  it('should create a passwd object', function () {
    //console.log('passwd:', passwd);
    should(passwd).not.be.undefined();
  });

  it('should have method load()', function () {
    should(passwd.load).not.be.undefined();
    passwd.load.should.be.a.Function();
  });

  it('should have method add()', function () {
    should(passwd.add).not.be.undefined();
    passwd.add.should.be.a.Function();
  });

  describe('add method', function () {
    it('should throw error if no PUser parameter is passwd', function () {
      should.throws(function () {
        passwd.add();
      });
    });

    if (isAdmin()) {
      it('should add a new user', function (done) {
        var foo = new PUser({
          name: 'foo',
          uid: 32000,
          gid: 8,
          gecos: 'Foo User',
          dir: '/home/foo',
          shell: '/bin/bash'
        });
        passwd.add(foo)
        .then(function () {
          done();
        })
        .done();
      });
    }
  });

  describe('PUser', function () {

    it('should have user root PUser object', function () {
      should(passwd.root).not.be.undefined();
      passwd.root.should.be.an.Object();
    });

    it('should have user root with method get()', function () {
      should(passwd.root.get).not.be.undefined();
      passwd.root.get.should.be.a.Function();
    });

    it('should have user root with method set()', function () {
      should(passwd.root.set).not.be.undefined();
      passwd.root.set.should.be.a.Function();
    });

    it('should have user root with method getName()', function () {
      should(passwd.root.getName).not.be.undefined();
      passwd.root.getName.should.be.a.Function();
    });

    describe('getName', function () {
      it('should return name', function () {
        passwd.root.getName().should.eql('root');
      });
    });

    describe('get', function () {
      it('should get correct shell value', function () {
        passwd.root.get('shell').should.eql('/bin/bash');
      });
    });

    describe('set (nonprivileged)', function () {
      if (isAdmin()) {
        return;
      }

      it('should throw error for non-privileged call', function () {
        should.throws(function () {
          passwd.root.set('wrong', 'garbage');
        }, /Superuser privileges are needed/);
      });

    });

    describe('set (privileged)', function () {
      if (!isAdmin()) {
        return;
      }

      it('should throw error for invalid field name', function () {
        should.throws(function () {
          passwd.foo.set('wrong', 'garbage');
        }, /Invalid field/);
      });

      it('should throw error for colons in values', function () {
        should.throws(function () {
          passwd.foo.set('gecos', 'garbage:more_garbage');
        }, /Field values cannot contain colons/);
      });

      it('should allow setting a valid field value', function () {
        passwd.foo.set('gecos', 'FOO')
        .then(function () {
          passwd.foo.get('gecos').should.eql('FOO');
        })
        .done();
      });

    });

  });
});
