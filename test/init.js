$(document).ready(function() {

  test('Backbone.Assoc', 2, function() {
    ok(typeof Backbone.Assoc !== 'undefined', 'Backbone.Assoc is defined');
    ok(typeof Backbone.Assoc.Model !== 'undefined', 'Backbone.Assoc.Model is defined');
  });

  test("Instanceof", 1, function () {
    var Model = Backbone.Assoc.Model.extend();
    var model = new Model();
    ok(model instanceof Backbone.Model);
  });

  test("Associations undefined if no valid associations", 1, function () {
    var associations = [{foreignName: 'Comments', type: 'hasMany'}];
    var Post = Backbone.Assoc.Model.extend({
      associations: associations
    });
    var post = new Post({id: 6});
    equal(post.associations.length, 0, "post.associations is empty array");
  });

  test('Association set on model instance', 1, function () {
    this.stub(jQuery, 'ajax');
    var associations = [{name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend()}];
    var Post = Backbone.Assoc.Model.extend({
      associations: associations
    });
    var post = new Post({id: 6});
    deepEqual(post.associations, associations);
  });

  test("Associations checked and removed", function () {
    // stub out jQuery ajax
    this.stub(jQuery, 'ajax');
    var associations = [
      // no name
      {type: 'hasMany', foreignName: 'Posts'},
      // no type
      {name: 'User', foreignName: 'Name'},
      // false type
      {name: 'User', foreignName:'Post', type: 'falseType'},
      // no foreignName
      {name: 'User', type: 'hasMany'},
      // invalid hasMany association (no collection)
      {name: 'Post', foreignName: 'Comments', type: 'hasMany'},
      // invalid belongsTo association
      {name: 'User', foreignName: 'Profile', type: 'belongsTo'},
      // valid belongsTo association
      {name: 'User', foreignName: 'Post', Model: Backbone.Model.extend({urlRoot: '/'}), type: 'belongsTo'},
      // another valid belongsTo association
      {name: 'User', foreignName: 'Post', collection: new (Backbone.Collection.extend({url: '/'}))(), type: 'belongsTo'},
      // valid hasMany association
      {name: 'Post', foreignName: 'Comments', Collection: Backbone.Collection.extend(), type: 'hasMany'},
      // valid hasOne association
      {name: 'User', foreignKey: 'user_id', foreignName: 'Profile', Model: Backbone.Model.extend({urlRoot: '/'}), type: 'hasOne'},
      // valid belongsTo association
      {name: 'User', foreignName: 'Post', Model: Backbone.Model.extend({urlRoot: '/'}), type: 'belongsTo'},
    ];
    var Post = Backbone.Assoc.Model.extend({
      associations: associations
    });
    var post = new Post();
    equal(post.associations.length, 5, "Remove invalid associations");
  });

  test("Defaults", function () {
    var Model = Backbone.Assoc.Model.extend({
      defaults: {title: 'Ttle'}
    });
    var model = new Model();
    equal(model.get('title'), 'Ttle');
  });

  test("Attributes", function () {
    var Model = Backbone.Assoc.Model.extend();
    var model = new Model({title: 'Ttle'});
    equal(model.get('title'), 'Ttle');
  });
});
