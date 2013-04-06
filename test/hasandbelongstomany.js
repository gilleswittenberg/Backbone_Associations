$(document).ready(function() {

  test("Create hasAndBelongsToMany association on init with attributes", 4, function () {
    var Posts = Backbone.Collection.extend();
    var Category = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Category', foreignName: 'Posts', type: 'hasAndBelongsToMany', Collection: Posts}
      ],
    });
    category = new Category({Posts:[{id: 1, text: 'a'}, {id:2, text: 'b'}]});
    ok(typeof category.Posts !== 'undefined', "Posts set on Category model");
    ok(category.Posts instanceof Backbone.Collection, "Category.Posts instance of Backbone.Collection");
    ok(category.Posts instanceof Posts, "Category.Posts instance of Posts");
    equal(category.Posts.size(), 2, "Collection models set from attributes");
  });

  test("Create hasAndBelongsToMany association on init with empty attributes", 1, function () {
    var Posts = Backbone.Collection.extend();
    var Category = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Category', foreignName: 'Posts', type: 'hasAndBelongsToMany', Collection: Posts}
      ],
    });
    category = new Category({Posts:[]});
    equal(category.Posts.size(), 0, "Collection models set from attributes");
  });

  test("Include in JSON", function () {
    var Posts = Backbone.Collection.extend();
    var Category = Backbone.Assoc.Model.extend({
      associations: [
        {name: 'Category', foreignName: 'Posts', type: 'hasAndBelongsToMany', Collection: Posts, includeInJSON: true}
      ],
    });
    var category = new Category({id: 3, Posts:[{id: 1, text: 'a'}, {id:2, text: 'b'}]});
    var json = category.toJSON();
    equal(json.id, 3, "Id is set on json");
    ok(_.isArray(json.Posts), "Posts is array");
    equal(json.Posts[0].text, 'a', "Posts from attributes are in json");
  });
});
