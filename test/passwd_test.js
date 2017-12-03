/*jshint node: true*/
'use strict';

/*global describe, before, should, it*/
var path = require('path'),
    passwd = require('../').passwd,
    PUser = require('../').PUser,
    isAdmin = passwd.isAdmin,
    Q = require('q'),
    _ = require('lodash');

global.should = require('should');
should.extend();

describe('Passwd', function () {
  before(function (done) {

    passwd
    .$loadUsers(
      (isAdmin() ? '/etc/passwd' : path.join(__dirname, 'files', 'passwd1')),
      (isAdmin() ? '/etc/shadow' : path.join(__dirname, 'files', 'shadow1'))
    )
    .then(function () {
//      console.log('passwd:', passwd);
      if (isAdmin()) {
        var promises = [];

        if (passwd.foo) {
          promises.push(passwd.$deleteUser('foo'));
        }

        if (passwd.foo2) {
          promises.push(passwd.$deleteUser('foo2'));
        }

        Q.all(promises)
        .then(function () {
          done();
        })
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

  it('should have method $loadUsers()', function () {
    should(passwd.$loadUsers).not.be.undefined();
    passwd.$loadUsers.should.be.a.Function();
  });

  it('should have method $addUser()', function () {
    should(passwd.$addUser).not.be.undefined();
    passwd.$addUser.should.be.a.Function();
  });

  it('should have method $deleteUser()', function () {
    should(passwd.$deleteUser).not.be.undefined();
    passwd.$deleteUser.should.be.a.Function();
  });

  it('should have method $cleansed()', function () {
    should(passwd.$cleansed).not.be.undefined();
    passwd.$cleansed.should.be.a.Function();
  });

  describe('$addUser method', function () {
    it('should throw error if no PUser parameter is passwd', function () {
      should.throws(function () {
        passwd.$addUser();
      });
    });

    if (isAdmin()) {
      it('should add new users foo, foo2', function (done) {
        this.timeout(50000);
        var foo = new PUser({
          name: 'foo',
          uid: 32000,
          gid: 8,
          gecos: 'Foo User',
          dir: '/home/foo',
          shell: '/bin/bash'
        });
        var foo2 = new PUser({
          name: 'foo2',
          uid: 32001,
          gid: 8,
          gecos: 'Foo User #2',
          dir: '/home/foo2',
          shell: '/bin/bash',
          spw: '$6$garbage'
        });
        passwd.$addUser(foo)
        .then(function () {
          return passwd.$addUser(foo2);
        })
        .then(function () {
          done();
        })
        .done();
      });
    }
  });

  describe('$cleansed method', function () {
    it('should return a cleansed hash', function () {
      var hash = passwd.$cleansed();
      should(hash).not.be.undefined();

      should(hash.root).not.be.undefined();
      hash.root.should.not.be.an.instanceof(PUser);
    });
  });

  describe('PUser', function () {

    it('should have user root PUser object', function () {
      should(passwd.root).not.be.undefined();
      passwd.root.should.be.an.Object();
    });

    it('should have user root with method $get()', function () {
      should(passwd.root.$get).not.be.undefined();
      passwd.root.$get.should.be.a.Function();
    });

    it('should have user root with method $set()', function () {
      should(passwd.root.$set).not.be.undefined();
      passwd.root.$set.should.be.a.Function();
    });

    it('should have user root with method $getName()', function () {
      should(passwd.root.$getName).not.be.undefined();
      passwd.root.$getName.should.be.a.Function();
    });

    describe('$getName', function () {
      it('should return name', function () {
        passwd.root.$getName().should.eql('root');
      });
    });

    describe('$get', function () {
      it('should get correct shell value', function () {
        passwd.root.$get('shell').should.eql('/bin/bash');
      });
    });

    describe('$set (nonprivileged)', function () {
      if (isAdmin()) {
        return;
      }

      it('should throw error for non-privileged call', function () {
        should.throws(function () {
          passwd.root.$set('wrong', 'garbage');
        }, /Superuser privileges are needed/);
      });

    });

    describe('$get (privileged)', function () {
      if (!isAdmin()) {
        return;
      }

      it('should have user foo', function () {
        should(passwd.foo).not.be.undefined();
      });

      describe('user foo', function () {
        it('should have shadow field spasswd_state of LOCKED', function () {
          should(passwd.foo.spasswd_state).not.be.undefined();
          passwd.foo.spasswd_state.should.eql('LOCKED');
        });

        it('should have shadow field slstchg that is numeric', function () {
          should(passwd.foo.slstchg).not.be.undefined();
          passwd.foo.slstchg.should.be.a.Number();
        });

        it('should have shadow field smin that is numeric', function () {
          should(passwd.foo.smin).not.be.undefined();
          passwd.foo.smin.should.be.a.Number();
        });

        it('should have shadow field smax that is numeric', function () {
          should(passwd.foo.smax).not.be.undefined();
          passwd.foo.smax.should.be.a.Number();
        });

        it('should have shadow field swarn that is numeric', function () {
          should(passwd.foo.swarn).not.be.undefined();
          passwd.foo.swarn.should.be.a.Number();
        });

        it('should have shadow field sinact that is numeric', function () {
          should(passwd.foo.sinact).not.be.undefined();
          passwd.foo.sinact.should.be.a.Number();
        });

        it('should have shadow field sexpire that is numeric', function () {
          should(passwd.foo.sexpire).not.be.undefined();
          passwd.foo.sexpire.should.be.a.Number();
        });

      });

      describe('user foo2', function () {
        it('should have shadow field spasswd_state of SET', function () {
          should(passwd.foo2.spasswd_state).not.be.undefined();
          passwd.foo2.spasswd_state.should.eql('SET');
        });
      });

    });

    describe('$set (privileged)', function () {
      if (!isAdmin()) {
        return;
      }

      it('should throw error for invalid field name', function () {
        should.throws(function () {
          passwd.foo.$set('wrong', 'garbage');
        }, /Invalid field/);
      });

      it('should throw error for colons in values', function () {
        should.throws(function () {
          passwd.foo.$set('gecos', 'garbage:more_garbage');
        }, /Field values cannot contain colons/);
      });

      it('should allow setting a valid field value', function (done) {
        passwd.foo.$set('gecos', 'FOO')
        .then(function () {
          passwd.foo.$get('gecos').should.eql('FOO');
          done();
        })
        .done(null, function (err) {
          done(err);
        });
      });

      describe('set shadow field values', function () {
        it('should allow setting slstchg field value', function (done) {
          passwd.foo.$set('slstchg', '1111')
          .then(function () {
            passwd.foo.$get('slstchg').should.eql(1111);
            done();
          })
          .done(null, function (err) {
            done(err);
          });
        });

        it('should allow setting smin field value', function (done) {
          passwd.foo.$set('smin', '2222')
          .then(function () {
            passwd.foo.$get('smin').should.eql(2222);
            done();
          })
          .done(null, function (err) {
            done(err);
          });
        });

        it('should allow setting smax field value', function (done) {
          passwd.foo.$set('smax', '3333')
          .then(function () {
            passwd.foo.$get('smax').should.eql(3333);
            done();
          })
          .done(null, function (err) {
            done(err);
          });
        });

        it('should allow setting swarn field value', function (done) {
          passwd.foo.$set('swarn', '4444')
          .then(function () {
            passwd.foo.$get('swarn').should.eql(4444);
            done();
          })
          .done(null, function (err) {
            done(err);
          });
        });

        it('should allow setting sinact field value', function (done) {
          passwd.foo.$set('sinact', '5555')
          .then(function () {
            passwd.foo.$get('sinact').should.eql(5555);
            done();
          })
          .done(null, function (err) {
            done(err);
          });
        });

        it('should allow setting sexpire field value', function (done) {
          passwd.foo.$set('sexpire', '6666')
          .then(function () {
            passwd.foo.$get('sexpire').should.eql(6666);
            done();
          })
          .done(null, function (err) {
            done(err);
          });
        });

        it('should allow setting from a PUser object', function (done) {
          var u_puser = _.cloneDeep(passwd.foo);
          u_puser.gecos = 'CLONED';
          u_puser.sexpire = 7777;
          passwd.foo.$set(u_puser)
          .then(function () {
            passwd.foo.$get('gecos').should.eql('CLONED');
            passwd.foo.$get('sexpire').should.eql(7777);
            done();
          })
          .done(null, function (err) {
            done(err);
          });
        });
      });

//      describe('lock a user', function () {

    });

  });
});

describe('Passwd', function () {
  if (isAdmin()) {
    describe('$deleteUser', function () {

      it('should delete user foo using $deleteUser()', function (done) {
        should(passwd.foo).not.be.undefined();
        passwd.foo.should.be.an.instanceof(PUser);
        passwd.$deleteUser('foo')
        .then(function () {
          should(passwd.foo).be.undefined();
          done();
        })
        .done(null, function (err) {
          done(err);
        });
      });

      it('should delete user foo2 using $delete()', function (done) {
        should(passwd.foo2).not.be.undefined();
        passwd.foo2.should.be.an.instanceof(PUser);
        passwd.foo2.$delete()
        .then(function () {
          should(passwd.foo2).be.undefined();
          done();
        })
        .done(null, function (err) {
          done(err);
        });
      });
    });
  }
});
