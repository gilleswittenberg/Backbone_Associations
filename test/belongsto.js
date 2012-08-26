$(document).ready(function() {

  test("Create belongsTo association on creation with id", function () {
    // constants to test against
    var id = 6;
    var foreignName = 'User';
    // tests
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {foreignName: foreignName, name: 'Post', type: 'belongsTo', Model: Backbone.Model.extend()},
      ],
    });
    var post = new Post({id: id});
    ok(typeof post[foreignName] !== 'undefined', 'Create User at creation');
    ok(typeof post[foreignName].attributes !== 'undefined', 'User is a Model');
    post[foreignName].set(post[foreignName].idAttribute, id);
    equal(post.get('user_id'), id, 'Set parentKey (user_id) on Profile Model');
  });

  test("Fetch belongsTo association on creation with only id in attributes", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      'GET',
      /users\/3/,
      [200, {'Content-Type': 'application/json'}, '{"id":3,"name":"BB King"}']
    );
    var User = Backbone.Model.extend({urlRoot: 'users'});
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'User', type: 'belongsTo', Model: User},
      ],
    });
    var post = new Post({id: 6, User: {id: 3}});
    server.respond();
    equal(post.User.get('name'), 'BB King', 'Attributes fetched from server');
  });

  test("Create belongsTo association on creation with parent + id", function () {
    var User = Backbone.Model.extend();
    var Profile = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Profile', foreignName: 'User', type: 'belongsTo', Model: User},
      ],
      urlRoot: 'profile'
    });
    var profile = new Profile({id: 6, User: {id: 3, name: 'BB King'}});
    equal(profile.User.id, 3);
    equal(profile.get('user_id'), 3);
  });

  test('Create belongsTo association on creation with specified Model', function () {
    // constants to test against
    var id = 6;
    var foreignName = 'User';
    var User = Backbone.Model.extend({name: 'UserModel'});
    // tests
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {foreignName: foreignName, name: 'Post', type: 'belongsTo', Model: User},
      ],
    });
    var post = new Post({id: id});
    equal(post[foreignName].name, 'UserModel');
  });

  test('Create belongsTo association on creation with specified collection', function () {
    this.stub(jQuery, 'ajax');
    // constants to test against
    var userId = 6;
    var foreignName = 'User';
    var User = Backbone.Model.extend();
    var user = new User({id: userId, name: 'userName'});
    var Users = Backbone.Collection.extend({url: 'users'});
    var users = new Users(user);
    // tests
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {foreignName: foreignName, name: 'Post', type: 'belongsTo', collection: users},
      ],
    });
    var post = new Post({user_id: userId});
    deepEqual(post[foreignName], user, "user from users collection is set as parent model" );
  });

  test("Create belongsTo association on creation with specified but not in collection", function () {
    // stub out jQuery ajax
    this.stub(jQuery, 'ajax', function () {});
    // constants to test against
    var userId = 6;
    var foreignName = 'User';
    var User = Backbone.Model.extend();
    var Users = Backbone.Collection.extend({url: 'users'});
    var users = new Users();
    // tests
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {foreignName: foreignName, name: 'Post', type: 'belongsTo', collection: users}
      ],
    });
    var post = new Post({user_id: userId});
    deepEqual(post[foreignName], users.at(0), "Newly created user from users collection is set as parent model");
  });

  test("Init", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "PUT",
      /post/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "User":{"id":3}}']
    );
    var User = Backbone.Model.extend({
      urlRoot: 'user'
    });
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'User', type: 'belongsTo', Model: User, init: false},
      ],
      urlRoot: 'post'
    });
    var post = new Post({id: 6});
    equal(typeof post.User, 'undefined');
    post.save();
    server.respond();
    ok(typeof post.User !== 'undefined');
  });

  /*
  test("BelongsTo reverse association", function () {
    var User = Backbone.Model.extend({
      urlRoot: 'user'
    });
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'User', type: 'belongsTo', Model: User, reverse: true},
      ],
      urlRoot: 'post'
    });
    var post = new Post({id: 6});
    ok(typeof post.User.Post !== 'undefined');
  });
  */

  test("Include in JSON", function () {
    var User = Backbone.Model.extend();
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'User', type: 'belongsTo', Model: User, includeInJSON: true},
      ],
    });
    var attributes = {
      "id": 3,
      "user_id": 6,
      "User": {
         "id": 6,
         "name": "BB King"
      }
    };
    var post = new Post(attributes);
    var json = post.toJSON();
    equal(json.id, 3, "Id is set on json");
    equal(json.user_id, 6, "User_id is set on json");
    ok(typeof json.User !== 'undefined', "User is set");
    equal(json.User.id, 6, "User attribute id is in json");
    equal(json.User.name, 'BB King', "User attribute name is in json");
  });

  test("Save model when server returns nested data", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "PUT",
      /profile\/6/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "User":{"id":3,"name":"BB King"}}']
    );
    var User = Backbone.Model.extend();
    var Profile = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Profile', foreignName: 'User', type: 'belongsTo', Model: User},
      ],
      urlRoot: 'profile'
    });
    var profile = new Profile({id: 6, User: {id: 3, name: ''}});
    profile.save();
    server.respond();
    equal(profile.User.get('name'), 'BB King', "name field for user with id 3 fetched from server");
  });

  test("Change belongsTo non-existing", function () {
    var Profile = Backbone.Assoc.Model.extend({
      urlRoot: 'profile'
    });
    var profile = new Profile({id: 6, User: {id: 3, name: ''}});
    ok(profile.changeBelongsTo('NonExist') === false);
  });

  test("Change belongsTo", function () {
    var User = Backbone.Model.extend({name: 'User'});
    var Profile = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Profile', foreignName: 'User', type: 'belongsTo', Model: User},
      ],
      urlRoot: 'profile'
    });
    var profile = new Profile({id: 6, User: {id: 3, name: ''}});
    equal(profile.get('user_id'), 3);
    ok(profile.changeBelongsTo('User', {id: 4, name: 'BB King'}));
    equal(profile.User.get('name'), 'BB King');
    equal(profile.User.name, 'User');
    equal(profile.get('user_id'), 4);
  });

  test("Change belongsTo with Model", function () {
    var User = Backbone.Model.extend();
    var Profile = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Profile', foreignName: 'User', type: 'belongsTo', Model: User},
      ],
      urlRoot: 'profile'
    });
    var user = new User({id: 4});
    var profile = new Profile({id: 6, User: {id: 3, name: ''}});
    ok(profile.changeBelongsTo('User', user));
    equal(profile.User.id, 4);
    equal(profile.get('user_id'), 4);
  });

  test("Change belongsTo with int as id in collection", function () {
    var User = Backbone.Model.extend();
    var Users = Backbone.Collection.extend();
    var users = new Users(new User({id: 4}));
    var Profile = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Profile', foreignName: 'User', type: 'belongsTo', Model: User, collection: users},
      ],
      urlRoot: 'profile'
    });
    var profile = new Profile({id: 6, User: {id: 3, name: ''}});
    ok(profile.changeBelongsTo('User', 4));
    equal(profile.User.id, 4);
    equal(profile.get('user_id'), 4);
  });

  test("Change belongsTo with int as id not in collection", function () {
    this.stub(jQuery, 'ajax');
    var User = Backbone.Model.extend();
    var Users = Backbone.Collection.extend({url: 'users'});
    var users = new Users();
    var Profile = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Profile', foreignName: 'User', type: 'belongsTo', Model: User, collection: users},
      ],
      urlRoot: 'profile'
    });
    var profile = new Profile({id: 6, User: {id: 3, name: ''}});
    ok(profile.changeBelongsTo('User', 4));
    equal(users.size(), 1);
    equal(profile.User.id, 4);
    equal(profile.get('user_id'), 4);
  });

  test("Listeners belongsTo", function () {
    var User = Backbone.Model.extend();
    var Profile = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Profile', foreignName: 'User', type: 'belongsTo', Model: User, init: false},
      ],
      urlRoot: 'profile'
    });
    var profile = new Profile({id: 6});
    var user1 = new User();
    var user2 = new User();
    var spy = this.spy(profile, 'set');
    profile.changeBelongsTo('User', user1);
    profile.changeBelongsTo('User', user2);
    user1.set('id', 1);
    ok(spy.called === false);
    user2.set('id', 2);
    ok(spy.called);
  });
});
