# passwd-group-obj

Password and group maintenance library using promises.

(part of the [Partout](https://github.com/gbevan/partout) project).

## passwd

```javascript
var passwd = require('passwd-group-obj').passwd,
    PUser = require('passwd-group-obj').PUser;

passwd.$loadUsers()
.then(function () {
  return passwd.$addUser(new PUser({
    name: 'foo',
    uid: 32000,
    gid: 8,
    gecos: 'Foo User',
    dir: '/home/foo',
    shell: '/bin/bash'
  }))
})
.then(function () {
  console.log('foo user:', passwd.foo);

  return passwd.foo.$set('gecos', 'FOO');
})
.then(function () {
  console.log('foo user gecos:', passwd.foo.$get('gecos'));

  return passwd.foo.$delete();
})
```

Also manages shadow password attributes, like min/max age, expire etc.

## group

```javascript
var group = require('passwd-group-obj').group,
    GGroup = require('passwd-group-obj').GGroup;

group.$loadGroups()
.then(function () {
  return group.$addGroup(new GGroup({
    name: 'foog',
    gid: 32000,
    user_list: ['root', 'sshd']
  }))
})
.then(function () {
  console.log('foog group:', group.foog);

  return group.foog.$set('gid', 32003);
})
.then(function () {
  console.log('foog gid:', group.foog.$get('gid'));

  return group.foog.$delete();
})
```

## \*\*\* WARNING About running unit-tests as a priviledged user \*\*\*

If the unit-tests are run as root, they WILL make test changes to /etc/passwd, /etc/shadow and /etc/group.

My test environment is safely achieved using LXD containers for various flavours of Linux.  See these scripts for details:
* https://github.com/partoutx/partout/blob/master/agent/launch_lxd_test_containers.sh
* https://github.com/partoutx/partout/blob/master/agent/start_lxd_containers.sh
* https://github.com/partoutx/partout/blob/master/agent/stop_lxd_containers.sh
* https://github.com/partoutx/partout/blob/master/agent/delete_lxd_containers.sh

The container folder bindings allow me to run gulp watch and to have unit-tests run in all containers every time a change is saved.

# LICENSE
MIT
