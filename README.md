#Backbone Associations

BackboneJS extension that adds hasMany, hasOne, belongsTo associations to Backbone Models.

[![Build Status](https://travis-ci.org/gilleswittenberg/Backbone_Associations.png)](https://travis-ci.org/gilleswittenberg/Backbone_Associations)

## Setup / Installation

_[script tags]_

Load backbone-associations.js after Backbone.

```
<script src="backbone.js"></script>
<script src="backbone-associations.js"></script>
```

_[RequireJS]_

Load backbone-associations.js using RequireJS shim, depending on Backbone.

```javascript
require.config({
    paths: {
		'backbone': 'path/to/backbone',
		'backbone-associations': 'path/to/backbone-associations'
	},
	shim: {
		'backbone-associations': ['backbone']
	}
});
```

## Usage & Concept

After loading backbone.js, Backbone_Associations will attach (namespace) itself to the Backbone object under the keyname of Backbone.Assoc. Backbone.Assoc will have a Model key (Backbone.Assoc.Model) which can be extended and that will behave as a normal Backbone Model. Except when an associations array is set. This array of associations will be checked and set on the Model instance and will interfere with the parse method. And could set some related Models and/or Collections as keys on the Model when configured.

_[example]_

```javascript
var Comments = Backbone.Collection.extend({url: 'comments'});

var Post = Backbone.Assoc.Model.extend({
  associations: [
	{name: 'Post', foreignName: 'Comments', type: 'hasMany', Collection: Comments}
  ],
});

var post = new Post({
	id: 1,
	title: 'Title of Post',
	Comments: [
		{id: 1, text: 'Lorum'},
		{id: 2, text: 'Ipsum'}
	]
});

console.log(post.Comments instanceof Comments); // true
console.log(post.Comments.size()); // 2
```

Look into the unit-tests for more examples.

## Associations

The following association options are available:

### type
_[String, required, values ("hasMany", "hasOne", "belongsTo", "hasAndBelongsTo")]_

Sets the type of association

### name
_[String, required]_

Sets the name of the Model. Used when the backend returns Model data on named key

### foreignName
_[String, required]_

Sets the name of the association. Used as key for instance. And for the Association Model or Collection instance data on named key returned by backend.

### foreignKey
_[String]_

Sets the foreign key of the association. Used to link the models together.

### Collection
_[object (Backbone.Collection)]_

The Collection constructor used to create an instance for a hasMany association.

### Model
_[object (Backbone.Model)]_

The Model constructor used to create an instance for a hasOne association.

### collection
_[object (Backbone.Collection instance, or function returning Backbone.Collection instance)]_

A collection instance to use a belongsTo association.

### includeInJSON
_[boolean, default: false]_

Set to true to include child association data returned from parent's toJSON method.

### reset
_[boolean, default: true]_

Set to false to not trigger a reset event on hasMany collection, when multiple items are returned from server (on initialization).

### init
_[boolean, default: true]_

Set to false to not create association instance on initialization.

### destroy
_[boolean, default: true]_

Set to false to not trigger a destroy event on each model of associative collection when parent model is destroyed

### reverse
_[boolean, default: false]_

Set to true to also create a key for the parent on the child association
