(function () {

  Backbone.Assoc = {};

  // copy initialization from Backbone.Model and add associationAttributes, parseAssociations and initializeAssociations calls
  // this should be updated if Backbone.Model changes
  Backbone.Assoc.Model = function (attributes, options) {
    var defaults;
    //+
    this.associationAttributes = {};
    this.initialized = false;
    //+
    attributes || (attributes = {});
    if (options && options.collection) this.collection = options.collection;
    //++
    // check associations and parse association attributes
    if (this.associations) {
      this.checkAndSetAssociations();
    }
    //++
    if (options && options.parse) attributes = this.parse(attributes);
    //+++
    if (this.associations && (!options || !options.parse)) {
      attributes = this.parseAssociations.call(this, _.clone(attributes));
    }
    //+++
    if (defaults = getValue(this, 'defaults')) {
      attributes = _.extend({}, defaults, attributes);
    }
    this.attributes = {};
    this._escapedAttributes = {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this.set(attributes, {silent: true});
    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this._previousAttributes = _.clone(this.attributes);
    //++++
    if (this.associations) {
      this.initializeAssociations.call(this, this.associationAttributes);
    }
    //++++
    this.initialize.apply(this, arguments);
    //+++++
    this.initialized = true;
    //+++++
  }

  Backbone.Assoc.Model.prototype = new Backbone.Model();

  // add Backbone.Model.prototype to Backbone.Assoc.Model
  _.extend(Backbone.Assoc.Model.prototype, {

    associations: [],

    checkAndSetAssociations: function () {
      var i, l, association, type;
      var allowedTypes = ['hasMany', 'hasOne', 'belongsTo', 'hasAndBelongsToMany'];
      var arr = [];
      for (i = 0, l = this.associations.length; i < l; i++) {
        association = this.associations[i];
        type = association.type;
        // check if name is set
        if (!association.name) {
          continue;
        }
        // check if type is set and is an allowed value
        if (!type || _.indexOf(allowedTypes, type) === -1) {
          continue;
        }
        // check if foreignName is set
        if (!association.foreignName) {
          continue;
        }
        // check if Collection is set for hasMany association
        if (type === 'hasMany' && typeof association.Collection !== 'function') {
          continue;
        }
        // check if Model is set for hasOne association
        if (type === 'hasOne' && typeof association.Model !== 'function') {
          continue;
        }
        // check if Model or collection is set for hasOne association
        if (type === 'belongsTo' && typeof association.Model !== 'function' && !association.collection) {
          continue;
        }
        // check if foreignKey or name is set for hasMany and hasOne
        if ((type === 'hasMany' || type === 'hasOne') && !association.name && !association.foreignKey) {
          continue;
        }
        arr.push(association);
        if (association.includeInJSON) {
          this.toJSON = this.toAssociativeJSON;
        }
      }
      this.associations = arr;
    },

    _getAssociation: function (type, name) {
      if (!name) {
        name = type;
        type = 'name';
      }
      for (var i = 0, l = this.associations.length; i < l; i++) {
        if (this.associations[i][type] === name) {
          return this.associations[i];
        }
      }
      return false;
    },

    // overwrite parse. Make sure you add a call to parseAssociation if you overwrite this again in your model
    parse: function (resp, xhr) {
      if (this.associations) {
        resp = this.parseAssociations.call(this, resp);
      }
      return resp;
    },

    parseAssociations: function (attributes) {
      var i, l, association, foreignName;
      for (i = 0, l = this.associations.length; i < l; i++) {
        association = this.associations[i];
        foreignName = association.foreignName;
        if (typeof attributes[foreignName] !== 'undefined') {
          if (typeof this[foreignName] !== 'undefined') {
            this._setAssociationAttributes(association, attributes[foreignName]);
          } else if (this.initialized !== false) {
            this._initAssociation(association, attributes[foreignName]);
          }
          //?? associationAttributes[associations[i].foreignName] = _.clone(attributes[associations[i].foreignName]);
          this.associationAttributes[foreignName] = attributes[foreignName];
          delete attributes[foreignName];
        }
      }
      return attributes;
    },

    initializeAssociations: function (associationAttributes) {
      var i, l, association, foreignName;
      for (i = 0, l = this.associations.length; i < l; i++) {
        association = this.associations[i];
        foreignName = association.foreignName;
        // abort if init is false and no attributes set
        if (typeof associationAttributes[foreignName] === 'undefined' && association.init === false) {
          continue;
        }
        attributes = typeof associationAttributes[foreignName] !== 'undefined' ? associationAttributes[foreignName] : {};
        this._initAssociation(association, attributes);
      }
    },

    changeBelongsTo: function (foreignName, attributes) {
      var model, Model, foreignKey, that;
      var association = this._getAssociation('foreignName', foreignName);

      if (!association) {
        return false;
      }

      if (attributes instanceof Backbone.Model) {
        model = attributes;
      } else if (_.isNumber(attributes) && association.collection) {
        model = association.collection.get(attributes);
        if (!model) {
          model = association.collection.create({id: attributes});
        }
      } else {
        Model = association.Model ? association.Model : Backbone.Model.extend();
        model = new Model(attributes);
      }
      foreignKey = this._getForeignKey(association);
      if (this[foreignName]) {
        this[foreignName].off('change:' + foreignKey);
      }
      this[foreignName] = model;
      if (model.id) {
        this.set(this._getKey(association), model.id);
      } else {
        that = this;
        this[foreignName].on('change:' + foreignKey, function () { that._setParentIdToModel(association); });
      }
      return this[foreignName];
    },

    _initAssociation: function (association, attributes) {

      var foreignName = association.foreignName;
      var parentId;
      var key = this._getKey(association);
      var foreignKey = this._getForeignKey(association);
      var protoProps = {};
      var that;
      var Model, Collection;
      var model = false;

      switch (association.type) {

        case 'hasMany':
          parentId = this.id;
          // set empty object to null
          attributes = !_.isEmpty(attributes) ? attributes : null;
          this[foreignName] = new association.Collection(attributes);
          this[foreignName].url = foreignName.toLowerCase();
          this[foreignName].fetch = function fetch(options) {
            options = options ? options : {};
            options.data = options.data ? options.data : {};
            options.data[foreignKey] = parentId;
            if (association.Collection.prototype.fetch !== Backbone.Collection.prototype.fetch) {
              return association.Collection.prototype.fetch.call(this, options);
            } else {
              return Backbone.Collection.prototype.fetch.call(this, options);
            }
          }
          if (!attributes && parentId) {
            this[foreignName].fetch();
          }
          break;

        case 'hasOne':
          parentId = this.id;
          if (parentId) {
            attributes[foreignKey] = parentId;
          } else {
            this.on('change:' + key, function () { this._setKeyToModel(association); });
          }
          Model = association.Model ? association.Model : Backbone.Model.extend();
          this[foreignName] = new Model(attributes);
          // fetch data from server when only id (and parentId) are set
          if (attributes[this[foreignName].idAttribute] && _.keys(attributes).length <= 2) {
            this[foreignName].fetch();
          }
          // save if new
          else if (this[foreignName].isNew()) {
            this[foreignName].save();
          }
          break;

        case 'belongsTo':
          parentId = this.get(key);
          if (parentId) {
            attributes[foreignKey] = parentId;
            if (association.collection) {
              model = association.collection.get(attributes[foreignKey]);
              if (!model) {
                model = association.collection.create(attributes);
              }
            }
          } else {
            if (attributes.id) {
              this.set(key, attributes.id);
            }
          }
          if (!model) {
            Model = association.Model ? association.Model : Backbone.Model.extend();
            model = new Model(attributes);
          }
          this[foreignName] = model;
          if (!this[foreignName].isNew() && _.keys(attributes).length <= 1) {
            this[foreignName].fetch();
          } else if(this[foreignName].isNew() && !association.collection) {
            this[foreignName].save();
          }
          that = this;
          this[foreignName].on('change:' + foreignKey, function () { that._setParentIdToModel(association); });
          break;
      }

      if (association.type !== 'belongsTo' && association.reverse) {
        this[foreignName][association.name] = this;
      }
    },

    _setAssociationAttributes: function (association, attributes) {
      switch (association.type) {
        case 'hasOne':
        case 'belongsTo':
          this[association.foreignName].set(attributes);
          break;
        case 'hasMany':
          if (association.reset === false) {
            this._resetCollection(this[association.foreignName], attributes);
          } else {
            this[association.foreignName].reset(attributes);
          }
          break;
      }
    },

    _resetCollection: function (collection, models) {
			var oldModels;
      models = _.isArray(models) ? models : [models];
      // iterate over models
      _.each(models, function (model) {
        if (!model.id || _.isUndefined(collection.get(model.id))) {
          // new models
          collection.add(model);
        } else {
          // current models
          collection.get(model.id).set(model);
        }
      }, this);
      // removed models
      oldModels = _.difference(_.pluck(collection.models, 'id'), _.pluck(models, 'id'));
      _.each(oldModels, function (id) { collection.remove(id); }, this);
		},

    toAssociativeJSON: function () {
      var i, l, association;
      var attributes = Backbone.Model.prototype.toJSON.call(this);
      for (i = 0, l = this.associations.length; i < l; i++) {
        association = this.associations[i];
        if (association.includeInJSON) {
          attributes[association.foreignName] = this[association.foreignName].toJSON();
        }
      }
      return attributes;
    },

    _setKeyToModel: function (association) {
      this[association.foreignName].set(this._getForeignKey(association), this.id);
    },

    _setParentIdToModel: function (association) {
      this.set(this._getKey(association), this[association.foreignName].id);
    },

    _getKey: function (association) {
      /*
      if (association.key) {
        return association.key;
      }
      */
      switch (association.type) {
        case 'hasMany':
        case 'hasOne':
          return this.idAttribute;
        case 'belongsTo':
          return association.foreignName.toLowerCase() + '_id';
      }
    },

    _getForeignKey: function (association) {
      if (association.foreignKey) {
        return association.foreignKey;
      }
      switch (association.type) {
        case 'hasMany':
        case 'hasOne':
          return association.name.toLowerCase() + '_id';
        case 'belongsTo':
          return this.idAttribute;
      }
    }
  });


  // copied from Backbone

  // The self-propagating extend function that Backbone classes use.
  var extend = function(protoProps, classProps) {
    return inherits(this, protoProps, classProps);
  };

  // Set up inheritance for the model, collection, and view.
  Backbone.Assoc.Model.extend = extend;

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };
}());
