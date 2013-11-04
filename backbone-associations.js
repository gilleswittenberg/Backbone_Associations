(function () {
  "use strict";

  Backbone.Assoc = {};

  // copy initialization from Backbone.Model and add associationAttributes, parseAssociations and initializeAssociations calls
  // this should be updated if Backbone.Model changes
  Backbone.Assoc.Model = function (attributes, options) {
    var attrs = attributes || {};
	options || (options = {});
	this.cid = _.uniqueId('c');
	this.attributes = {};

    //+
    this.associationAttributes = {};
    this.initialized = false;
    //+
	
    if (options && options.collection) this.collection = options.collection;

    //++
    // check associations and parse association attributes
    if (this.associations) {
      this.checkAndSetAssociations();
    }
    //++
	
	if (options.parse) attrs = this.parse(attrs, options) || {};
	attrs = _.defaults({}, attrs, _.result(this, 'defaults'));

    //+++
    if (this.associations && (!options || !options.parse)) {
      attrs = this.parseAssociations.call(this, _.clone(attrs));
    }
    //+++

	this.set(attrs, options);
    this.changed = {};

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
        // get copy of association
        association = _.clone(this.associations[i]);
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
        // check if Model or collection is set for belongsTo association
        if (type === 'belongsTo' && typeof association.Model !== 'function' && !association.collection) {
          continue;
        }
        // set attributesName
        if (!association.attributeName) {
          association.attributeName = association.foreignName;
        }
        // set collection from function return value
        if (type === 'belongsTo' && typeof association.collection === 'function') {
          association.collection = association.collection();
        }
        // set destroy to be recursively called
        association.destroy = association.destroy === false ? false : true;
        arr.push(association);
        // initialize toAssociativeJSON
        //++ could be improved according to speed (don't check / overwrite after first overwrite)
        if (association.includeInJSON) {
          this.toJSON = this.toAssociativeJSON;
        }
      }
      this.associations = arr;
    },

    _getAssociation: function (type, name) {
      var i, l;
      if (!name) {
        name = type;
        type = 'name';
      }
      for (i = 0, l = this.associations.length; i < l; i++) {
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
      var i, l, association, foreignName, attributeName;
      for (i = 0, l = this.associations.length; i < l; i++) {
        association = this.associations[i];
        foreignName = association.foreignName;
        attributeName = association.attributeName;
        if (typeof attributes[attributeName] !== 'undefined') {
          if (typeof this[foreignName] !== 'undefined') {
            this._setAssociationAttributes(association, attributes[attributeName]);
          } else if (this.initialized !== false) {
            this._initAssociation(association, attributes[attributeName]);
          }
          //?? associationAttributes[associations[i].foreignName] = _.clone(attributes[associations[i].foreignName]);
          this.associationAttributes[foreignName] = attributes[attributeName];
          delete attributes[attributeName];
        }
      }
      return attributes;
    },

    initializeAssociations: function () {
      var i, l, association, foreignName;
      for (i = 0, l = this.associations.length; i < l; i++) {
        association = this.associations[i];
        foreignName = association.foreignName;
        // abort if init is false and no attributes set
        if (association.init === false && typeof this.associationAttributes[foreignName] === 'undefined') {
          if (association.type === 'belongsTo') {
            if (!this.get(this._getKey(association))) {
              continue;
            }
          } else {
              continue;
          }
        }
        this._initAssociation(association, this.associationAttributes[foreignName]);
      }
      this.associationAttributes = null;
    },

    changeBelongsTo: function (foreignName, attributes) {
      var model, Model, foreignKey, that;
      var association = this._getAssociation('foreignName', foreignName);

      if (!association) {
        return false;
      }
      // remove association
      if (_.isNull(attributes)) {
        this.save(this._getKey(association), null, {patch: true});
        delete this[foreignName];
        return true;
      }

      if (attributes instanceof Backbone.Model) {
        model = attributes;
      } else if (_.isNumber(attributes) && association.collection) {
        model = association.collection.get(attributes);
        if (!model) {
          model = association.collection.create({id: attributes});
        }
      } else if (_.isString(attributes) && /^c\d+/.test(attributes) && association.collection) {
        model = association.collection.get(attributes);
        if (!model) {
          model = association.collection.create();
        }
      } else {
        if (association.collection) {
          model = association.collection.create(attributes);
        } else {
          model = new association.Model(attributes);
        }
      }
      foreignKey = this._getForeignKey(association);
      if (this[foreignName]) {
        this[foreignName].off('change:' + foreignKey);
      }
      this[foreignName] = model;
      if (model.id) {
        this.save(this._getKey(association), model.id, {patch: true});
      } else {
        that = this;
        this[foreignName].on('change:' + foreignKey, function () { that._setParentIdToModel(association); });
      }
      return this[foreignName];
    },

    _initAssociation: function (association, attributes) {

      var foreignName = association.foreignName;
      var keyVal;
      var key = this._getKey(association);
      var foreignKey = this._getForeignKey(association);
      var that = this;
      var Model, Collection;
      var assocModel = false;

      switch (association.type) {

        case 'hasMany':
          this[foreignName] = new association.Collection(attributes);
          this[foreignName].fetch = function fetch(options) {
            // do not fetch when model is new
            if (that.isNew()) {
              return false;
            }
            options = options ? options : {};
            options.data = options.data ? options.data : {};
            options.data[foreignKey] = that.id;
            if (association.Collection.prototype.fetch !== Backbone.Collection.prototype.fetch) {
              return association.Collection.prototype.fetch.call(this, options);
            } else {
              return Backbone.Collection.prototype.fetch.call(this, options);
            }
          }
          if (_.isUndefined(attributes) && !this.isNew()) {
            this[foreignName].fetch();
          }
          break;

        case 'hasOne':
          // association attributes must be object to append keys on it
          attributes = !_.isUndefined(attributes) ? attributes : {};
          if (!this.isNew()) {
            //++ check if foreignKey is set and different from this.id
            attributes[foreignKey] = this.id;
          }
          var assocModel = new association.Model(attributes);
          if (!assocModel.isValid()) {
            return false;
          }
          this[foreignName] = assocModel;
          if (association.reverse) {
            this[foreignName][association.name] = this;
          }
          // fetch data from server when only id and foreignKey are set in attributes
          //++ improve check instead of length check
          if (!this[foreignName].isNew() && _.keys(attributes).length <= 2) {
            this[foreignName].fetch();
          }
          // save if new and foreignKey is set
          else if (this[foreignName].isNew()) {
            this[foreignName].save(this[foreignName].attributes, {
              success: function (model, resp) {
                if (!that.isNew()) {
                  that.save(foreignKey, that.id, {patch: true});
                } else {
                  that.on('change:' + that.idAttribute, function () {
                    this[foreignName].save(foreignKey, this.id, {patch: true});
                  });
                }
              },
              patch: true
			      });
          }
          break;

        case 'belongsTo':
          // association attributes must be object to append keys on it
          attributes = !_.isUndefined(attributes) ? attributes : {};
          // get key of model
          keyVal = this.get(key);
          // set key on association attributes
          if (keyVal) {
            // check if association foreignKey is already set and different from model key
            if (attributes[foreignKey] && attributes[foreignKey] !== keyVal) {
              throw new Error('association foreignKey will be overwritten');
            }
            attributes[foreignKey] = keyVal;
          }
          // get or create model from collection
          if (association.collection) {
            // get by id
            assocModel = association.collection.get(attributes[foreignKey]);
            // get by cid
            if (!assocModel && attributes.cid) {
              that = this;
              assocModel = association.collection.get(attributes.cid);
              if (assocModel) {
                assocModel.on('change:' + foreignKey, function () {
                  if (!that.isNew()) {
                    that.save(key, this.get(foreignKey), {patch: true});
                  } else {
                    that.on('change:' + that.idAttribute, function () {
                      that.save(key, assocModel.get(foreignKey), {patch: true});
                    });
                  }
                });
              }
              delete attributes.cid;
            }
            // create
            if (!assocModel) {
              that = this;
              assocModel = association.collection.create(attributes, {
                success: function (model, resp) {
                  //++ check if foreignKey is not already set on model
                  if (!that.isNew()) {
                    that.save(key, model.get(foreignKey), {patch: true});
                  } else {
                    that.on('change:' + that.idAttribute, function () {
                      that.save(key, model.get(foreignKey), {patch: true});
                    });
                  }
                },
                validate: true
              });
              // attributes won't validate model
              if (!assocModel) {
                return false;
              }
            }
          } else {
            assocModel = new association.Model(attributes);
            // attributes won't validate model
            if (!assocModel.isValid()) {
              return false;
            }
          }
          // set key if already in association attributes and not on model
          if (assocModel.id && keyVal !== assocModel.id) {
            this.set(key, assocModel.id);
          }
          // set association on model
          this[foreignName] = assocModel;
          // save or fetch association
          //++ improve check instead of length check
          if (!association.collection && _.keys(attributes).length <= 1) {
            if (assocModel.isNew()) {
              // set (on change) association id to model key
              assocModel.save(assocModel.attributes, {
                success: function (model, resp) {
                  if (!that.isNew()) {
                    that.save(key, model.get(foreignKey), {patch: true});
                  } else {
                    that.on('change:' + that.idAttribute, function () {
                      that.save(key, model.get(foreignKey), {patch: true});
                    });
                  }
                },
                patch: true
              });
            } else {
              assocModel.fetch();
            }
          }
          break;

        case 'hasAndBelongsToMany':
          this[foreignName] = new association.Collection(attributes);
          break;
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
          if (this[association.foreignName]) {
            attributes[association.foreignName] = this[association.foreignName].toJSON();
          }
        }
      }
      return attributes;
    },

    _setKeyToModel: function (association) {
      this[association.foreignName].save(this._getForeignKey(association), this.id, {patch: true});
    },

    _setParentIdToModel: function (association) {
      this.set(this._getKey(association), this[association.foreignName].id);
    },

    _getKey: function (association) {
      if (association.type === 'belongsTo' && association.key) {
        return association.key;
      }
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
    },

    destroy: function (options) {
      var i, l, association;
      for (i = 0, l = this.associations.length; i < l; i++) {
        association = this.associations[i];
        if (association.destroy === false) {
          continue;
        }
        if (association.type === 'hasOne') {
          if (this[association.foreignName]) {
            this[association.foreignName].destroy(options);
          }
        }
        if (association.type === 'belongsTo') {
          if (!association.collection && this[association.foreignName]) {
            this[association.foreignName].destroy(options);
          }
        }
        if (association.type === 'hasMany') {
          if (this[association.foreignName]) {
            while (this[association.foreignName].size()) {
              this[association.foreignName].at(0).destroy(options);
            }
          }
        }
      }
      Backbone.Model.prototype.destroy.call(this, options);
    }
  });

  // Set up inheritance for the model, collection, and view.
  Backbone.Assoc.Model.extend = Backbone.Model.extend;
}());
