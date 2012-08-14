$(document).ready(function() {

  test('Create hasMany association on creation with id', 4, function () {
    // constants to test against
    var id = 6;
    var foreignName = 'Comments';
    // tests
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: foreignName, type: 'hasMany', Collection: Backbone.Collection.extend()},
      ],
    });
    var post = new Post({id: id});
    ok(typeof post[foreignName] !== 'undefined', 'Create Comments at creation');
    ok(typeof post[foreignName]._byCid !== 'undefined', 'Comments is collection');
    ok(post[foreignName].url === foreignName + '/' + id, 'Set parentKey to URL of Comments collection');
    ok(post[foreignName].size() === 0, 'No models in newly created collection');
  });

  test('Create hasMany association on creation for new model', 2, function () {
    // constants to test against
    var id = 6;
    var foreignName = 'Comments';
    // tests
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: foreignName, type: 'hasMany', Collection: Backbone.Collection.extend()},
      ],
    });
    var post = new Post();
    ok(typeof post[foreignName].url === 'undefined', 'No url set on collection when parentId is not defined');
    post.set(post.idAttribute, id);
    ok(typeof post[foreignName].url !== 'undefined', 'Url set on collection after id is changed');
  });

  test('Create hasMany association with specified Collection', 1, function () {
    // constants to test against
    var id = 6;
    var foreignName = 'Comments';
    var Comments = Backbone.Collection.extend({name: 'CommentsCol'});
    // tests
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: foreignName, type: 'hasMany', Collection: Comments},
      ],
    });
    var post = new Post();
    equal(post[foreignName].name, 'CommentsCol');
  });

  test("Create hasMany Models from attributes object", function () {
    var id = 6;
    var foreignName = 'Comments';
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: foreignName, type: 'hasMany', Collection: Backbone.Collection.extend()},
      ],
    });
    var attributes = {
      "id": id,
      "Comments": [
        {"id": 1, "post_id": id},
        {"id": 2, "post_id": id},
        {"id": 3, "post_id": id}
      ]
    };
    var post = new Post(attributes);
    equal(typeof post.get(foreignName), 'undefined', "Comments not set as attribute on post");
    equal(post[foreignName].size(), 3, "Size of Comments");
  });

  test("Init", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "PUT",
      /post/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "Comments":[{"id":1,"title":"One"}]}']
    );
    var Comments = Backbone.Model.extend({
      url: 'comments'
    });
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments, init: false},
      ],
      urlRoot: 'post'
    });
    var post = new Post({id: 6});
    equal(typeof post.Comments, 'undefined');
    post.save();
    server.respond();
    ok(typeof post.Comments !== 'undefined');
  });

  test("Hasone reverse association", function () {
    this.stub(jQuery, 'ajax');
    var Comments = Backbone.Model.extend({
      url: 'comments'
    });
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments, reverse: true},
      ],
      urlRoot: 'post'
    });
    var post = new Post({id: 6});
    ok(typeof post.Comments.Post !== 'undefined');
  });

  test("Include in JSON", function () {
    var Post = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Backbone.Collection.extend(), includeInJSON: true},
      ],
    });
    var attributes = {
      "id": 3,
      "Comments": [
        {"id": 1, "post_id": 3},
        {"id": 2, "post_id": 3},
        {"id": 3, "post_id": 3}
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
      "PUT",
      /post\/6/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "Comments":[{"id":1,"title":"One"},{"id":2,"title":"Two"},{"id":3,"title":"Three"}]}']
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

  test("Collection to trigger add, remove and change ", function () {
    var server = this.sandbox.useFakeServer();
    server.respondWith(
      "PUT",
      /post\/6/,
      [200, { "Content-Type": "application/json" }, '{"id":6, "Comments":[{"id":2,"title":"Two"},{"id":3,"title":"Three"},{"id":4,"title":"Four"}]}']
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
