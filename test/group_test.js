/*jshint node: true*/
'use strict';

/*global describe, before, should, it*/
var path = require('path'),
    group = require('../').group,
    GGroup = require('../').GGroup,
    isAdmin = group.isAdmin,
    Q = require('q');

global.should = require('should');
should.extend();

describe('Group', function () {
  before(function (done) {

    group
    .$loadGroups(
      (isAdmin() ? '/etc/group' : path.join(__dirname, 'files', 'group1'))
      //(isAdmin() ? '/etc/shadow' : path.join(__dirname, 'files', 'shadow1'))
    )
    .then(function () {
//      console.log('group:', group);
      if (isAdmin()) {
        var promises = [];

        if (group.foog) {
          promises.push(group.$deleteGroup('foog'));
        }

        if (group.foog2) {
          promises.push(group.$deleteGroup('foog2'));
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

  it('should create a group object', function () {
    //console.log('group:', group);
    should(group).not.be.undefined();
  });

  it('should have method $loadGroups()', function () {
    should(group.$loadGroups).not.be.undefined();
    group.$loadGroups.should.be.a.Function();
  });

  it('should have method $addGroup()', function () {
    should(group.$addGroup).not.be.undefined();
    group.$addGroup.should.be.a.Function();
  });

  it('should have method $deleteGroup()', function () {
    should(group.$deleteGroup).not.be.undefined();
    group.$deleteGroup.should.be.a.Function();
  });

  describe('$addGroup method', function () {
    it('should throw error if no GGroup parameter is group', function () {
      should.throws(function () {
        group.$addGroup();
      });
    });

    if (isAdmin()) {
      it('should add new groups foog, foog2', function (done) {
        var foog = new GGroup({
          name: 'foog',
          gid: 32000,
          user_list: ['root', 'nobody']
        });
        var foog2 = new GGroup({
          name: 'foog2',
          gid: 32001,
          user_list: ['root', 'nobody']
        });
        group.$addGroup(foog)
        .then(function () {
          return group.$addGroup(foog2);
        })
        .then(function () {
          done();
        })
        .done();
      });
    }
  });

  describe('GGroup', function () {

    it('should have user root GGroup object', function () {
      should(group.root).not.be.undefined();
      group.root.should.be.an.Object();
    });

    it('should have user root with method $get()', function () {
      should(group.root.$get).not.be.undefined();
      group.root.$get.should.be.a.Function();
    });

    it('should have user root with method $set()', function () {
      should(group.root.$set).not.be.undefined();
      group.root.$set.should.be.a.Function();
    });

    it('should have user root with method $getName()', function () {
      should(group.root.$getName).not.be.undefined();
      group.root.$getName.should.be.a.Function();
    });

    describe('$getName', function () {
      it('should return name', function () {
        group.root.$getName().should.eql('root');
      });
    });

    describe('$get', function () {
      it('should get correct user_list', function () {
        group.foog.$get('user_list').should.eql(['root', 'nobody']);
      });
    });

    describe('$set (nonprivileged)', function () {
      if (isAdmin()) {
        return;
      }

      it('should throw error for non-privileged call', function () {
        should.throws(function () {
          group.root.$set('wrong', 'garbage');
        }, /Superuser privileges are needed/);
      });
    });

    describe('$get (privileged)', function () {
      if (!isAdmin()) {
        return;
      }

      it('should have group foog', function () {
        should(group.foog).not.be.undefined();
      });

      describe('group foog', function () {
        it('should have gid that is numeric', function () {
          should(group.foog.gid).not.be.undefined();
          group.foog.gid.should.be.a.Number();
        });
      });
    });

    describe('$set (privileged)', function () {
      if (!isAdmin()) {
        return;
      }

      it('should throw error for invalid field name', function () {
        should.throws(function () {
          group.foog.$set('wrong', 'garbage');
        }, /Invalid field/);
      });

      it('should allow setting a valid field value', function (done) {
        group.foog.$set('user_list', ['root', 'nobody'])
        .then(function () {
          group.foog.$get('user_list').should.eql(['root', 'nobody']);
          done();
        })
        .done(null, function (err) {
          done(err);
        });
      });

    }); // $set (privileged)

  }); // GGroup

}); // Group

describe('Group', function () {
  describe('$deleteGroup', function () {

    it('should delete group foog using $deleteGroup()', function (done) {
      should(group.foog).not.be.undefined();
      group.foog.should.be.an.instanceof(GGroup);
      group.$deleteGroup('foog')
      .then(function () {
        should(group.foog).be.undefined();
        done();
      })
      .done(null, function (err) {
        done(err);
      });
    });

    it('should delete group foog2 using $delete()', function (done) {
      should(group.foog2).not.be.undefined();
      group.foog2.should.be.an.instanceof(GGroup);
      group.foog2.$delete()
      .then(function () {
        should(group.foog2).be.undefined();
        done();
      })
      .done(null, function (err) {
        done(err);
      });
    });
  });
});
