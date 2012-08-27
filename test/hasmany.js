$(document).ready(function() {

  test("Set collection url", 1, function () {
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend()},
      ],
    });
    var post = new Post();
    equal(post.Comments.url, 'comments' , "Url set on collection");
  });

  test("Create hasMany association on creation with id and lazily fetch models", 5, function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      'GET',
      'comments?post_id=6',
      [200, {'Content-Type': 'application/json'}, '[{"id":2,"title":"Two"},{"id":3,"title":"Three"},{"id":4,"title":"Four"}]']
    );
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend()}
      ],
    });
    console.log('==');
    var post = new Post({id: 6});
    ok(typeof post.Comments !== 'undefined', "Create Comments at creation");
    ok(typeof post.Comments._byCid !== 'undefined', "Comments is collection");
    equal(post.Comments.url, 'comments', "Set URL from lowercase name");
    equal(post.Comments.size(), 0, "No models in newly created collection");
    server.respond();
    equal(post.Comments.size(), 3, "Models fetched from server");
    console.log('==');
  });

  test("Create hasMany association on creation with empty array as attributes", 1, function () {
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend()}
      ],
    });
    var post = new Post({id: 6, Comments: []});
    equal(post.Comments.size(), 0, "Collection models set from attributes");
  });

  test("Create hasMany association on creation with attributes", 1, function () {
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend()}
      ],
    });
    var post = new Post({id: 6, Comments: [{id: 1}, {id:2}]});
    equal(post.Comments.size(), 2, "Collection models set from attributes");
  });

  test("Create hasMany association with specified Collection", 1, function () {
    var Comments = Backbone.Collection.extend({url: 'comments', name: 'CommentsCol'});
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments},
      ],
    });
    var post = new Post();
    equal(post.Comments.name, 'CommentsCol', "Collection is collection specified");
  });

  test("Create hasMany Models from attributes object", function () {
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend()},
      ],
    });
    var attributes = {
      id: 6,
      Comments: [
        {id: 1, post_id: 6},
        {id: 2, post_id: 6},
        {id: 3, post_id: 6}
      ]
    };
    var post = new Post(attributes);
    equal(typeof post.get('Comments'), 'undefined', "Comments not set as attribute on post");
    equal(post.Comments.size(), 3, "Size of Comments");
  });

  test("Init", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      'PUT',
      /post/,
      [200, {'Content-Type': 'application/json'}, '{"id":6, "Comments":[{"id":1,"title":"One"}]}']
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
  });

  test("Hasone reverse association", function () {
    this.stub(jQuery, 'ajax');
    var Comments = Backbone.Model.extend();
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments, reverse: true},
      ]
    });
    var post = new Post({id: 6});
    ok(typeof post.Comments.Post !== 'undefined', "Post defined on Comments");
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
    var Comments = Backbone.Collection.extend();
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
    var post = new Post({id: 6, Comments: [{id:1, title:'One'},{id:2, title:'T'}]});
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
});
