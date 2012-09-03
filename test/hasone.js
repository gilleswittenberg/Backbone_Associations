$(document).ready(function() {

  test("Create hasOne association on creation with id", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "POST",
      /profiles/,
      [200, { "Content-Type": "application/json" }, '{"id":3}']
    );
	var Profile = Backbone.Model.extend({urlRoot: 'profiles'});
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile},
      ],
    });
    var user = new User({id: 6});
	server.respond();
    ok(typeof user.Profile !== 'undefined', "Create Profile at creation");
    ok(user.Profile instanceof Backbone.Model, "Profile is Model");
    equal(user.Profile.get('user_id'), 6, "Set parentKey (user_id) on Profile Model");
    equal(user.Profile.get('id'), 3, "Set id from server");
  });

  test("Create hasOne association on creation for new model", 1, function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "POST",
      /profiles/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "user_id": null}']
    );
    server.respondWith(
      "POST",
      /users/,
      [200, { "Content-Type": "application/json" }, '{"id":3}']
    );
    server.respondWith(
      "PUT",
      /profiles/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "user_id": 3}']
    );
	var Profile = Backbone.Model.extend({urlRoot: 'profiles'});
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', foreignKey: 'user_id', type: 'hasOne', Model: Profile},
      ],
      urlRoot: 'users'
    });
    var user = new User();
    user.save();
    server.respond();
    equal(user.Profile.get('user_id'), 3, "ParentId saved to association model");
  });

  test('Create hasOne association with specified Model', function () {
    var Profile = Backbone.Model.extend({name: 'ProfileModel', urlRoot: 'profiles'});
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "POST",
      /profiles/,
      [200, { "Content-Type": "application/json" }, '{"id":3}']
    );
    server.respondWith(
      "POST",
      /users/,
      [200, { "Content-Type": "application/json" }, '{"id":6}']
    );
    // tests
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile},
      ],
      urlRoot: 'users'
    });
    var user = new User();
    user.save();
    equal(user.Profile.name, 'ProfileModel', "Model is Profile");
    equal(typeof user.Profile.get('user_id'), 'undefined', "No parentId set on model when parentId is not defined");
    server.respond();
    equal(user.id, 6, "Id set from server response");
    equal(user.Profile.get('user_id'), 6, "ParentId set on model after id is changed");
    equal(user.Profile.id, 3, "Profile id is set from server response");
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
      urlRoot: 'profiles'
    });
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile, reverse: true},
      ],
      urlRoot: 'users'
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
    user.save(null);
    server.respond();
    ok(spy.called);
    equal(user['Profile'].get('role'), 'visitor', "role field for profile with id 3 fetched from server");
    ok(typeof user.get('Profile'), 'undefined', "Profile field not set on user");
  });

  test("Validate", function () {
    var Profile = Backbone.Assoc.Model.extend({
      urlRoot: 'profiles',
      validate: function () {
        return 'Error';
      }
    });
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile},
      ],
      urlRoot: 'users',
    });
    var user = new User({id: 3, Profile: {role: 'visitor'}});
    equal(typeof user.Profile, 'undefined');
  });

  test("Call destroy on association model", function () {
    this.stub(jQuery, 'ajax');
    var Profile = Backbone.Assoc.Model.extend({
      urlRoot: 'profiles',
    });
    var User = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'User', foreignName: 'Profile', type: 'hasOne', Model: Profile},
      ],
      urlRoot: 'users',
    });
    var user = new User();
    var spy = this.spy(user.Profile, 'destroy');
    user.destroy();
    ok(spy.called);
  });
});
