$(document).ready(function() {

  test("Create hasMany association on creation with id and lazily fetch models", 4, function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      'GET',
      'comments?post_id=6',
      [200, {'Content-Type': 'application/json'}, '[{"id":2,"title":"Two"},{"id":3,"title":"Three"},{"id":4,"title":"Four"}]']
    );
    var Comments = Backbone.Collection.extend({url: 'comments'});
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments}
      ],
    });
    var post = new Post({id: 6});
    ok(typeof post.Comments !== 'undefined', "Create Comments key on model at creation");
    ok(post.Comments instanceof Backbone.Collection, "Comments is collection");
    equal(post.Comments.size(), 0, "No models in newly created collection");
    server.respond();
    equal(post.Comments.size(), 3, "Models fetched from server");
  });

  test("Create hasMany association on creation with attributes", 1, function () {
    var Comments = Backbone.Collection.extend({url: 'comments'});
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments}
      ],
    });
    var post = new Post({id: 6, Comments: [{id: 1}, {id:2}]});
    equal(post.Comments.size(), 2, "Collection models set from attributes");
  });

  test("Create hasMany association on creation with empty array as attributes", 1, function () {
    var Comments = Backbone.Collection.extend({url: 'comments'});
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments}
      ],
    });
    var post = new Post({id: 6, Comments: []});
    equal(post.Comments.size(), 0, "Collection models set from attributes and not fetched from server");
  });

  test("Fetch of association collection to return false when model is new", 1, function () {
    var Comments = Backbone.Collection.extend({url: 'comments'});
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments}
      ],
    });
    var post = new Post();
    ok(!post.Comments.fetch());
  });

  test("Init", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      'PUT',
      /post/,
      [200, {'Content-Type': 'application/json'}, '{"id":6, "Comments":[{"id":1,"title":"One"},{"id":2,"title":"Two"}]}']
    );
    var Comments = Backbone.Collection.extend();
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments, init: false},
      ],
      urlRoot: 'post'
    });
    var post = new Post({id: 6});
    equal(typeof post.Comments, 'undefined', "Comments not defined on post");
    post.save();
    server.respond();
    ok(typeof post.Comments !== 'undefined', "Comments defined on post after fetch from server");
    equal(post.Comments.size(), 2, "Comments added to collection");
  });

  test("Include in JSON", function () {
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend(), includeInJSON: true},
      ],
    });
    var attributes = {
      id: 3,
      Comments: [
        {id: 1, post_id: 3},
        {id: 2, post_id: 3},
        {id: 3, post_id: 3}
      ]
    };
    var post = new Post(attributes);
    var json = post.toJSON();
    equal(json.id, 3, "Id is set on json");
    ok(_.isArray(json.Comments), "Comments is array");
    equal(json.Comments.length, 3, "Comments from attributes are in json");
  });

  test("Save model when server returns nested data", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      'PUT',
      /post\/6/,
      [200, {'Content-Type': 'application/json'}, '{"id":6, "Comments":[{"id":1,"title":"One"},{"id":2,"title":"Two"},{"id":3,"title":"Three"}]}']
    );
    var Comments = Backbone.Collection.extend({url: 'comments'});
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments},
      ],
      urlRoot: 'post'
    });
    var post = new Post({id: 6});
    var spy = this.spy();
    post.Comments.on('reset', spy);
    post.save();
    server.respond();
    ok(spy.called, "Reset triggered on Comments collection");
    equal(post.Comments.size(), 3, "Comments fetched from server");
  });

  test("Collection to trigger add, remove and change after save / fetch from server", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      'PUT',
      /post\/6/,
      [200, {'Content-Type': 'application/json'}, '{"id":6, "Comments":[{"id":2,"title":"Two"},{"id":3,"title":"Three"},{"id":4,"title":"Four"}]}']
    );
    var Comments = Backbone.Collection.extend();
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments, reset: false},
      ],
      urlRoot: 'post'
    });
    var post = new Post({id: 6, Comments: [{id: 1, title: 'One'},{id: 2, title: 'T'}]});
    equal(post.Comments.size(), 2, "Comment on post");
    var spyAdd = this.spy();
    var spyChange = this.spy();
    var spyDestroy = this.spy();
    post.Comments.on('add', spyAdd);
    post.Comments.on('change', spyChange);
    post.Comments.on('remove', spyDestroy);
    post.save();
    server.respond();
    ok(spyAdd.calledTwice, "Add triggered on Comments collection");
    ok(spyChange.called, "Change triggered on Comments collection");
    ok(spyDestroy.called, "Remove triggered on Comments collection");
    equal(post.Comments.size(), 3, "Comments fetched from server");
  });

  test("Call destroy on all association models", function () {
    this.stub(jQuery, 'ajax');
    var Comments = Backbone.Collection.extend({
      url: 'comments',
    });
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments},
      ],
      urlRoot: 'posts',
    });
    var post = new Post({id: 1, Comments: [{id: 2}, {id: 3}]});
    var spy1 = this.spy(post.Comments.at(0), 'destroy');
    var spy2 = this.spy(post.Comments.at(1), 'destroy');
    post.destroy();
    ok(spy1.called);
    ok(spy2.called);
  });
});
