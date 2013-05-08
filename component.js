var oop = require('iai-oop')
  , path = require('path')
  , util = require('util')
  , fs = require('fs')
  , core = {}
  , error = function(){
      throw new Error(  util.format.apply( {}, arguments )  );
    }
  , log = function(){
      if( process.env.NODE_ENV == 'test' ) {
        console.log();
        console.log.apply( {}, arguments );
      }
    }
;


// the name of the iai.json files
var INFO_FNAME = 'iai.json';

core.Component = new oop.Interface( 'Component', ['load'] );

/*
 * @prototype IaiComponent
 *   A chainable API that helps building and managing modular components.
 *   More info on the README file
 *   @constructor
 *     @param id (String)
 */

core.iaiComponent = oop.create(oop.Prototype, {
//  _loaded: [],
//  index: {},
  implement: [ core.Component ],
  /**
   * sets a property as data descriptor
   * meant for internal use
   */
  _def: function( name, value ){
    Object.defineProperty( this, name, { value: value } );
  },
  init: function( pathname ) {
    if( arguments.length != 1 ) {
      throw ArityError( 'expecting exacly 1 argument' );
    }
    if(typeof pathname !== 'string') {
      throw TypeError( 'expecting param 1 to be a string' );
    }

    this._def( 'id', path.resolve( pathname ) );

    // iai component info default values
    var i = require('./default-iai.json');

    // extend the defaults with component-defined values
    if( this.hasInfoFile() ) {
      var info = this.requireInfoFile();
      for( var k in info ){
        i[k] = info[k];
      }
    }

    // TODO validate the component info

    this._def( 'info', i );
    Object.defineProperty( this, '_loaded', { value: [], writable: true });
    
    // load dependencies
    for( var n in i.dependencies ){
      log( 'loading "%s" as <%s> dependency', n, this.info.name );
      this.load( n );
//      i.dependencies[n].forEach( dep.load, dep );
    }

    // set the global reference 
    var dotted = String(i.scope).split('.')
      , reference = global
    ;
    while( !!i.scope && dotted.length ){
      reference = reference[ dotted.shift() ];
      part = dotted.shift();
    }
    reference[this.info.name] = this;

//    this._def( 'info', info );

    // set the accessor for component on desired scope
    // if not defined on info, global is used
    
    //global[ info[name] ] = this;
//    console.log('component', info[name], 'globalized');
    log( 'component <%s> inited.', this.name );
  },
  /**
   * Tells whether this component has info file
   *   @returns bool
   */
  hasInfoFile: function(){
    try {
      this.requireInfoFile();
      return true;
    }
    catch(e) {
      // ensure to catch only module not found errors
      if( !~e.message.search(/cannot find module/i) ){
        throw e;
      }
      // component's iai.json file doesn't exist
      return false;
    }
  },
  /**
   * get the resolved path relative to this
   */
  pathTo: function( pathname ){
    return path.resolve( path.dirname( this.id ), pathname );
  },
  /**
   * get the iai.json file contents
   * throws an error if info file doesn't exist
   */
  requireInfoFile: function(){
    return require( this.pathTo( INFO_FNAME ) );
  },
  /**
   * load sub-component
   */
  load: function( cname ){
    // skip loading if mod is already loaded
    if( !!~this._loaded.indexOf( cname ) ) {
       return this;
    }
    log( 'component <%s> loading "%s"', this.info.name, cname );
    // check mod exists
    if( !this.info.index.hasOwnProperty(cname) ) {
      error( '"%s" not found on <%s> index', cname, this.info.name );
    }
    // require the desired component
    var mod
      , from = this.id;
    ;
    try {
      // first try a local require from the component's path
      mod = require(  this.pathTo( this.index[name] )  );
    } catch(e) {
      // if module not found, try requiring from main module
      if( !~e.message.search(/cannot find module/i) ) {
        throw e;
      }
      from = require.main.id;
      mod = require.main.require( this.index[name] )
    }
    log( '<%s> loaded <%s> from <%s> and it is%s an IaiComponent'
        , this.name, name, from, mod instanceof IaiComponent? '':"n't"
    );
    throw "WHAT TO DO NOW?";
    // store the full module if module is a component too
    if( mod instanceof IaiComponent ) {
      this[name] = mod;
    } else {
      // extend the current component elsecase
      for( var fname in mod ) {
        this[fname] = mod[fname];
      }
    }
    this._loaded.push( name );
    return this;
  }
});


/**
 * Helper functions
 * Component factory method 
 *
 */

module.exports = oop.factory( core.iaiComponent );
