$(document).ready(function() {

  test('Create hasOne association on creation with id', function () {
    this.stub(jQuery, 'ajax');
    // constants to test against
    var id = 6;
    var foreignName = 'Profile';
    // tests
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {foreignName: foreignName, name: 'User', type: 'hasOne', Model: Backbone.Model.extend({urlRoot: '/'})},
      ],
    });
    var user = new User({id: id});
    ok(typeof user[foreignName] !== 'undefined', 'Create Profile at creation');
    ok(typeof user[foreignName].attributes !== 'undefined', 'Profile is Model');
    equal(user[foreignName].get('user_id'), id, 'Set parentKey (user_id) on Profile Model');
  });

  test('Create hasOne association on creation for new model with foreignKey', 2, function () {
    this.stub(jQuery, 'ajax');
    // constants to test against
    var id = 6;
    var foreignName = 'Profile';
    // tests
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: foreignName, foreignKey: 'user_id', type: 'hasOne', Model: Backbone.Model.extend({urlRoot: '/'})},
      ],
    });
    var user = new User();
    ok(typeof user[foreignName].get('user_id') === 'undefined', "No parentId set on model when parentId is not defined");
    user.set(user.idAttribute, id);
    ok(typeof user[foreignName].get('user_id') !== 'undefined', "ParentId set on model after id is changed");
  });

  test('Create hasOne association with specified Model', function () {
    // constants to test against
    var id = 6;
    var foreignName = 'Profile';
    var Profile = Backbone.Model.extend({name: 'ProfileModel', urlRoot: 'profile'});
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "POST",
      /profile/,
      [200, { "Content-Type": "application/json" }, '{"id":3,"user_id":6}']
    );
    // tests
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: foreignName, type: 'hasOne', Model: Profile},
      ],
    });
    var user = new User();
    equal(user[foreignName].name, 'ProfileModel');
    ok(typeof user[foreignName].get('user_id') === 'undefined', "No parentId set on model when parentId is not defined");
    server.respond();
    equal(user[foreignName].id, 3);
    user.set(user.idAttribute, id);
    ok(typeof user[foreignName].get('user_id') !== 'undefined', "ParentId set on model after id is changed");
  });

  test("Fetch foreign model from attribute id", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "GET",
      /profile\/3/,
      [200, { "Content-Type": "application/json" }, '{"id":3,"role":"visitor"}']
    );
    var Profile = Backbone.Model.extend({url: 'profile/3'});
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile},
      ],
    });
    var user = new User({id: 6, Profile: {id: 3}});
    server.respond();
    equal(user['Profile'].get('role'), 'visitor', "role field for profile with id 3 fetched from server");
  });

  test("Create hasone model with attributes", function () {
    var Profile = Backbone.Model.extend();
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile},
      ],
    });
    var user = new User({id: 6, Profile: {id: 3, role: 'visitor'}});
    equal(user['Profile'].get('role'), 'visitor', "role field for profile with id 3 fetched from server");
  });

  test("Init", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "PUT",
      /user/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "Profile":{"id":3,"role":"visitor"}}']
    );
    var Profile = Backbone.Model.extend({
      urlRoot: 'profile'
    });
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile, init: false},
      ],
      urlRoot: 'user'
    });
    var user = new User({id: 6});
    equal(typeof user.Profile, 'undefined');
    user.save();
    server.respond();
    ok(typeof user.Profile !== 'undefined');
  });

  test("Hasone reverse association", function () {
    this.stub(jQuery, 'ajax');
    var Profile = Backbone.Model.extend({
      urlRoot: 'profile'
    });
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile, reverse: true},
      ],
      urlRoot: 'user'
    });
    var user = new User({id: 6});
    ok(typeof user.Profile.User !== 'undefined');
  });

  test("Include in JSON", function () {
    var Profile = Backbone.Model.extend({urlRoot: 'profile'});
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Backbone.Model.extend(), includeInJSON: true},
      ],
    });
    var attributes = {
      "id": 3,
      "Profile": {
         "id": 6,
         "user_id": 3,
         "role": "visitor"
      }
    };
    var user = new User(attributes);
    var json = user.toJSON();
    equal(json.id, 3, "Id is set on json");
    ok(typeof json.Profile !== 'undefined', "Profile is set");
    equal(json.Profile.id, 6, "Profile attributes are in json");
    equal(json.Profile.role, 'visitor', "Profile attributes are in json");
  });

  test("Save model when server returns nested data", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "PUT",
      /user\/6/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "Profile":{"id":3,"role":"visitor"}}']
    );
    var Profile = Backbone.Model.extend({});
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile},
      ],
      urlRoot: 'user'
    });
    var user = new User({id: 6, Profile: {id: 3, role: ''}});
    var spy = this.spy();
    user.Profile.on('change', spy);
    user.save(null, {error: function () {console.log(arguments);}});
    server.respond();
    ok(spy.called);
    equal(user['Profile'].get('role'), 'visitor', "role field for profile with id 3 fetched from server");
    ok(typeof user.get('Profile'), 'undefined', "Profile field not set on user");
  });
});
